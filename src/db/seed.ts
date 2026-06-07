/**
 * Seed das tabelas de referência (tipos, pedras, tamanhos_validos).
 *
 * Idempotente: usa onConflictDoNothing, então pode rodar quantas vezes quiser.
 * A fonte da verdade é src/lib/codigo/referencia.ts — não duplique os valores aqui.
 *
 * Uso: npm run db:seed
 */

import { db } from "./client";
import { pedras, tamanhosValidos, tipos } from "./schema";
import { PEDRAS, TAMANHOS_VALIDOS, TIPOS, type TipoCodigo } from "@/lib/codigo/referencia";

async function seed(): Promise<void> {
  const linhasTipos = TIPOS.map((t) => ({ codigo: t.codigo, descricao: t.descricao }));
  await db.insert(tipos).values(linhasTipos).onConflictDoNothing();

  await db.insert(pedras).values([...PEDRAS]).onConflictDoNothing();

  const linhasTamanhos = (Object.keys(TAMANHOS_VALIDOS) as unknown as TipoCodigo[]).flatMap(
    (tipo) => TAMANHOS_VALIDOS[tipo].map((tamanho) => ({ tipo, tamanho })),
  );
  await db.insert(tamanhosValidos).values(linhasTamanhos).onConflictDoNothing();

  console.log(
    JSON.stringify({
      evento: "seed_concluido",
      tipos: linhasTipos.length,
      pedras: PEDRAS.length,
      tamanhos: linhasTamanhos.length,
    }),
  );
}

seed()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error(JSON.stringify({ evento: "seed_falhou", erro: String(erro) }));
    process.exit(1);
  });
