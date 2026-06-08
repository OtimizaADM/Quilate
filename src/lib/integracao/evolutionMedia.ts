/**
 * Download de mídia do WhatsApp via Evolution (base64).
 *
 * Compartilhado pela transcrição de áudio e pelo cadastro de imagem — a chamada
 * getBase64FromMediaMessage é a mesma para qualquer tipo de mídia. Tira o
 * binário do N8N: o fluxo manda só o messageId e o servidor baixa.
 */

export async function fetchComTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controlador.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface MidiaEvolution {
  base64: string;
  mimetype: string;
}

export async function baixarMediaEvolution(
  messageId: string,
  remoteJid?: string,
): Promise<MidiaEvolution> {
  const base = process.env.EVOLUTION_URL ?? "http://evolution-api:8080";
  const instancia = process.env.EVOLUTION_INSTANCE ?? "vps";
  const apikey = process.env.EVOLUTION_API_KEY;
  if (!apikey) throw new Error("EVOLUTION_API_KEY não configurada no app.");

  const resp = await fetchComTimeout(
    `${base}/chat/getBase64FromMediaMessage/${instancia}`,
    {
      method: "POST",
      headers: { apikey, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { key: { id: messageId, remoteJid } } }),
    },
    20000,
  );
  if (!resp.ok) {
    throw new Error(`Evolution ${resp.status}: ${(await resp.text().catch(() => "")).slice(0, 200)}`);
  }
  const dados = (await resp.json()) as { base64?: string; mimetype?: string };
  if (!dados.base64) throw new Error("Evolution não retornou o base64 da mídia.");
  return { base64: dados.base64, mimetype: dados.mimetype ?? "" };
}
