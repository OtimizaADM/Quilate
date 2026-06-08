/**
 * Extração de dados de NOTA FISCAL / RECIBO de compra (visão/OCR) para entrada
 * de mercadoria. O documento É a fonte (tem fornecedor, valores, quantidades) —
 * diferente de uma foto das peças. O bot mostra prévia e confirma antes de gravar.
 *
 * Envs: VISION_API_KEY (default GROQ_API_KEY), VISION_API_URL, VISION_MODEL.
 * Para notas, gpt-4o-mini/gemini-2.5-flash leem números melhor que modelos free.
 */

import { baixarMediaEvolution, fetchComTimeout } from "./evolutionMedia";
import { limparBase64 } from "./transcreverAudio";

const PROMPT_SISTEMA = `Você extrai dados de uma NOTA FISCAL ou RECIBO de COMPRA de joias, para registrar entrada de estoque.
Tipos possíveis: 1 Anel, 2 Brinco, 3 Colar, 4 Pingente, 5 Pulseira, 6 Tornozeleira.
Responda APENAS um JSON com este formato exato:
{
  "fornecedor": "<nome do emitente/fornecedor, ou null>",
  "colecao": "<coleção, se mencionada, ou null>",
  "itens": [
    {
      "descricao": "<descrição do item>",
      "quantidade": <número inteiro>,
      "custoUnitario": "<valor unitário de custo, ex 120,00, ou null>",
      "tipo": <1 a 6 conforme a lista, ou null se não der pra inferir>,
      "pedra": "<cor/pedra se aparecer, ou null>",
      "tamanho": "<tamanho se aparecer, ou null>"
    }
  ]
}
REGRAS: extraia SOMENTE o que está no documento; nunca invente. Campo ausente = null.
NÃO calcule preço de venda (não está na nota de compra). Se houver valor total por item,
divida pela quantidade para obter o unitário.`;

export interface ItemDocumento {
  descricao: string;
  quantidade: number | null;
  custoUnitario: string | null;
  tipo: number | null;
  pedra: string | null;
  tamanho: string | null;
}

export interface DocumentoExtraido {
  fornecedor: string | null;
  colecao: string | null;
  itens: ItemDocumento[];
}

/** Extrai o primeiro objeto JSON de um texto (modelos às vezes embrulham em ```). */
export function extrairJson(texto: string): Record<string, unknown> {
  const match = String(texto || "").match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function extrairDocumento(
  messageId: string,
  remoteJid?: string,
  legenda?: string,
): Promise<DocumentoExtraido> {
  const apiKey = process.env.VISION_API_KEY || process.env.GROQ_API_KEY;
  const apiUrl = process.env.VISION_API_URL ?? "https://api.groq.com/openai/v1/chat/completions";
  const model = process.env.VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";
  if (!apiKey) throw new Error("VISION_API_KEY/GROQ_API_KEY não configurada no app.");

  const midia = await baixarMediaEvolution(messageId, remoteJid);
  const dataUri = `data:${midia.mimetype || "image/jpeg"};base64,${limparBase64(midia.base64)}`;
  const textoUsuario = legenda?.trim()
    ? `Observação do operador: ${legenda.trim()}`
    : "Extraia os dados desta nota/recibo.";

  const resp = await fetchComTimeout(
    apiUrl,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: PROMPT_SISTEMA },
          {
            role: "user",
            content: [
              { type: "text", text: textoUsuario },
              { type: "image_url", image_url: { url: dataUri } },
            ],
          },
        ],
      }),
    },
    45000,
  );
  if (!resp.ok) {
    throw new Error(`Visão ${resp.status}: ${(await resp.text().catch(() => "")).slice(0, 300)}`);
  }

  const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
  const bruto = extrairJson(data.choices?.[0]?.message?.content ?? "{}");
  const itensBrutos = Array.isArray(bruto.itens) ? (bruto.itens as Record<string, unknown>[]) : [];

  return {
    fornecedor: (bruto.fornecedor as string) || null,
    colecao: (bruto.colecao as string) || null,
    itens: itensBrutos.map((i) => ({
      descricao: String(i.descricao ?? "").trim(),
      quantidade: typeof i.quantidade === "number" ? i.quantidade : null,
      custoUnitario: i.custoUnitario != null ? String(i.custoUnitario) : null,
      tipo: typeof i.tipo === "number" ? i.tipo : null,
      pedra: i.pedra != null ? String(i.pedra) : null,
      tamanho: i.tamanho != null ? String(i.tamanho) : null,
    })),
  };
}
