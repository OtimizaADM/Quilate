/**
 * Dados de referência do código de produto (seção 3 da especificação).
 *
 * Esta é a fonte da verdade em código: tanto a lib de montagem/parsing do
 * código quanto o seed do banco (src/db/seed.ts) consomem estas constantes,
 * evitando divergência entre a aplicação e as tabelas de referência.
 */

export type TipoCodigo = 1 | 2 | 3 | 4 | 5 | 6;

export interface Tipo {
  codigo: TipoCodigo;
  descricao: string;
  /** Brinco e Pingente não têm tamanho — geram código de 8 dígitos. */
  temTamanho: boolean;
}

export interface Pedra {
  codigo: string; // '00'..'17'
  descricao: string;
}

export const TIPOS: readonly Tipo[] = [
  { codigo: 1, descricao: "Anel", temTamanho: true },
  { codigo: 2, descricao: "Brinco", temTamanho: false },
  { codigo: 3, descricao: "Colar", temTamanho: true },
  { codigo: 4, descricao: "Pingente", temTamanho: false },
  { codigo: 5, descricao: "Pulseira", temTamanho: true },
  { codigo: 6, descricao: "Tornozeleira", temTamanho: true },
] as const;

export const PEDRAS: readonly Pedra[] = [
  { codigo: "00", descricao: "Sem Pedra" },
  { codigo: "01", descricao: "Cristal" },
  { codigo: "02", descricao: "Amarelo" },
  { codigo: "03", descricao: "Champanhe" },
  { codigo: "04", descricao: "Laranja" },
  { codigo: "05", descricao: "Verde" },
  { codigo: "06", descricao: "Vermelho" },
  { codigo: "07", descricao: "Lavanda" },
  { codigo: "08", descricao: "Violeta" },
  { codigo: "09", descricao: "Rosa" },
  { codigo: "10", descricao: "Azul" },
  { codigo: "11", descricao: "Preto" },
  { codigo: "12", descricao: "Colorido" },
  { codigo: "13", descricao: "Outros" },
  { codigo: "14", descricao: "Pérola" },
  { codigo: "15", descricao: "Cristal+Pérola" },
  { codigo: "16", descricao: "Resina" },
  { codigo: "17", descricao: "Conhaque" },
] as const;

/** Tamanhos válidos (cm) por tipo. Tipos sem tamanho não aparecem aqui. */
export const TAMANHOS_VALIDOS: Readonly<Record<TipoCodigo, readonly string[]>> = {
  1: ["14", "16", "18", "20", "22", "24", "26", "28", "30", "32"],
  2: [],
  3: ["35", "40", "45", "50", "60", "70"],
  4: [],
  5: ["12", "14", "15", "18", "19", "20", "21", "22"],
  6: ["23", "25"],
} as const;

const TIPOS_POR_CODIGO = new Map<number, Tipo>(TIPOS.map((t) => [t.codigo, t]));
const PEDRAS_POR_CODIGO = new Map<string, Pedra>(PEDRAS.map((p) => [p.codigo, p]));

export function buscarTipo(codigo: number): Tipo | undefined {
  return TIPOS_POR_CODIGO.get(codigo);
}

export function buscarPedra(codigo: string): Pedra | undefined {
  return PEDRAS_POR_CODIGO.get(codigo);
}

export function tipoTemTamanho(tipo: TipoCodigo): boolean {
  return TAMANHOS_VALIDOS[tipo].length > 0;
}

export function tamanhoValido(tipo: TipoCodigo, tamanho: string): boolean {
  return TAMANHOS_VALIDOS[tipo].includes(tamanho);
}
