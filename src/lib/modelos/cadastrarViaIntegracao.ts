/**
 * Cadastro de modelo via integração (WhatsApp/N8N).
 *
 * Reaproveita a MESMA regra da tela (esquemaCadastroModelo + cadastrarModelo):
 * sequencial gerado pelo sistema, transação e geração das variações. As únicas
 * diferenças são de ENTRADA, para casar com a conversa do bot:
 *  - coleção/fornecedor podem vir por NOME (resolvido para id) ou por id;
 *  - pedras podem vir por NOME ("Cristal") ou por código ("01");
 *  - a imagem é anexada DEPOIS (ver anexarImagem), então o modelo nasce sem ela.
 *
 * A validação de obrigatoriedade é a mesma da tela — se faltar campo, devolve 422
 * com mensagem legível para o bot perguntar o que falta.
 */

import type { Database } from "@/db/client";
import { criarColecao, listarColecoes } from "@/lib/colecoes/colecoes";
import { PEDRAS, tipoTemTamanho } from "@/lib/codigo/referencia";
import { criarFornecedor, listarFornecedores } from "@/lib/fornecedores/fornecedores";
import { cadastrarModelo, type ResultadoCadastroModelo } from "./cadastrarModelo";
import { esquemaCadastroModelo } from "./validarCadastro";

/** Erro de cadastro com status HTTP para a rota mapear (404/409/422). */
export class ErroCadastroIntegracao extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ErroCadastroIntegracao";
  }
}

export interface EntradaCadastroIntegracao {
  tipo?: unknown;
  descricao?: unknown;
  precoCusto?: unknown;
  precoVenda?: unknown;
  colecaoId?: string;
  colecao?: string;
  colecaoData?: string;
  fornecedorId?: string;
  fornecedor?: string;
  pedras?: unknown;
  tamanhos?: unknown;
}

const hojeISO = (): string => new Date().toISOString().slice(0, 10);

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

const PEDRA_POR_NOME = new Map(PEDRAS.map((p) => [normalizar(p.descricao), p.codigo]));
const CODIGOS_PEDRA = new Set(PEDRAS.map((p) => p.codigo));

/**
 * Converte pedras informadas (nome ou código) nos códigos canônicos.
 * @example resolverPedras(["Cristal", "10"]) // ["01", "10"]
 */
export function resolverPedras(entradas: readonly string[]): string[] {
  return entradas.map((bruto) => {
    const valor = String(bruto).trim();
    if (CODIGOS_PEDRA.has(valor)) return valor;
    const codigo = PEDRA_POR_NOME.get(normalizar(valor));
    if (!codigo) {
      const nomes = PEDRAS.map((p) => p.descricao).join(", ");
      throw new ErroCadastroIntegracao(`Pedra desconhecida: "${bruto}". Use uma de: ${nomes}.`, 422);
    }
    return codigo;
  });
}

async function resolverColecaoId(db: Database, e: EntradaCadastroIntegracao): Promise<string> {
  const lista = await listarColecoes(db);
  if (e.colecaoId) {
    const achada = lista.find((c) => c.id === e.colecaoId);
    if (!achada) throw new ErroCadastroIntegracao(`Coleção com id ${e.colecaoId} não existe.`, 404);
    return achada.id;
  }
  const nome = String(e.colecao ?? "").trim();
  if (!nome) throw new ErroCadastroIntegracao("Coleção é obrigatória.", 422);
  const achadas = lista.filter((c) => normalizar(c.nome) === normalizar(nome));
  if (achadas.length === 1) return achadas[0].id;
  if (achadas.length > 1)
    throw new ErroCadastroIntegracao(
      `Há ${achadas.length} coleções "${nome}" (datas diferentes). Especifique a data ou use o id.`,
      409,
    );
  // Não existe: cria com a data informada ou hoje (o operador já confirmou o cadastro).
  const data =
    typeof e.colecaoData === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.colecaoData)
      ? e.colecaoData
      : hojeISO();
  const nova = await criarColecao(db, { nome, data });
  return nova.id;
}

async function resolverFornecedorId(db: Database, e: EntradaCadastroIntegracao): Promise<string> {
  const lista = await listarFornecedores(db);
  if (e.fornecedorId) {
    const achado = lista.find((f) => f.id === e.fornecedorId);
    if (!achado) throw new ErroCadastroIntegracao(`Fornecedor com id ${e.fornecedorId} não existe.`, 404);
    return achado.id;
  }
  const nome = String(e.fornecedor ?? "").trim();
  if (!nome) throw new ErroCadastroIntegracao("Fornecedor é obrigatório.", 422);
  const achado = lista.find((f) => normalizar(f.nome) === normalizar(nome));
  if (achado) return achado.id;
  // Não existe: cria (o operador já confirmou o cadastro com esse fornecedor).
  const novo = await criarFornecedor(db, { nome });
  return novo.id;
}

const paraLista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export async function cadastrarViaIntegracao(
  db: Database,
  entrada: EntradaCadastroIntegracao,
): Promise<ResultadoCadastroModelo> {
  const colecaoId = await resolverColecaoId(db, entrada);
  const fornecedorId = await resolverFornecedorId(db, entrada);
  const pedras = resolverPedras(paraLista(entrada.pedras));

  const validado = esquemaCadastroModelo.safeParse({
    tipo: entrada.tipo,
    descricao: entrada.descricao,
    precoCusto: entrada.precoCusto,
    precoVenda: entrada.precoVenda,
    colecaoId,
    fornecedorId,
    pedras,
    tamanhos: paraLista(entrada.tamanhos),
  });
  if (!validado.success) {
    throw new ErroCadastroIntegracao(validado.error.issues.map((i) => i.message).join(" "), 422);
  }

  // Mesma exigência da tela: tipo com tamanho precisa de ao menos um tamanho.
  if (tipoTemTamanho(validado.data.tipo) && validado.data.tamanhos.length === 0) {
    throw new ErroCadastroIntegracao("Selecione ao menos um tamanho para este tipo.", 422);
  }

  return cadastrarModelo(db, {
    tipo: validado.data.tipo,
    descricao: validado.data.descricao,
    precoCusto: validado.data.precoCusto,
    precoVenda: validado.data.precoVenda,
    imagemPath: null, // imagem é anexada na etapa 2 (anexarImagem)
    colecaoId: validado.data.colecaoId,
    fornecedorId: validado.data.fornecedorId,
    pedras: validado.data.pedras,
    tamanhos: validado.data.tamanhos,
  });
}
