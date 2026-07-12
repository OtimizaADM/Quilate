/**
 * Validação da entrada do cadastro de modelo (tela 7.1).
 *
 * Valida o formato bruto vindo do formulário e o converte para
 * EntradaCadastroModelo. Regras de combinação (pedra obrigatória, tamanho
 * por tipo) ficam em gerarVariacoes — aqui só validamos forma e domínio.
 */

import { z } from "zod";
import { PEDRAS, TIPOS, type TipoCodigo } from "@/lib/codigo/referencia";

const CODIGOS_TIPO = TIPOS.map((t) => t.codigo) as [TipoCodigo, ...TipoCodigo[]];
const CODIGOS_PEDRA = PEDRAS.map((p) => p.codigo);

// Coage ausente/null para "" para que as mensagens de obrigatoriedade apareçam.
const paraTexto = (v: unknown) => (v === undefined || v === null ? "" : v);

const FORMATO_PRECO = /^\d+([.,]\d{1,2})?$/;

const precoObrigatorio = (campo: string) =>
  z.preprocess(
    paraTexto,
    z
      .string()
      .trim()
      .superRefine((valor, ctx) => {
        if (valor === "") {
          ctx.addIssue({ code: "custom", message: `${campo} é obrigatório.` });
          return;
        }
        if (!FORMATO_PRECO.test(valor)) {
          ctx.addIssue({ code: "custom", message: `${campo} inválido. Use o formato 1234,56.` });
        }
      })
      .transform((v) => v.replace(",", ".")),
  );

const DOIS_DIGITOS = /^\d{2}$/;

const quantidadeSku = z.object({
  pedra: z.string().regex(DOIS_DIGITOS),
  tamanho: z.union([z.string().regex(DOIS_DIGITOS), z.null()]),
  quantidade: z.number().int().min(0),
});

export const esquemaCadastroModelo = z
  .object({
    tipo: z.coerce.number().refine((n): n is TipoCodigo => CODIGOS_TIPO.includes(n as TipoCodigo), {
      message: "Tipo inválido. Esperado 1..6.",
    }),
    descricao: z.preprocess(
      paraTexto,
      z.string().trim().min(1, "Descrição é obrigatória.").max(500),
    ),
    modeloFornecedor: z
      .preprocess(paraTexto, z.string().trim().max(200))
      .transform((v) => (v === "" ? null : v)),
    precoCusto: precoObrigatorio("Preço de custo"),
    precoVenda: precoObrigatorio("Preço de venda"),
    colecaoId: z.preprocess(paraTexto, z.string().uuid("Coleção é obrigatória.")),
    fornecedorId: z.preprocess(paraTexto, z.string().uuid("Fornecedor é obrigatório.")),
    pedras: z
      .array(z.string())
      .min(1, "Selecione ao menos uma pedra.")
      .refine((arr) => arr.every((p) => CODIGOS_PEDRA.includes(p)), {
        message: "Pedra inválida na seleção.",
      }),
    tamanhos: z
      .array(z.string().regex(DOIS_DIGITOS, "Tamanho deve ter 2 dígitos."))
      .default([]),
    quantidades: z.array(quantidadeSku).default([]),
  })
  .superRefine((data, ctx) => {
    const pedrasSel = new Set(data.pedras);
    const tamanhosSel = new Set(data.tamanhos);
    for (const q of data.quantidades) {
      if (q.quantidade <= 0) continue;
      const tamanhoOk = q.tamanho === null || tamanhosSel.has(q.tamanho);
      if (!pedrasSel.has(q.pedra) || !tamanhoOk) {
        ctx.addIssue({
          code: "custom",
          message: `Quantidade para SKU não selecionado: pedra ${q.pedra}, tamanho ${q.tamanho ?? "—"}.`,
        });
      }
    }
  });

export type CadastroModeloValidado = z.infer<typeof esquemaCadastroModelo>;

const novoSku = z.object({
  pedra: z.string().refine((p) => CODIGOS_PEDRA.includes(p), { message: "Pedra inválida." }),
  tamanho: z.union([z.string().regex(DOIS_DIGITOS), z.null()]),
  quantidade: z.number().int().min(0),
});

export const esquemaEdicaoModelo = z.object({
  descricao: z.preprocess(paraTexto, z.string().trim().min(1, "Descrição é obrigatória.").max(500)),
  modeloFornecedor: z
    .preprocess(paraTexto, z.string().trim().max(200))
    .transform((v) => (v === "" ? null : v)),
  precoCusto: precoObrigatorio("Preço de custo"),
  precoVenda: precoObrigatorio("Preço de venda"),
  colecaoId: z.preprocess(paraTexto, z.string().uuid("Coleção é obrigatória.")),
  fornecedorId: z.preprocess(paraTexto, z.string().uuid("Fornecedor é obrigatório.")),
  novosSkus: z.array(novoSku).default([]),
  removerVariacaoIds: z.array(z.string().uuid()).default([]),
});

export type EdicaoModeloValidada = z.infer<typeof esquemaEdicaoModelo>;
