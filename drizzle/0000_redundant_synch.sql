CREATE TABLE "modelos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" smallint NOT NULL,
	"sequencial" char(5) NOT NULL,
	"descricao" text,
	"preco_custo" numeric(10, 2),
	"preco_venda" numeric(10, 2),
	"imagem_path" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now(),
	CONSTRAINT "modelos_tipo_sequencial" UNIQUE("tipo","sequencial")
);
--> statement-breakpoint
CREATE TABLE "movimentacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variacao_id" uuid NOT NULL,
	"tipo_mov" text NOT NULL,
	"quantidade" integer NOT NULL,
	"origem" text NOT NULL,
	"observacao" text,
	"data" timestamp with time zone DEFAULT now(),
	CONSTRAINT "movimentacoes_tipo_mov" CHECK ("movimentacoes"."tipo_mov" in ('entrada','saida')),
	CONSTRAINT "movimentacoes_quantidade" CHECK ("movimentacoes"."quantidade" > 0),
	CONSTRAINT "movimentacoes_origem" CHECK ("movimentacoes"."origem" in ('whatsapp','manual','importacao'))
);
--> statement-breakpoint
CREATE TABLE "pedras" (
	"codigo" char(2) PRIMARY KEY NOT NULL,
	"descricao" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tamanhos_validos" (
	"tipo" smallint NOT NULL,
	"tamanho" char(2) NOT NULL,
	CONSTRAINT "tamanhos_validos_pk" UNIQUE("tipo","tamanho")
);
--> statement-breakpoint
CREATE TABLE "tipos" (
	"codigo" smallint PRIMARY KEY NOT NULL,
	"descricao" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modelo_id" uuid NOT NULL,
	"pedra" char(2),
	"tamanho" char(2),
	"codigo" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "variacoes_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "variacoes_modelo_pedra_tamanho" UNIQUE("modelo_id","pedra","tamanho")
);
--> statement-breakpoint
ALTER TABLE "modelos" ADD CONSTRAINT "modelos_tipo_tipos_codigo_fk" FOREIGN KEY ("tipo") REFERENCES "public"."tipos"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_variacao_id_variacoes_id_fk" FOREIGN KEY ("variacao_id") REFERENCES "public"."variacoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tamanhos_validos" ADD CONSTRAINT "tamanhos_validos_tipo_tipos_codigo_fk" FOREIGN KEY ("tipo") REFERENCES "public"."tipos"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variacoes" ADD CONSTRAINT "variacoes_modelo_id_modelos_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variacoes" ADD CONSTRAINT "variacoes_pedra_pedras_codigo_fk" FOREIGN KEY ("pedra") REFERENCES "public"."pedras"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE VIEW "public"."saldos" AS (
    select
      v.id as variacao_id,
      v.codigo,
      coalesce(sum(case when m.tipo_mov = 'entrada' then m.quantidade
                        when m.tipo_mov = 'saida'   then -m.quantidade end), 0) as saldo
    from variacoes v
    left join movimentacoes m on m.variacao_id = v.id
    group by v.id, v.codigo
  );