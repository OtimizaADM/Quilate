/**
 * Handler compartilhado de registro de movimentação via HTTP (JSON).
 *
 * Usado tanto pela tela (origem 'manual') quanto pela integração N8N/WhatsApp
 * (origem 'whatsapp'), garantindo a mesma validação e o mesmo mapa de erros:
 * - 422 dados inválidos; 404 código não encontrado; 409 saldo insuficiente.
 */

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  registrarMovimentacao,
  type OrigemMovimentacao,
} from "@/lib/movimentacoes/registrarMovimentacao";
import { esquemaMovimentacao } from "@/lib/movimentacoes/validarMovimentacao";

function statusDoErro(mensagem: string): number {
  if (mensagem.includes("Saldo insuficiente")) return 409;
  if (mensagem.includes("não encontrado")) return 404;
  return 400;
}

export async function responderMovimentacao(
  request: Request,
  origem: OrigemMovimentacao,
): Promise<NextResponse> {
  const parsed = esquemaMovimentacao.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados inválidos.", detalhes: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const resultado = await registrarMovimentacao(db, {
      codigo: parsed.data.codigo,
      tipoMov: parsed.data.tipoMov,
      quantidade: parsed.data.quantidade,
      observacao: parsed.data.observacao,
      origem,
      colecaoId: parsed.data.colecaoId,
      fornecedorId: parsed.data.fornecedorId,
    });
    return NextResponse.json(resultado, { status: 201 });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return NextResponse.json({ erro: mensagem }, { status: statusDoErro(mensagem) });
  }
}
