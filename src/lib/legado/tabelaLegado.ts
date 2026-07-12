/** Parser da tabela legada de SKUs, sem acesso ao banco. */

import { parseCodigo } from "@/lib/codigo/codigo";
import type { TipoCodigo } from "@/lib/codigo/referencia";

const TIPO_POR_CATEGORIA: Readonly<Record<string, TipoCodigo>> = {
  ANEL: 1,
  BRINCO: 2,
  COLAR: 3,
  PINGENTE: 4,
  PULSEIRA: 5,
  TORNOZELEIRA: 6,
};

const TIPOS_SEM_TAMANHO = new Set<TipoCodigo>([2, 4]);

interface CorrecaoConhecida {
  tamanho?: string;
  pedra?: string;
  motivo: string;
}

const CORRECOES_CONHECIDAS: Readonly<Record<string, CorrecaoConhecida>> = {
  "1000492101": {
    tamanho: "22",
    motivo: "SKU legado marcava tamanho 21; coluna e descrição informam tamanho 22.",
  },
  "2001180001": {
    pedra: "01",
    motivo: "Coluna de pedra estava inválida; SKU e descrição informam Cristal (01).",
  },
};

export interface SkuTabelaLegado {
  linha: number;
  codigoLegado: string;
  codigo: string;
  pedra: string;
  tamanho: string | null;
}

export interface ModeloTabelaLegado {
  tipo: TipoCodigo;
  sequencial: string;
  descricao: string;
  skus: SkuTabelaLegado[];
}

export interface CorrecaoTabelaLegado {
  linha: number;
  codigoLegado: string;
  codigo: string;
  motivo: string;
}

export interface PlanoTabelaLegado {
  totalLinhas: number;
  modelos: ModeloTabelaLegado[];
  correcoes: CorrecaoTabelaLegado[];
}

export class ErroTabelaLegado extends Error {
  constructor(readonly detalhes: string[]) {
    super(`Tabela legada inválida: ${detalhes.length} erro(s).`);
    this.name = "ErroTabelaLegado";
  }
}

function descricaoDoModelo(descricao: string, tamanho: string | null): string {
  if (tamanho === null) return descricao.trim();
  const tamanhoEscapado = tamanho.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return descricao
    .replace(new RegExp(`\\s+TAM\\s*:\\s*${tamanhoEscapado}\\s*$`, "i"), "")
    .replace(new RegExp(`\\s+${tamanhoEscapado}\\s*cm\\s*$`, "i"), "")
    .trim();
}

function pedraDaColuna(valor: string): string | null {
  const match = valor.trim().match(/^(\d{2})(?:\.|$)/);
  return match?.[1] ?? null;
}

