/**
 * Schema do banco (PostgreSQL) — fiel à seção 4 da especificação.
 *
 * Decisões estruturais inegociáveis:
 * - `saldos` é uma VIEW derivada de `movimentacoes`, nunca uma coluna editável.
 * - `pedra`/`tamanho` aceitam NULL (modelo híbrido p/ dados legados).
 * - UNIQUE compostos garantem no banco que não há SKU nem sequencial duplicado.
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  integer,
  numeric,
  pgTable,
  pgView,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// ===== TABELAS DE REFERÊNCIA (seed inicial) =====

export const tipos = pgTable("tipos", {
  codigo: smallint("codigo").primaryKey(), // 1..6
  descricao: text("descricao").notNull(),
});

export const pedras = pgTable("pedras", {
  codigo: char("codigo", { length: 2 }).primaryKey(), // '00'..'15'
  descricao: text("descricao").notNull(),
});

export const tamanhosValidos = pgTable(
  "tamanhos_validos",
  {
    tipo: smallint("tipo")
      .notNull()
      .references(() => tipos.codigo),
    tamanho: char("tamanho", { length: 2 }).notNull(),
  },
  (t) => [unique("tamanhos_validos_pk").on(t.tipo, t.tamanho)],
);

// ===== MODELOS (o que o usuário cadastra) =====

export const modelos = pgTable(
  "modelos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tipo: smallint("tipo")
      .notNull()
      .references(() => tipos.codigo),
    sequencial: char("sequencial", { length: 5 }).notNull(), // gerado pelo sistema
    descricao: text("descricao"),
    precoCusto: numeric("preco_custo", { precision: 10, scale: 2 }),
    precoVenda: numeric("preco_venda", { precision: 10, scale: 2 }),
    imagemPath: text("imagem_path"),
    // Coleção/fornecedor de lançamento do modelo. Nullable no banco (legado);
    // obrigatórios no cadastro pela tela (regra de aplicação). Cada entrada de
    // mercadoria (reposição) registra sua própria coleção/fornecedor à parte.
    colecaoId: uuid("colecao_id").references(() => colecoes.id),
    fornecedorId: uuid("fornecedor_id").references(() => fornecedores.id),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique("modelos_tipo_sequencial").on(t.tipo, t.sequencial)],
);

// ===== VARIAÇÕES = SKUs (geradas a partir do modelo) =====

export const variacoes = pgTable(
  "variacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modeloId: uuid("modelo_id")
      .notNull()
      .references(() => modelos.id),
    pedra: char("pedra", { length: 2 }).references(() => pedras.codigo), // NULL p/ legado
    tamanho: char("tamanho", { length: 2 }), // NULL p/ brinco/pingente e legado
    codigo: text("codigo").notNull().unique(),
    ativo: boolean("ativo").notNull().default(true),
  },
  (t) => [unique("variacoes_modelo_pedra_tamanho").on(t.modeloId, t.pedra, t.tamanho)],
);

// ===== COLEÇÕES E FORNECEDORES (vinculados à entrada de mercadoria) =====

export const colecoes = pgTable(
  "colecoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    data: date("data").notNull(), // identidade da coleção: nome + data
    criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique("colecoes_nome_data").on(t.nome, t.data)],
);

export const fornecedores = pgTable("fornecedores", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull().unique(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow(),
});

// ===== MOVIMENTAÇÕES (histórico — base do saldo) =====

export const movimentacoes = pgTable(
  "movimentacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variacaoId: uuid("variacao_id")
      .notNull()
      .references(() => variacoes.id),
    tipoMov: text("tipo_mov").notNull(),
    quantidade: integer("quantidade").notNull(),
    origem: text("origem").notNull(),
    // Coleção e fornecedor da compra. NULL em saídas e (futuras) importações;
    // obrigatórios na entrada manual (regra de aplicação, não do banco).
    colecaoId: uuid("colecao_id").references(() => colecoes.id),
    fornecedorId: uuid("fornecedor_id").references(() => fornecedores.id),
    observacao: text("observacao"),
    data: timestamp("data", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    check("movimentacoes_tipo_mov", sql`${t.tipoMov} in ('entrada','saida')`),
    check("movimentacoes_quantidade", sql`${t.quantidade} > 0`),
    check("movimentacoes_origem", sql`${t.origem} in ('whatsapp','manual','importacao')`),
  ],
);

// ===== SALDO (VIEW — calculado, nunca editado diretamente) =====

export const saldos = pgView("saldos", {
  variacaoId: uuid("variacao_id"),
  codigo: text("codigo"),
  saldo: integer("saldo"),
}).as(
  sql`
    select
      v.id as variacao_id,
      v.codigo,
      coalesce(sum(case when m.tipo_mov = 'entrada' then m.quantidade
                        when m.tipo_mov = 'saida'   then -m.quantidade end), 0) as saldo
    from variacoes v
    left join movimentacoes m on m.variacao_id = v.id
    group by v.id, v.codigo
  `,
);
