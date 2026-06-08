/**
 * Etapa 2 do cadastro via WhatsApp: anexar a imagem ao modelo recém-criado.
 *
 * O bot cria o modelo sem imagem (cadastrarViaIntegracao) e, em seguida, o
 * operador envia a foto. Como o sistema é single-tenant/usuário único, o modelo
 * "aguardando imagem" é o mais recente com imagem nula — não há ambiguidade.
 */

import { desc, eq, isNull } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, variacoes } from "@/db/schema";
import { salvarImagem } from "@/lib/imagens/salvarImagem";
import { ErroCadastroIntegracao } from "./cadastrarViaIntegracao";

export interface ResultadoAnexarImagem {
  modeloId: string;
  imagemPath: string;
  codigos: string[];
}

export async function anexarImagemUltimoModelo(
  db: Database,
  arquivo: File,
): Promise<ResultadoAnexarImagem> {
  const [pendente] = await db
    .select({ id: modelos.id })
    .from(modelos)
    .where(isNull(modelos.imagemPath))
    .orderBy(desc(modelos.criadoEm))
    .limit(1);

  if (!pendente) {
    throw new ErroCadastroIntegracao("Nenhum cadastro aguardando imagem.", 404);
  }

  const imagemPath = await salvarImagem(arquivo);
  if (!imagemPath) {
    throw new ErroCadastroIntegracao("Imagem inválida ou vazia.", 422);
  }

  await db.update(modelos).set({ imagemPath }).where(eq(modelos.id, pendente.id));

  const skus = await db
    .select({ codigo: variacoes.codigo })
    .from(variacoes)
    .where(eq(variacoes.modeloId, pendente.id));

  return { modeloId: pendente.id, imagemPath, codigos: skus.map((s) => s.codigo) };
}
