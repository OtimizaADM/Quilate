CREATE TABLE "colecoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"data" date NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now(),
	CONSTRAINT "colecoes_nome_data" UNIQUE("nome","data")
);
--> statement-breakpoint
CREATE TABLE "fornecedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now(),
	CONSTRAINT "fornecedores_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
ALTER TABLE "movimentacoes" ADD COLUMN "colecao_id" uuid;--> statement-breakpoint
ALTER TABLE "movimentacoes" ADD COLUMN "fornecedor_id" uuid;--> statement-breakpoint
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_colecao_id_colecoes_id_fk" FOREIGN KEY ("colecao_id") REFERENCES "public"."colecoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE no action ON UPDATE no action;