/**
 * Validação da entrada do cadastro de modelo (tela 7.1).
 *
 * Valida o formato bruto vindo do formulário e o converte para
 * EntradaCadastroModelo. Regras de combinação (pedra obrigatória, tamanho
 * por tipo) ficam em gerarVariacoes — aqui só validamos forma e domínio.
 */

import { z } from "zod";
import { PEDRAS, TAMANHOS_VALIDOS, TIPOS, type TipoCodigo } from "@/lib/codigo/referencia";

const CODIGOS_TIPO = TIPOS.map((t) => t.codigo) as [TipoCodigo, ...TipoCodigo[]];
const CODIGOS_PEDRA = PEDRAS.map((p) => p.codigo);
const TODOS_TAMANHOS = Object.values(TAMANHOS_VALIDOS).flat();

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

export const esquemaCadastroModelo = z.object({
  tipo: z.coerce.number().refine((n): n is TipoCodigo => CODIGOS_TIPO.includes(n as TipoCodigo), {
    message: "Tipo inválido. Esperado 1..6.",
  }),
  descricao: z.preprocess(
    paraTexto,
    z.string().trim().min(1, "Descrição é obrigatória.").max(500),
  ),
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
    .array(z.string())
    .refine((arr) => arr.every((t) => TODOS_TAMANHOS.includes(t)), {
      message: "Tamanho inválido na seleção.",
    }),
});

export type CadastroModeloValidado = z.infer<typeof esquemaCadastroModelo>;
