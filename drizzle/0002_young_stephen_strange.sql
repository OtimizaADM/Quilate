ALTER TABLE "modelos" ADD COLUMN "colecao_id" uuid;--> statement-breakpoint
ALTER TABLE "modelos" ADD COLUMN "fornecedor_id" uuid;--> statement-breakpoint
ALTER TABLE "modelos" ADD CONSTRAINT "modelos_colecao_id_colecoes_id_fk" FOREIGN KEY ("colecao_id") REFERENCES "public"."colecoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modelos" ADD CONSTRAINT "modelos_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE no action ON UPDATE no action;