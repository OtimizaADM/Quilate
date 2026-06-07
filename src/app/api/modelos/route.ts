/**
 * API de cadastro de modelo — POST /api/modelos (tela 7.1).
 *
 * Recebe multipart/form-data (campos + imagem opcional), valida, salva a
 * imagem no disco e delega a regra de negócio a cadastrarModelo. A lógica fica
 * no serviço, não aqui — assim a futura origem 'whatsapp' reaproveita o serviço.
 */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { salvarImagem } from "@/lib/imagens/salvarImagem";
import { cadastrarModelo } from "@/lib/modelos/cadastrarModelo";
import { esquemaCadastroModelo } from "@/lib/modelos/validarCadastro";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();

  const parsed = esquemaCadastroModelo.safeParse({
    tipo: form.get("tipo"),
    descricao: form.get("descricao"),
    precoCusto: form.get("precoCusto"),
    precoVenda: form.get("precoVenda"),
    colecaoId: form.get("colecaoId"),
    fornecedorId: form.get("fornecedorId"),
    pedras: form.getAll("pedras").map(String),
    tamanhos: form.getAll("tamanhos").map(String),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados inválidos.", detalhes: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const imagem = form.get("imagem");
  if (!(imagem instanceof File) || imagem.size === 0) {
    return NextResponse.json(
      { erro: "Imagem do modelo é obrigatória." },
      { status: 422 },
    );
  }

  try {
    const imagemPath = await salvarImagem(imagem);

    const resultado = await cadastrarModelo(db, {
      tipo: parsed.data.tipo,
      descricao: parsed.data.descricao,
      precoCusto: parsed.data.precoCusto,
      precoVenda: parsed.data.precoVenda,
      imagemPath,
      colecaoId: parsed.data.colecaoId,
      fornecedorId: parsed.data.fornecedorId,
      pedras: parsed.data.pedras,
      tamanhos: parsed.data.tamanhos,
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (erro) {
    return NextResponse.json({ erro: String(erro instanceof Error ? erro.message : erro) }, {
      status: 400,
    });
  }
}
