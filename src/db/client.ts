/**
 * Conexão única (singleton) do Drizzle com o PostgreSQL.
 *
 * Em dev o Next recarrega módulos a cada edição; sem o cache em `globalThis`
 * isso vazaria pools de conexão. O singleton evita esgotar o Postgres.
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL não definida. Copie .env.example para .env.");
}

const globalForDb = globalThis as unknown as { quilatePool?: Pool };

const pool = globalForDb.quilatePool ?? new Pool({ connectionString: databaseUrl });
if (process.env.NODE_ENV !== "production") {
  globalForDb.quilatePool = pool;
}

export const db = drizzle(pool, { schema });
export type Database = typeof db;
