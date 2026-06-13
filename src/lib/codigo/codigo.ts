/**
 * Montagem, parsing e decodificação do código de produto (seções 3 e 7.3).
 *
 * Estrutura canônica: [tipo:1][sequencial:5][pedra:2][tamanho:2]
 * - Brinco (2) e Pingente (4): 8 dígitos (sem tamanho).
 * - Demais tipos: 10 dígitos.
 * O primeiro dígito (tipo) determina se há tamanho a ler.
 */

import {
  buscarPedra,
  buscarTipo,
  tamanhoValido,
  tipoTemTamanho,
  type TipoCodigo,
} from "./referencia";

const TAMANHO_SEQUENCIAL = 5;
const SEQUENCIAL_MAXIMO = 99999;

export interface PartesCodigo {
  tipo: TipoCodigo;
  sequencial: string; // 5 dígitos
  pedra: string; // 2 dígitos
  tamanho: string | null; // 2 dígitos, ou null para brinco/pingente
}

/** Formata um número de sequencial para 5 dígitos com zero à esquerda. */
export function formatarSequencial(numero: number): string {
  if (!Number.isInteger(numero) || numero < 1 || numero > SEQUENCIAL_MAXIMO) {
    throw new Error(
      `Sequencial inválido: ${numero}. Esperado inteiro entre 1 e ${SEQUENCIAL_MAXIMO}.`,
    );
  }
  return String(numero).padStart(TAMANHO_SEQUENCIAL, "0");
}

/**
 * Próximo sequencial disponível para um tipo (regra da seção 5).
 * @param maiorSequencialAtual maior sequencial já usado no tipo, ou null se nenhum.
 * @example proximoSequencial(null) // "00001"
 * @example proximoSequencial(122)  // "00123"
 */
export function proximoSequencial(maiorSequencialAtual: number | null): string {
  const proximo = (maiorSequencialAtual ?? 0) + 1;
  return formatarSequencial(proximo);
}

/**
 * Código base do produto (modelo): apenas tipo + sequencial, sem pedra/tamanho.
 * Útil para exibir o "código do produto" antes das variações.
 * @example montarCodigoBase(1, "00123") // "100123"
 */
export function montarCodigoBase(tipo: TipoCodigo, sequencial: string): string {
  if (!buscarTipo(tipo)) {
    throw new Error(`Tipo inválido: ${tipo}. Esperado um de 1..6.`);
  }
  if (!/^\d{5}$/.test(sequencial)) {
    throw new Error(`Sequencial inválido: "${sequencial}". Esperado 5 dígitos.`);
  }
  return `${tipo}${sequencial}`;
}

/**
 * Monta o código de um SKU a partir das partes. Valida tipo, pedra e tamanho.
 * Para brinco/pingente, `tamanho` deve ser null (e é ignorado se passado null).
 * @example montarCodigo({ tipo: 1, sequencial: "00123", pedra: "06", tamanho: "18" }) // "1001230618"
 */
export function montarCodigo(partes: PartesCodigo): string {
  const { tipo, sequencial, pedra, tamanho } = partes;

  if (!buscarTipo(tipo)) {
    throw new Error(`Tipo inválido: ${tipo}. Esperado um de 1..6.`);
  }
  if (!/^\d{5}$/.test(sequencial)) {
    throw new Error(`Sequencial inválido: "${sequencial}". Esperado 5 dígitos.`);
  }
  if (!buscarPedra(pedra)) {
    throw new Error(`Pedra inválida: "${pedra}". Esperado código '00'..'15'.`);
  }

  if (!tipoTemTamanho(tipo)) {
    if (tamanho !== null) {
      throw new Error(
        `Tipo ${tipo} não tem tamanho, mas recebeu "${tamanho}". Esperado null.`,
      );
    }
    return `${tipo}${sequencial}${pedra}`;
  }

  if (tamanho === null || !tamanhoValido(tipo, tamanho)) {
    throw new Error(
      `Tamanho inválido para o tipo ${tipo}: "${tamanho}". Esperado um dos tamanhos válidos do tipo.`,
    );
  }
  return `${tipo}${sequencial}${pedra}${tamanho}`;
}

/**
 * Faz o parsing de um código canônico em suas partes.
 * Usa o primeiro dígito (tipo) para decidir o comprimento esperado.
 * @example parseCodigo("1001230618") // { tipo: 1, sequencial: "00123", pedra: "06", tamanho: "18" }
 */
export function parseCodigo(codigo: string, leniente = false): PartesCodigo {
  if (!/^\d+$/.test(codigo)) {
    throw new Error(`Código inválido: "${codigo}". Esperado apenas dígitos.`);
  }

  const tipoNumero = Number(codigo[0]);
  const tipo = buscarTipo(tipoNumero);
  if (!tipo) {
    throw new Error(`Tipo inválido no código "${codigo}": dígito inicial ${tipoNumero}.`);
  }

  const comprimentoEsperado = tipo.temTamanho ? 10 : 8;
  if (codigo.length !== comprimentoEsperado) {
    throw new Error(
      `Código "${codigo}" tem ${codigo.length} dígitos; tipo ${tipoNumero} (${tipo.descricao}) exige ${comprimentoEsperado}.`,
    );
  }

  const sequencial = codigo.slice(1, 6);
  const pedra = codigo.slice(6, 8);
  // `leniente`: usado só na DECODIFICAÇÃO para exibição. Dados legados (importados
  // da planilha) podem ter pedra/tamanho fora da tabela de referência — exibir não
  // deve quebrar. A validação rígida segue valendo no cadastro (leniente=false).
  if (!leniente && !buscarPedra(pedra)) {
    throw new Error(`Pedra inválida no código "${codigo}": "${pedra}".`);
  }

  if (!tipo.temTamanho) {
    return { tipo: tipoNumero as TipoCodigo, sequencial, pedra, tamanho: null };
  }

  const tamanho = codigo.slice(8, 10);
  if (!leniente && !tamanhoValido(tipoNumero as TipoCodigo, tamanho)) {
    throw new Error(`Tamanho inválido no código "${codigo}": "${tamanho}".`);
  }
  return { tipo: tipoNumero as TipoCodigo, sequencial, pedra, tamanho };
}

/**
 * Decodifica um código em texto legível para o catálogo (seção 7.3).
 * @example decodificarLegivel("1001230618") // "Anel · modelo 00123 · pedra Vermelho · tam. 18cm"
 */
export function decodificarLegivel(codigo: string): string {
  // Leniente: dado legado pode ter pedra/tamanho fora da tabela; exibir não pode quebrar.
  const { tipo, sequencial, pedra, tamanho } = parseCodigo(codigo, true);
  const partes = [
    buscarTipo(tipo)?.descricao ?? `Tipo ${tipo}`,
    `modelo ${sequencial}`,
    `pedra ${buscarPedra(pedra)?.descricao ?? pedra}`,
  ];
  if (tamanho !== null) {
    partes.push(`tam. ${tamanho}cm`);
  }
  return partes.join(" · ");
}
