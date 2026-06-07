/**
 * Validação da entrada de movimentação (tela 7.2).
 * Valida forma e domínio; a regra de saldo fica em regrasSaldo.
 */

import { z } from "zod";

const idOpcional = z.preprocess(
  (v) => (v === undefined || v === "" ? null : v),
  z.string().uuid("Identificador inválido.").nullable(),
);

export const esquemaMovimentacao = z
  .object({
    codigo: z.string().trim().min(1, "Informe o código."),
    tipoMov: z.enum(["entrada", "saida"]),
    quantidade: z.coerce
      .number()
      .int("Quantidade deve ser inteira.")
      .positive("Quantidade deve ser maior que zero."),
    // Aceita ausente, null ou "" como null; demais, string aparada (máx. 500).
    observacao: z.preprocess((v) => {
      if (v === undefined || v === null) return null;
      const texto = String(v).trim();
      return texto === "" ? null : texto;
    }, z.string().max(500).nullable()),
    // Coleção e fornecedor da compra — obrigatórios na entrada (regra abaixo).
    colecaoId: idOpcional,
    fornecedorId: idOpcional,
  })
  .superRefine((dados, ctx) => {
    if (dados.tipoMov !== "entrada") return;
    if (!dados.colecaoId) {
      ctx.addIssue({ path: ["colecaoId"], code: "custom", message: "Coleção é obrigatória na entrada." });
    }
    if (!dados.fornecedorId) {
      ctx.addIssue({ path: ["fornecedorId"], code: "custom", message: "Fornecedor é obrigatório na entrada." });
    }
  });

export type MovimentacaoValidada = z.infer<typeof esquemaMovimentacao>;
