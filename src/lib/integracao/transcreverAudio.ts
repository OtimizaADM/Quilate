/**
 * Transcrição de áudio do WhatsApp (voz → texto) para o agente.
 *
 * Tira o trabalho de binário/multipart do N8N: o N8N manda só JSON (o base64 do
 * áudio OU o messageId) e este serviço cuida de baixar (se preciso) e transcrever
 * via Groq Whisper, devolvendo o texto. Mantém o agente text-only.
 *
 * Envs: GROQ_API_KEY (obrigatória). Para baixar pelo messageId:
 * EVOLUTION_API_KEY, EVOLUTION_URL (default rede interna), EVOLUTION_INSTANCE.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export interface EntradaTranscricao {
  audioBase64?: string;
  messageId?: string;
  remoteJid?: string;
  mimeType?: string;
  fileName?: string;
}

/** Remove o prefixo data-uri ("data:...;base64,") se vier junto. */
export function limparBase64(valor: string): string {
  return String(valor || "").replace(/^data:.*;base64,/, "").trim();
}

async function fetchComTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controlador.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function baixarAudioEvolution(messageId: string, remoteJid?: string): Promise<string> {
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
  const dados = (await resp.json()) as { base64?: string };
  if (!dados.base64) throw new Error("Evolution não retornou o base64 do áudio.");
  return dados.base64;
}

export async function transcreverAudio(entrada: EntradaTranscricao): Promise<{ text: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY não configurada no app.");

  let base64 = entrada.audioBase64 ? limparBase64(entrada.audioBase64) : "";
  if (!base64 && entrada.messageId) {
    base64 = limparBase64(await baixarAudioEvolution(entrada.messageId, entrada.remoteJid));
  }
  if (!base64) throw new Error("Forneça audioBase64 ou messageId.");

  const arquivo = new Blob([Buffer.from(base64, "base64")], {
    type: entrada.mimeType ?? "audio/ogg",
  });

  const form = new FormData();
  form.append("file", arquivo, entrada.fileName ?? "audio.ogg");
  form.append("model", "whisper-large-v3");
  form.append("language", "pt");
  form.append("response_format", "json");

  const resp = await fetchComTimeout(
    GROQ_URL,
    { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form },
    30000,
  );
  if (!resp.ok) {
    throw new Error(`Groq ${resp.status}: ${(await resp.text().catch(() => "")).slice(0, 300)}`);
  }
  const dados = (await resp.json()) as { text?: string };
  return { text: (dados.text ?? "").trim() };
}
