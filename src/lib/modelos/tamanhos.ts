/**
 * Normalização do campo "Outro tamanho" do cadastro.
 *
 * O tamanho ocupa 2 dígitos no código; valores de 1 dígito são preenchidos com
 * zero à esquerda. Aceita vários valores separados por vírgula ("26, 28").
 */

/** "26, 28" → ["26","28"]. Lança citando o valor inválido. */
export function parseOutrosTamanhos(texto: string): string[] {
  const valores = texto
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  return valores.map((valor) => {
    if (!/^\d{1,2}$/.test(valor)) {
      throw new Error(`Tamanho inválido: "${valor}". Use 1 ou 2 dígitos (ex.: "26").`);
    }
    return valor.padStart(2, "0");
  });
}

/** Une tamanhos marcados e digitados, deduplicando e preservando a ordem. */
export function combinarTamanhos(
  marcados: readonly string[],
  outros: readonly string[],
): string[] {
  return [...new Set([...marcados, ...outros])];
}
