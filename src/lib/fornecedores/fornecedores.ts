/**
 * Fornecedores (entidade vinculada à entrada de mercadoria).
 * Listagem e criação. Nome único.
 */

import { asc } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db/client";
import { fornecedores } from "@/db/schema";

export const esquemaFornecedor = z.object({
  nome: z.preprocess(
    (v) => (v === undefined || v === null ? "" : v),
    z.string().trim().min(1, "Nome do fornecedor é obrigatório.").max(120),
  ),
});

export interface Fornecedor {
  id: string;
  nome: string;
}

export async function listarFornecedores(db: Database): Promise<Fornecedor[]> {
  return db
    .select({ id: fornecedores.id, nome: fornecedores.nome })
    .from(fornecedores)
    .orderBy(asc(fornecedores.nome));
}

export async function criarFornecedor(
  db: Database,
  entrada: z.infer<typeof esquemaFornecedor>,
): Promise<Fornecedor> {
  const [criado] = await db
    .insert(fornecedores)
    .values({ nome: entrada.nome })
    .returning({ id: fornecedores.id, nome: fornecedores.nome });
  return criado;
}
