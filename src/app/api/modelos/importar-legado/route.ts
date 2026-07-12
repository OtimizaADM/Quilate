/** POST /api/modelos/importar-legado — prévia e importação da tabela TSV legada. */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import {
  analisarTabelaLegado,
  ConflitoTabelaLegadoError,
  importarTabelaLegado,
} from "@/lib/legado/importarTabelaLegado";
import { ErroTabelaLegado } from "@/lib/legado/tabelaLegado";

const TAMANHO_MAXIMO = 2 * 1024 * 1024;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const arquivo = form.get("arquivo");
  const acao = form.get("acao");

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return NextResponse.json({ erro: "Selecione a tabela legada." }, { status: 422 });
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    return NextResponse.json({ erro: "O arquivo deve ter no máximo 2 MB." }, { status: 422 });
  }
  if (acao !== "analisar" && acao !== "importar") {
    return NextResponse.json({ erro: "Ação inválida." }, { status: 422 });
  }

  try {
    const conteudo = await arquivo.text();
    const resultado =
      acao === "analisar"
        ? await analisarTabelaLegado(db, conteudo)
        : await importarTabelaLegado(db, conteudo);
    return NextResponse.json(resultado, { status: acao === "importar" ? 201 : 200 });
  } catch (erro) {
    if (erro instanceof ErroTabelaLegado) {
      return NextResponse.json(
        { erro: erro.message, detalhes: erro.detalhes.slice(0, 50) },
        { status: 422 },
      );
    }
    if (erro instanceof ConflitoTabelaLegadoError) {
      return NextResponse.json(
        { erro: erro.message, detalhes: erro.conflitos.slice(0, 50) },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Falha ao importar a tabela." },
      { status: 500 },
    );
  }
}
