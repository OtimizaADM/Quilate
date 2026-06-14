/**
 * Matching tolerante a ACENTO para busca de produto por código ou descrição.
 *
 * Usado na busca de variações (tela 7.2 / bot), no catálogo (7.3) e na tela de
 * Produtos. Centraliza a regra para não duplicar: "zirconia" casa "Zircônia",
 * "100123" casa o código, "anel zirconia" casa anéis com zircônia.
 */

/** minúsculas + sem acento, para comparação tolerante. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export interface AlvoBusca {
  codigo: string;
  descricao: string | null;
}

/**
 * Casa um termo livre contra o código (por dígitos, >=3) ou a descrição (por
 * palavras, >2 letras), tolerante a acento. Termo vazio casa tudo (sem filtro).
 * @example corresponde("anel zirconia", { codigo: "1001230618", descricao: "Anel Zircônia" }) // true
 */
export function corresponde(termo: string, alvo: AlvoBusca): boolean {
  const termoNorm = normalizar(termo.trim());
  if (!termoNorm) return true;

  const soDigitos = termo.replace(/\D/g, "");
  if (soDigitos.length >= 3 && alvo.codigo.includes(soDigitos)) return true;

  const desc = normalizar(alvo.descricao ?? "");
  const palavras = termoNorm.split(/\W+/).filter((p) => p.length > 2);
  if (palavras.length === 0) return desc.includes(termoNorm);
  return palavras.every((p) => desc.includes(p));
}
