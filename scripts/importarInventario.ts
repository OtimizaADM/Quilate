/**
 * Importação do inventário inicial (planilha legada) — seção 9 da spec.
 *
 * Lê o CSV da contagem de estoque (separador ';', seções por tipo) e reconstrói
 * os SKUs do Quilate: código antigo (tipo+seq, ou tipo+seq+pedra) + pedra (da
 * descrição quando faltar) + tamanho (da grade "tam:qtd"). Cria modelo +
 * variações + ENTRADA (origem 'importacao') com a quantidade contada. Coleção e
 * fornecedor ficam NULL (estoque legado — modelo híbrido permite).
 *
 * Uso (no container do app):
 *   npx tsx scripts/importarInventario.ts <arquivo.csv>            # PRÉVIA (não grava)
 *   npx tsx scripts/importarInventario.ts <arquivo.csv> --commit   # grava no banco
 *
 * Premissa: "Valor Unit." = preço de VENDA; custo fica nulo (preencher depois).
 * Linhas inconsistentes (Pendente DE/PARA, código ambíguo, pedra/tamanho inválidos)
 * NÃO são gravadas — saem no relatório "REVISAR" para correção manual.
 */

import { readFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { PEDRAS, type TipoCodigo } from "@/lib/codigo/referencia";
import { modelos, movimentacoes, variacoes } from "@/db/schema";

/**
 * Monta o código do SKU SEM validar o tamanho (dados legados podem ter tamanhos
 * fora da lista padrão, ex.: anel 17, pulseira 16 — reais na contagem física).
 * Formato canônico: tipo(1) + seq(5) + pedra(2) [+ tamanho(2)].
 */
function montarSkuLegado(tipo: TipoCodigo, seq: string, pedra: string, tamanho: string | null): string {
  return `${tipo}${seq}${pedra}${tamanho ?? ""}`;
}

interface SkuPlano {
  pedra: string;
  tamanho: string | null;
  quantidade: number;
}

interface ModeloPlano {
  tipo: TipoCodigo;
  sequencial: string;
  descricao: string;
  precoVenda: string;
  skus: SkuPlano[];
}

interface Revisao {
  secao: string;
  codigo: string;
  descricao: string;
  motivo: string;
}

const CODIGOS_PEDRA = new Set(PEDRAS.map((p) => p.codigo));

function detectarSecao(celula: string): { tipo: TipoCodigo; temGrade: boolean } | null {
  const s = celula.toUpperCase();
  if (s.includes("SUBTOTAL")) return null;
  if (s.includes("BRINCO")) return { tipo: 2, temGrade: false };
  if (s.includes("PULSEIRA")) return { tipo: 5, temGrade: true };
  if (s.includes("CORD")) return { tipo: 3, temGrade: true }; // CORDÕES
  if (s.includes("PINGENTE")) return { tipo: 4, temGrade: false };
  if (s.startsWith("AN")) return { tipo: 1, temGrade: true }; // ANÉIS
  return null;
}

/** Pedra pela descrição quando o código não traz (cor citada tem prioridade). */
function inferirPedra(descricao: string): string {
  const d = descricao.toLowerCase();
  if (d.includes("arco") || d.includes("colorid")) return "12";
  if (d.includes("verde")) return "05";
  if (d.includes("azul") || d.includes("azui")) return "10";
  if (d.includes("zirc") || d.includes("cristal") || d.includes("cravejad") || d.includes("ponto de luz"))
    return "01";
  return "00"; // sem pedra (lisa/dourada/texturizada)
}

/** Extrai seq (e pedra, se presente) do código antigo. tipo = 1º dígito. */
function parseCodigoLegado(
  codigo: string,
  tipoSecao: TipoCodigo,
): { seq: string; pedra: string | null } | { erro: string } {
  const c = codigo.replace(/\D/g, "");
  if (Number(c[0]) !== tipoSecao) return { erro: `código não começa com o tipo ${tipoSecao}` };
  const resto = c.slice(1);
  if (resto.length === 5) return { seq: resto, pedra: null };
  if (resto.length === 7) return { seq: resto.slice(0, 5), pedra: resto.slice(5) };
  return { erro: `código com nº de dígitos inesperado (${c.length})` };
}

/** "16:4,18:2" -> [{tamanho:"16",qtd:4},...]; "—"/vazio -> []. */
function parseGrade(grade: string): { tamanho: string; quantidade: number }[] {
  const g = grade.trim();
  if (!g || g === "—" || g === "-") return [];
  const pares: { tamanho: string; quantidade: number }[] = [];
  for (const parte of g.split(",")) {
    const [tam, qtd] = parte.split(":").map((x) => x.trim());
    if (/^\d{1,2}$/.test(tam) && /^\d+$/.test(qtd)) {
      pares.push({ tamanho: tam.padStart(2, "0"), quantidade: Number(qtd) });
    }
  }
  return pares;
}

const parseValor = (s: string): string => s.trim().replace(/\./g, "").replace(",", ".");

function processar(linhas: string[]): { oks: ModeloPlano[]; revisar: Revisao[] } {
  const oks: ModeloPlano[] = [];
  const revisar: Revisao[] = [];
  let secao: { tipo: TipoCodigo; temGrade: boolean } | null = null;
  let nomeSecao = "";

  for (const linha of linhas) {
    const cols = linha.split(";").map((c) => c.trim());
    const c0 = cols[0] ?? "";
    if (!c0) continue;

    const det = detectarSecao(c0);
    if (det) {
      secao = det;
      nomeSecao = c0;
      continue;
    }
    if (!/^\d+$/.test(c0) || !secao) continue; // pula cabeçalho/subtotal/lixo

    const codigo = c0;
    const descricao = cols[1] ?? "";
    const flag = (motivo: string) => revisar.push({ secao: nomeSecao, codigo, descricao, motivo });

    if (/pendente|de\/para|de\s*\/\s*para/i.test(descricao)) {
      flag("anel pendente de DE/PARA");
      continue;
    }

    const grade = secao.temGrade ? cols[2] ?? "" : "";
    const valorUnit = secao.temGrade ? cols[4] ?? "" : cols[3] ?? "";
    const qtdSimples = Number((secao.temGrade ? "" : cols[2] ?? "0").replace(/\D/g, "")) || 0;

    const parsed = parseCodigoLegado(codigo, secao.tipo);
    if ("erro" in parsed) {
      flag(parsed.erro);
      continue;
    }
    const pedra = parsed.pedra ?? inferirPedra(descricao);
    if (!CODIGOS_PEDRA.has(pedra)) {
      flag(`pedra inválida (${pedra})`);
      continue;
    }

    let skus: SkuPlano[];
    if (secao.temGrade) {
      const pares = parseGrade(grade);
      if (pares.length === 0) {
        flag(`grade vazia/sem tamanho ("${grade}")`);
        continue;
      }
      skus = pares.map((p) => ({ pedra, tamanho: p.tamanho, quantidade: p.quantidade }));
    } else {
      skus = [{ pedra, tamanho: null, quantidade: qtdSimples }];
    }

    oks.push({ tipo: secao.tipo, sequencial: parsed.seq, descricao, precoVenda: parseValor(valorUnit), skus });
  }
  return { oks, revisar };
}

function resumo(oks: ModeloPlano[]): void {
  const porTipo = new Map<number, { modelos: number; skus: number; unidades: number }>();
  for (const m of oks) {
    const r = porTipo.get(m.tipo) ?? { modelos: 0, skus: 0, unidades: 0 };
    r.modelos += 1;
    r.skus += m.skus.length;
    r.unidades += m.skus.reduce((s, k) => s + k.quantidade, 0);
    porTipo.set(m.tipo, r);
  }
  const nomes: Record<number, string> = { 1: "Anéis", 2: "Brincos", 3: "Cordões", 4: "Pingentes", 5: "Pulseiras" };
  console.log("\n=== PRÉVIA (a importar) ===");
  for (const [tipo, r] of [...porTipo.entries()].sort()) {
    console.log(`  ${nomes[tipo]}: ${r.modelos} modelos · ${r.skus} SKUs · ${r.unidades} unidades`);
  }
  const tot = oks.reduce((a, m) => a + m.skus.reduce((s, k) => s + k.quantidade, 0), 0);
  console.log(`  TOTAL: ${oks.length} modelos · ${tot} unidades`);
}

async function gravar(oks: ModeloPlano[]): Promise<void> {
  let modelosCriados = 0;
  let skusCriados = 0;
  let jaExistiam = 0;
  for (const m of oks) {
    // Idempotente: se o (tipo, sequencial) já existe, pula (permite reimportar).
    const existente = await db
      .select({ id: modelos.id })
      .from(modelos)
      .where(and(eq(modelos.tipo, m.tipo), eq(modelos.sequencial, m.sequencial)))
      .limit(1);
    if (existente.length > 0) {
      jaExistiam += 1;
      continue;
    }
    await db.transaction(async (tx) => {
      const [modelo] = await tx
        .insert(modelos)
        .values({
          tipo: m.tipo,
          sequencial: m.sequencial,
          descricao: m.descricao,
          precoCusto: null,
          precoVenda: m.precoVenda,
          imagemPath: null,
          colecaoId: null,
          fornecedorId: null,
        })
        .returning({ id: modelos.id });

      for (const sku of m.skus) {
        const codigo = montarSkuLegado(m.tipo, m.sequencial, sku.pedra, sku.tamanho);
        const [v] = await tx
          .insert(variacoes)
          .values({ modeloId: modelo.id, pedra: sku.pedra, tamanho: sku.tamanho, codigo })
          .returning({ id: variacoes.id });
        if (sku.quantidade > 0) {
          await tx
            .insert(movimentacoes)
            .values({ variacaoId: v.id, tipoMov: "entrada", quantidade: sku.quantidade, origem: "importacao" });
        }
        skusCriados += 1;
      }
      modelosCriados += 1;
    });
  }
  console.log(
    `\n✅ Gravado: ${modelosCriados} modelos · ${skusCriados} SKUs (com entrada de estoque).` +
      (jaExistiam > 0 ? ` (${jaExistiam} já existiam — pulados.)` : ""),
  );
}

async function main(): Promise<void> {
  const arquivo = process.argv[2];
  const commit = process.argv.includes("--commit");
  if (!arquivo) {
    console.error("Uso: npx tsx scripts/importarInventario.ts <arquivo.csv> [--commit]");
    process.exit(1);
  }

  const conteudo = readFileSync(arquivo, "utf8").replace(/^﻿/, "");
  const linhas = conteudo.split(/\r?\n/);
  const { oks, revisar } = processar(linhas);

  resumo(oks);

  if (revisar.length > 0) {
    console.log(`\n=== REVISAR (${revisar.length} linhas NÃO importadas) ===`);
    for (const r of revisar) console.log(`  [${r.secao}] ${r.codigo} — ${r.descricao} → ${r.motivo}`);
  }

  if (!commit) {
    console.log("\n(prévia — nada foi gravado. Rode com --commit para gravar.)");
    return;
  }
  await gravar(oks);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Erro na importação:", e);
    process.exit(1);
  });
