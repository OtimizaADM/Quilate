/**
 * Utilitários para interpretar erros do PostgreSQL (via node-postgres).
 * O código de erro é mais confiável que o texto da mensagem.
 */

const CODIGO_VIOLACAO_UNICA = "23505";

interface ErroPostgres {
  code?: string;
  constraint?: string;
  cause?: unknown;
}

/**
 * O Drizzle embrulha o erro do pg num wrapper; o `code`/`constraint` ficam em
 * `cause`. Esta função percorre a cadeia de causes até achar o erro do pg.
 */
function erroPostgres(erro: unknown): ErroPostgres | null {
  let atual: unknown = erro;
  for (let i = 0; i < 5 && atual; i += 1) {
    const e = atual as ErroPostgres;
    if (typeof e.code === "string") return e;
    atual = e.cause;
  }
  return null;
}

/**
 * Se o erro for violação de UNIQUE, retorna o nome da constraint (ou ""); senão, null.
 * @example violacaoUnica(erro) === "colecoes_nome_data"
 */
export function violacaoUnica(erro: unknown): string | null {
  const pg = erroPostgres(erro);
  if (pg?.code !== CODIGO_VIOLACAO_UNICA) return null;
  return pg.constraint ?? "";
}