export function parseTabelaLegado(conteudo: string): PlanoTabelaLegado {
  const linhas = conteudo.replace(/^\uFEFF/, "").split(/\r?\n/);
  const cabecalho = (linhas[0] ?? "").split("\t").map((coluna) => coluna.trim().toUpperCase());
  if (
    cabecalho[0] !== "SKU" ||
    cabecalho[1] !== "CATEGORIA" ||
    cabecalho[2] !== "TAMANHO" ||
    cabecalho[3] !== "COR DE PEDRA" ||
    cabecalho[4] !== "DESCRIÇÃO"
  ) {
    throw new ErroTabelaLegado([
      "Cabeçalho esperado: SKU, CATEGORIA, TAMANHO, COR DE PEDRA e DESCRIÇÃO.",
    ]);
  }

  const erros: string[] = [];
  const correcoes: CorrecaoTabelaLegado[] = [];
  const modelos = new Map<string, ModeloTabelaLegado>();
  const codigosLegados = new Set<string>();
  const codigosConvertidos = new Set<string>();
  let totalLinhas = 0;

  for (let indice = 1; indice < linhas.length; indice += 1) {
    const numeroLinha = indice + 1;
    const linha = linhas[indice];
    if (!linha.trim()) continue;
    totalLinhas += 1;

    const colunas = linha.split("\t");
    const codigoLegado = (colunas[0] ?? "").trim();
    const categoria = (colunas[1] ?? "").trim().toUpperCase();
    const tamanhoBruto = (colunas[2] ?? "").trim();
    const corPedra = (colunas[3] ?? "").trim();
    const descricao = colunas.slice(4).join("\t").trim();
    const correcao = CORRECOES_CONHECIDAS[codigoLegado];

    if (!/^\d{10}$/.test(codigoLegado)) {
      erros.push(`Linha ${numeroLinha}: SKU legado deve ter 10 dígitos (${codigoLegado || "vazio"}).`);
      continue;
    }
    if (codigosLegados.has(codigoLegado)) {
      erros.push(`Linha ${numeroLinha}: SKU legado duplicado (${codigoLegado}).`);
      continue;
    }
    codigosLegados.add(codigoLegado);

    const tipo = TIPO_POR_CATEGORIA[categoria];
    if (!tipo || Number(codigoLegado[0]) !== tipo) {
      erros.push(`Linha ${numeroLinha}: categoria ${categoria || "vazia"} diverge do SKU ${codigoLegado}.`);
      continue;
    }
    if (!/^\d{1,2}$/.test(tamanhoBruto)) {
      erros.push(`Linha ${numeroLinha}: tamanho inválido (${tamanhoBruto || "vazio"}).`);
      continue;
    }
    if (!descricao) {
      erros.push(`Linha ${numeroLinha}: descrição vazia.`);
      continue;
    }

    const tamanhoColuna = tamanhoBruto.padStart(2, "0");
    const tamanho = correcao?.tamanho ?? tamanhoColuna;
    const pedraColuna = pedraDaColuna(corPedra);
    const pedra = correcao?.pedra ?? pedraColuna;
    if (!pedra) {
      erros.push(`Linha ${numeroLinha}: cor de pedra inválida (${corPedra || "vazia"}).`);
      continue;
    }

    const tamanhoNoSku = codigoLegado.slice(6, 8);
    const pedraNoSku = codigoLegado.slice(8, 10);
    if (tamanhoNoSku !== tamanho && !correcao?.tamanho) {
      erros.push(
        `Linha ${numeroLinha}: tamanho ${tamanho} diverge do bloco ${tamanhoNoSku} no SKU ${codigoLegado}.`,
      );
      continue;
    }
    if (pedraNoSku !== pedra && !correcao?.pedra) {
      erros.push(
        `Linha ${numeroLinha}: pedra ${pedra} diverge do bloco ${pedraNoSku} no SKU ${codigoLegado}.`,
      );
      continue;
    }

    const sequencial = codigoLegado.slice(1, 6);
    const semTamanho = TIPOS_SEM_TAMANHO.has(tipo);
    if (semTamanho && tamanho !== "00") {
      erros.push(`Linha ${numeroLinha}: ${categoria} deve ter tamanho 0 no legado.`);
      continue;
    }
    const codigo = `${tipo}${sequencial}${pedra}${semTamanho ? "" : tamanho}`;
    try {
      parseCodigo(codigo);
    } catch (erro) {
      erros.push(`Linha ${numeroLinha}: ${erro instanceof Error ? erro.message : String(erro)}`);
      continue;
    }
    if (codigosConvertidos.has(codigo)) {
      erros.push(`Linha ${numeroLinha}: conversão gera SKU duplicado (${codigo}).`);
      continue;
    }
    codigosConvertidos.add(codigo);

    const chaveModelo = `${tipo}:${sequencial}`;
    const modelo = modelos.get(chaveModelo) ?? {
      tipo,
      sequencial,
      descricao: descricaoDoModelo(descricao, semTamanho ? null : tamanho),
      skus: [],
    };
    modelo.skus.push({
      linha: numeroLinha,
      codigoLegado,
      codigo,
      pedra,
      tamanho: semTamanho ? null : tamanho,
    });
    modelos.set(chaveModelo, modelo);

    if (correcao) {
      correcoes.push({ linha: numeroLinha, codigoLegado, codigo, motivo: correcao.motivo });
    }
  }

  if (erros.length > 0) throw new ErroTabelaLegado(erros);
  if (totalLinhas === 0) throw new ErroTabelaLegado(["A tabela não contém produtos."]);

  return {
    totalLinhas,
    modelos: [...modelos.values()].sort(
      (a, b) => a.tipo - b.tipo || a.sequencial.localeCompare(b.sequencial),
    ),
    correcoes,
  };
}
