/**
 * API de um produto — PATCH (inativar/reativar) e DELETE (excluir físico).
 * Regra 3: excluir só se nunca houve movimentação; senão, 409 (inative).
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { definirAtivoProduto, excluirProduto } from "@/lib/produtos/alterarProduto";

const esquemaPatch = z.object({ ativo: z.boolean() });

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  const parsed = esquemaPatch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: "Esperado { ativo: boolean }." }, { status: 422 });
  }
  try {
    await definirAtivoProduto(db, id, parsed.data.ativo);
    return NextResponse.json({ id, ativo: parsed.data.ativo });
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : String(erro) },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  try {
    await excluirProduto(db, id);
    return NextResponse.json({ id, excluido: true });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    const temHistorico = mensagem.includes("já teve movimentação");
    return NextResponse.json({ erro: mensagem }, { status: temHistorico ? 409 : 400 });
  }
}
