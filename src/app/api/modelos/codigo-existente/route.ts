/** POST /api/modelos/codigo-existente — cadastra um SKU histórico pelo código completo. */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import {
  cadastrarCodigoExistente,
  CodigoJaCadastradoError,
} from "@/lib/modelos/cadastrarCodigoExistente";

const esquema = z.object({ codigo: z.string().trim().min(1, "Informe o código.") });

export async function POST(request: NextRequest): Promise<NextResponse> {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const parsed = esquema.safeParse(corpo);
  if (!parsed.success) {
    return NextResponse.json({ erro: "Informe o código completo." }, { status: 422 });
  }

  try {
    const resultado = await cadastrarCodigoExistente(db, parsed.data.codigo);
    return NextResponse.json(resultado, { status: 201 });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao cadastrar o código.";
    return NextResponse.json(
      { erro: mensagem },
      { status: erro instanceof CodigoJaCadastradoError ? 409 : 422 },
    );
  }
}
