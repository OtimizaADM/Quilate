/**
 * Etapa 2 do cadastro via WhatsApp: anexar a imagem ao modelo recém-criado.
 *
 * Só anexa a um modelo cadastrado nos últimos minutos (JANELA_MINUTOS) — um
 * cadastro de verdade que acabou de pedir a foto. Isso evita que uma foto
 * qualquer (ex.: etiqueta de uma venda) grude num produto antigo importado sem
 * imagem. Se não houver cadastro recente, recusa (404) em vez de anexar errado.
 */

import { and, desc, eq, gt, isNull } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, variacoes } from "@/db/schema";
import { salvarImagem } from "@/lib/imagens/salvarImagem";
import { ErroCadastroIntegracao } from "./cadastrarViaIntegracao";

const JANELA_MINUTOS = 15;

export interface ResultadoAnexarImagem {
  modeloId: string;
  imagemPath: string;
  codigos: string[];
}

export async function anexarImagemUltimoModelo(
  db: Database,
  arquivo: File,
): Promise<ResultadoAnexarImagem> {
  const limite = new Date(Date.now() - JANELA_MINUTOS * 60 * 1000);
  const [pendente] = await db
    .select({ id: modelos.id })
    .from(modelos)
    .where(and(isNull(modelos.imagemPath), gt(modelos.criadoEm, limite)))
    .orderBy(desc(modelos.criadoEm))
    .limit(1);

  if (!pendente) {
    throw new ErroCadastroIntegracao(
      "Nenhum cadastro recente aguardando foto. Cadastre o produto primeiro; ou, para consultar/vender, digite o código.",
      404,
    );
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
