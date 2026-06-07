/**
 * Coleções (entidade vinculada à entrada de mercadoria).
 * Identidade: nome + data. Listagem e criação.
 */

import { asc, desc } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db/client";
import { colecoes } from "@/db/schema";

export const esquemaColecao = z.object({
  nome: z.preprocess(
    (v) => (v === undefined || v === null ? "" : v),
    z.string().trim().min(1, "Nome da coleção é obrigatório.").max(120),
  ),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida. Use AAAA-MM-DD."),
});

export interface Colecao {
  id: string;
  nome: string;
  data: string;
}

export async function listarColecoes(db: Database): Promise<Colecao[]> {
  return db
    .select({ id: colecoes.id, nome: colecoes.nome, data: colecoes.data })
    .from(colecoes)
    .orderBy(desc(colecoes.data), asc(colecoes.nome));
}

export async function criarColecao(
  db: Database,
  entrada: z.infer<typeof esquemaColecao>,
): Promise<Colecao> {
  const [criada] = await db
    .insert(colecoes)
    .values({ nome: entrada.nome, data: entrada.data })
    .returning({ id: colecoes.id, nome: colecoes.nome, data: colecoes.data });
  return criada;
}
