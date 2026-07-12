/**
 * API de um modelo específico — GET (carregar p/ edição) e PUT (salvar edição).
 * Regra 3: remover SKU só se nunca teve movimentação (senão 409).
 */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { salvarImagem } from "@/lib/imagens/salvarImagem";
import { alterarModelo, type NovoSku } from "@/lib/modelos/alterarModelo";
import { buscarModeloParaEdicao } from "@/lib/modelos/buscarModeloParaEdicao";
import { esquemaEdicaoModelo } from "@/lib/modelos/validarCadastro";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  const modelo = await buscarModeloParaEdicao(db, id);
  if (!modelo) return NextResponse.json({ erro: "Modelo não encontrado." }, { status: 404 });
  return NextResponse.json(modelo);
}

function parseJson<T>(valor: FormDataEntryValue | null, fallback: T): T {
  if (!valor) return fallback;
  return JSON.parse(String(valor)) as T;
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  const form = await request.formData();

  let corpo: unknown;
  try {
    corpo = {
      descricao: form.get("descricao"),
      modeloFornecedor: form.get("modeloFornecedor"),
      precoCusto: form.get("precoCusto"),
      precoVenda: form.get("precoVenda"),
      colecaoId: form.get("colecaoId"),
      fornecedorId: form.get("fornecedorId"),
      novosSkus: parseJson<NovoSku[]>(form.get("novosSkus"), []),
      removerVariacaoIds: parseJson<string[]>(form.get("removerVariacaoIds"), []),
    };
  } catch {
    return NextResponse.json({ erro: "Campos JSON inválidos." }, { status: 422 });
  }

  const parsed = esquemaEdicaoModelo.safeParse(corpo);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados inválidos.", detalhes: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const imagem = form.get("imagem");
  const imagemPath =
    imagem instanceof File && imagem.size > 0 ? await salvarImagem(imagem) : undefined;

  try {
    await alterarModelo(db, id, {
      descricao: parsed.data.descricao,
      modeloFornecedor: parsed.data.modeloFornecedor,
      precoCusto: parsed.data.precoCusto,
      precoVenda: parsed.data.precoVenda,
      colecaoId: parsed.data.colecaoId,
      fornecedorId: parsed.data.fornecedorId,
      novosSkus: parsed.data.novosSkus,
      removerVariacaoIds: parsed.data.removerVariacaoIds,
      ...(imagemPath !== undefined ? { imagemPath } : {}),
    });
    return NextResponse.json({ id, atualizado: true });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    const conflito = mensagem.includes("já tiveram movimentação");
    return NextResponse.json({ erro: mensagem }, { status: conflito ? 409 : 400 });
  }
}
