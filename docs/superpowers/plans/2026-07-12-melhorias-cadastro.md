# Melhorias no Cadastro de Modelo — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir informar quantidades por SKU no cadastro (gravando as entradas), com campo "Modelo do fornecedor", "Outro tamanho" digitável, popup de confirmação, edição de cadastro e limpeza da imagem na exclusão.

**Architecture:** Lógica nova extraída em funções puras (testáveis por unidade); orquestração de transação Drizzle fica fina. O cadastro passa a gravar `movimentacoes` de entrada na mesma transação do modelo. UI refatorada em 3 componentes (formulário, grade de SKUs, modal). Edição reaproveita o formulário em modo "editar".

**Tech Stack:** Next.js 16 (App Router), React 19, PostgreSQL + Drizzle ORM, Zod, Vitest, Tailwind.

## Global Constraints

- **Antes de escrever qualquer código Next.js, ler o guia relevante em `node_modules/next/dist/docs/`** (AGENTS.md — esta versão do Next tem breaking changes).
- Código = `tipo(1) + sequencial(5) + pedra(2) + tamanho(2)`. Sequencial é gerado pelo sistema (`max+1` por tipo); usuário nunca digita.
- Saldo é VIEW derivada de `movimentacoes`; nunca coluna editável.
- Excluir = deleção física só se nunca houve movimentação; senão, inativar.
- Estilo (CODE.md): funções 4–20 linhas; arquivos < 500 linhas; tipos explícitos, sem `any`; early returns, máx. 2 níveis de indentação; mensagens de erro citam o valor ofensor.
- **Convenção de testes do repo:** só **libs puras** têm teste unitário (`npm test` → vitest). Componentes React e serviços que tocam o banco são verificados **rodando o app** (não há harness de teste de componente/DB no projeto). Não introduzir @testing-library nem mocks de DB.
- Banco local via Docker na porta **5433** (há Postgres do Homebrew na 5432). `npm run db:up` antes de migrar/rodar.
- Rodar `npm test` e `npm run lint` antes de cada commit de tarefa que toque libs.

---

# PARTE 1 — Backend + Cadastro

## Task 1: Afrouxar validação de tamanho (aceitar tamanho digitado)

Muda a regra de tamanho de "pertence a `TAMANHOS_VALIDOS`" para "2 dígitos numéricos", em `montarCodigo` e `parseCodigo`. `TAMANHOS_VALIDOS` continua servindo só como sugestões (checkboxes).

**Files:**
- Modify: `src/lib/codigo/codigo.ts`
- Test: `src/lib/codigo/codigo.test.ts`
- Test: `src/lib/modelos/gerarVariacoes.test.ts` (usa `"17"` como "inválido" — precisa mudar)

**Interfaces:**
- Produces: `montarCodigo(partes)` e `parseCodigo(codigo, leniente?)` com validação de tamanho por formato (`/^\d{2}$/`).

- [ ] **Step 1: Atualizar os testes existentes de tamanho (agora "17" é válido)**

Em `src/lib/codigo/codigo.test.ts`, substituir o teste "recusa tamanho inválido para o tipo, citando o valor" por dois testes de formato:

```ts
  it("aceita tamanho fora da lista de sugestões, desde que 2 dígitos (ex.: 17)", () => {
    expect(
      montarCodigo({ tipo: 1, sequencial: "00001", pedra: "00", tamanho: "17" }),
    ).toBe("1000010017");
  });

  it("recusa tamanho com formato inválido, citando o valor", () => {
    expect(() =>
      montarCodigo({ tipo: 1, sequencial: "00001", pedra: "00", tamanho: "7" }),
    ).toThrow("7");
    expect(() =>
      montarCodigo({ tipo: 1, sequencial: "00001", pedra: "00", tamanho: "170" }),
    ).toThrow("170");
  });
```

E em `src/lib/modelos/gerarVariacoes.test.ts`, o teste "propaga erro de tamanho inválido vindo de montarCodigo" hoje usa `tamanhos: ["17"]` — que passa a ser VÁLIDO. Trocar o valor por um formato realmente inválido:

```ts
  it("propaga erro de tamanho inválido vindo de montarCodigo", () => {
    expect(() =>
      gerarVariacoes({ tipo: 1, sequencial: "00001", pedras: ["00"], tamanhos: ["7"] }),
    ).toThrow("7");
  });
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `npm test -- src/lib/codigo/codigo.test.ts src/lib/modelos/gerarVariacoes.test.ts`
Expected: FALHA — hoje `montarCodigo` com "17" lança (17 não está em `TAMANHOS_VALIDOS`); o novo teste de gerarVariacoes com "7" ainda não bate a mensagem esperada até a implementação.

- [ ] **Step 3: Implementar o afrouxamento**

Em `src/lib/codigo/codigo.ts`:

Trocar o import (remover `tamanhoValido`, que fica sem uso):

```ts
import {
  buscarPedra,
  buscarTipo,
  tipoTemTamanho,
  type TipoCodigo,
} from "./referencia";
```

Em `montarCodigo`, substituir o bloco final de validação de tamanho por:

```ts
  if (tamanho === null || !/^\d{2}$/.test(tamanho)) {
    throw new Error(
      `Tamanho inválido para o tipo ${tipo}: "${tamanho}". Esperado 2 dígitos (ex.: "18").`,
    );
  }
  return `${tipo}${sequencial}${pedra}${tamanho}`;
```

Em `parseCodigo`, substituir a checagem estrita de tamanho por (o tamanho já é estruturalmente 2 dígitos numéricos, então mantemos só um guarda de formato):

```ts
  const tamanho = codigo.slice(8, 10);
  if (!leniente && !/^\d{2}$/.test(tamanho)) {
    throw new Error(`Tamanho inválido no código "${codigo}": "${tamanho}".`);
  }
  return { tipo: tipoNumero as TipoCodigo, sequencial, pedra, tamanho };
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `npm test -- src/lib/codigo/codigo.test.ts src/lib/modelos/gerarVariacoes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/codigo/codigo.ts src/lib/codigo/codigo.test.ts src/lib/modelos/gerarVariacoes.test.ts
git commit -m "feat(codigo): tamanho aceita qualquer valor de 2 dígitos (outro tamanho)"
```

---

## Task 2: Coluna `modelo_fornecedor` no schema + migration

**Files:**
- Modify: `src/db/schema.ts:52-73` (tabela `modelos`)
- Create: `drizzle/000X_*.sql` (gerado)

**Interfaces:**
- Produces: `modelos.modeloFornecedor` (coluna `modelo_fornecedor text`, nullable).

- [ ] **Step 1: Adicionar a coluna no schema**

Em `src/db/schema.ts`, dentro de `modelos`, após `descricao`:

```ts
    descricao: text("descricao"),
    modeloFornecedor: text("modelo_fornecedor"),
```

- [ ] **Step 2: Subir o banco e gerar a migration**

Run:
```bash
npm run db:up
npm run db:generate
```
Expected: cria `drizzle/000X_*.sql` contendo `ALTER TABLE "modelos" ADD COLUMN "modelo_fornecedor" text;`

- [ ] **Step 3: Aplicar a migration**

Run: `npm run db:migrate`
Expected: aplica sem erro.

- [ ] **Step 4: Sanidade (compila)**

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat(db): coluna modelo_fornecedor em modelos"
```

---

## Task 3: Lib pura `tamanhos` — parse do "Outro tamanho"

**Files:**
- Create: `src/lib/modelos/tamanhos.ts`
- Test: `src/lib/modelos/tamanhos.test.ts`

**Interfaces:**
- Produces:
  - `parseOutrosTamanhos(texto: string): string[]` — "26, 28" → ["26","28"], padStart 2, lança citando o valor inválido.
  - `combinarTamanhos(marcados: readonly string[], outros: readonly string[]): string[]` — une e deduplica preservando ordem.

- [ ] **Step 1: Escrever o teste**

```ts
import { describe, expect, it } from "vitest";
import { combinarTamanhos, parseOutrosTamanhos } from "./tamanhos";

describe("parseOutrosTamanhos", () => {
  it("separa por vírgula, faz trim e padStart para 2 dígitos", () => {
    expect(parseOutrosTamanhos("26, 28")).toEqual(["26", "28"]);
    expect(parseOutrosTamanhos("8")).toEqual(["08"]);
  });

  it("ignora vazios e espaços", () => {
    expect(parseOutrosTamanhos("  ")).toEqual([]);
    expect(parseOutrosTamanhos("26, ,")).toEqual(["26"]);
  });

  it("rejeita valor não numérico ou com mais de 2 dígitos, citando o valor", () => {
    expect(() => parseOutrosTamanhos("ab")).toThrow("ab");
    expect(() => parseOutrosTamanhos("170")).toThrow("170");
  });
});

describe("combinarTamanhos", () => {
  it("une e deduplica preservando ordem (marcados primeiro)", () => {
    expect(combinarTamanhos(["14", "16"], ["16", "26"])).toEqual(["14", "16", "26"]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/modelos/tamanhos.test.ts`
Expected: FALHA — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
/**
 * Normalização do campo "Outro tamanho" do cadastro.
 *
 * O tamanho ocupa 2 dígitos no código; valores de 1 dígito são preenchidos com
 * zero à esquerda. Aceita vários valores separados por vírgula ("26, 28").
 */

/** "26, 28" → ["26","28"]. Lança citando o valor inválido. */
export function parseOutrosTamanhos(texto: string): string[] {
  const valores = texto
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  return valores.map((valor) => {
    if (!/^\d{1,2}$/.test(valor)) {
      throw new Error(`Tamanho inválido: "${valor}". Use 1 ou 2 dígitos (ex.: "26").`);
    }
    return valor.padStart(2, "0");
  });
}

/** Une tamanhos marcados e digitados, deduplicando e preservando a ordem. */
export function combinarTamanhos(
  marcados: readonly string[],
  outros: readonly string[],
): string[] {
  return [...new Set([...marcados, ...outros])];
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/lib/modelos/tamanhos.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/modelos/tamanhos.ts src/lib/modelos/tamanhos.test.ts
git commit -m "feat(modelos): lib de parse/combinação de tamanhos (outro tamanho)"
```

---

## Task 4: Lib pura `entradasIniciais` — casa quantidades às variações

**Files:**
- Create: `src/lib/modelos/entradasIniciais.ts`
- Test: `src/lib/modelos/entradasIniciais.test.ts`

**Interfaces:**
- Produces:
  - `interface QuantidadeSku { pedra: string; tamanho: string | null; quantidade: number }`
  - `interface VariacaoComId { id: string; pedra: string | null; tamanho: string | null }`
  - `interface EntradaInicial { variacaoId: string; quantidade: number }`
  - `entradasIniciais(variacoes: readonly VariacaoComId[], quantidades: readonly QuantidadeSku[]): EntradaInicial[]` — casa por (pedra|tamanho); só retorna qtd > 0.

- [ ] **Step 1: Escrever o teste**

```ts
import { describe, expect, it } from "vitest";
import { entradasIniciais } from "./entradasIniciais";

const variacoes = [
  { id: "a", pedra: "01", tamanho: "14" },
  { id: "b", pedra: "01", tamanho: "16" },
  { id: "c", pedra: "06", tamanho: "14" },
];

describe("entradasIniciais", () => {
  it("casa quantidades por pedra+tamanho e ignora qtd 0", () => {
    const entradas = entradasIniciais(variacoes, [
      { pedra: "01", tamanho: "14", quantidade: 2 },
      { pedra: "01", tamanho: "16", quantidade: 0 },
      { pedra: "06", tamanho: "14", quantidade: 3 },
    ]);
    expect(entradas).toEqual([
      { variacaoId: "a", quantidade: 2 },
      { variacaoId: "c", quantidade: 3 },
    ]);
  });

  it("casa variações sem tamanho (brinco) por pedra", () => {
    const entradas = entradasIniciais(
      [{ id: "x", pedra: "01", tamanho: null }],
      [{ pedra: "01", tamanho: null, quantidade: 5 }],
    );
    expect(entradas).toEqual([{ variacaoId: "x", quantidade: 5 }]);
  });

  it("retorna vazio quando nenhuma quantidade é informada", () => {
    expect(entradasIniciais(variacoes, [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/modelos/entradasIniciais.test.ts`
Expected: FALHA — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
/**
 * Casa as quantidades informadas no cadastro às variações recém-inseridas.
 *
 * Cada SKU é identificado por (pedra, tamanho). Só gera entrada para qtd > 0 —
 * SKUs com quantidade 0 existem, mas sem movimentação (saldo 0).
 */

export interface QuantidadeSku {
  pedra: string;
  tamanho: string | null;
  quantidade: number;
}

export interface VariacaoComId {
  id: string;
  pedra: string | null;
  tamanho: string | null;
}

export interface EntradaInicial {
  variacaoId: string;
  quantidade: number;
}

function chave(pedra: string | null, tamanho: string | null): string {
  return `${pedra ?? ""}|${tamanho ?? ""}`;
}

export function entradasIniciais(
  variacoes: readonly VariacaoComId[],
  quantidades: readonly QuantidadeSku[],
): EntradaInicial[] {
  const mapa = new Map<string, number>();
  for (const q of quantidades) mapa.set(chave(q.pedra, q.tamanho), q.quantidade);

  const entradas: EntradaInicial[] = [];
  for (const v of variacoes) {
    const qtd = mapa.get(chave(v.pedra, v.tamanho)) ?? 0;
    if (qtd > 0) entradas.push({ variacaoId: v.id, quantidade: qtd });
  }
  return entradas;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/lib/modelos/entradasIniciais.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/modelos/entradasIniciais.ts src/lib/modelos/entradasIniciais.test.ts
git commit -m "feat(modelos): casa quantidades do cadastro às variações (entradas)"
```

---

## Task 5: Lib `removerImagem` (limpeza de imagem órfã)

**Files:**
- Create: `src/lib/imagens/removerImagem.ts`
- Test: `src/lib/imagens/removerImagem.test.ts`

**Interfaces:**
- Produces:
  - `caminhoArquivoImagem(imagemPath: string): string` — resolve o caminho absoluto a partir de "uploads/x.png".
  - `removerImagem(imagemPath: string): Promise<void>` — apaga best-effort (ignora ENOENT).

- [ ] **Step 1: Escrever o teste (parte pura)**

```ts
import { afterEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import { caminhoArquivoImagem } from "./removerImagem";

describe("caminhoArquivoImagem", () => {
  const original = process.env.UPLOAD_DIR;
  afterEach(() => {
    if (original === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = original;
  });

  it("usa ./uploads como base por padrão", () => {
    delete process.env.UPLOAD_DIR;
    expect(caminhoArquivoImagem("uploads/abc.png")).toBe(join("./uploads", "abc.png"));
  });

  it("respeita UPLOAD_DIR e remove o prefixo uploads/", () => {
    process.env.UPLOAD_DIR = "/var/data/uploads";
    expect(caminhoArquivoImagem("uploads/abc.png")).toBe(join("/var/data/uploads", "abc.png"));
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/imagens/removerImagem.test.ts`
Expected: FALHA — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
/**
 * Remoção do arquivo de imagem de um modelo (usado na deleção física — regra 3).
 * Best-effort: arquivo já ausente (ENOENT) não é erro; outros erros são logados
 * e não abortam o fluxo (o registro no banco já foi apagado).
 */

import { unlink } from "node:fs/promises";
import { join } from "node:path";

function pastaBase(): string {
  return process.env.UPLOAD_DIR ?? "./uploads";
}

/** "uploads/x.png" → caminho absoluto do arquivo no disco. */
export function caminhoArquivoImagem(imagemPath: string): string {
  const nome = imagemPath.replace(/^uploads\//, "");
  return join(pastaBase(), nome);
}

export async function removerImagem(imagemPath: string): Promise<void> {
  try {
    await unlink(caminhoArquivoImagem(imagemPath));
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(
        JSON.stringify({ evento: "remover_imagem_falhou", imagemPath, erro: String(erro) }),
      );
    }
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/lib/imagens/removerImagem.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/imagens/removerImagem.ts src/lib/imagens/removerImagem.test.ts
git commit -m "feat(imagens): removerImagem (limpeza de imagem órfã na exclusão)"
```

---

## Task 6: `validarCadastro` — modelo do fornecedor, quantidades e tamanho custom

**Files:**
- Modify: `src/lib/modelos/validarCadastro.ts`
- Test: `src/lib/modelos/validarCadastro.test.ts`

**Interfaces:**
- Consumes: nada novo.
- Produces: `esquemaCadastroModelo` com campos adicionais:
  - `modeloFornecedor: string | null`
  - `tamanhos: string[]` (qualquer 2 dígitos, não só `TAMANHOS_VALIDOS`)
  - `quantidades: { pedra: string; tamanho: string | null; quantidade: number }[]`
  - cross-check: toda `quantidade > 0` referencia pedra selecionada e (tamanho selecionado ou null).

- [ ] **Step 1: Escrever os testes novos**

Adicionar em `src/lib/modelos/validarCadastro.test.ts` (mantendo o `base` existente e acrescentando `quantidades`/`modeloFornecedor` onde necessário):

```ts
  it("aceita modelo do fornecedor e o normaliza para null quando vazio", () => {
    expect(esquemaCadastroModelo.parse({ ...base }).modeloFornecedor).toBeNull();
    expect(
      esquemaCadastroModelo.parse({ ...base, modeloFornecedor: "  REF-123 " }).modeloFornecedor,
    ).toBe("REF-123");
  });

  it("aceita tamanho fora da lista de sugestões (2 dígitos)", () => {
    expect(esquemaCadastroModelo.safeParse({ ...base, tamanhos: ["17"] }).success).toBe(true);
    expect(esquemaCadastroModelo.safeParse({ ...base, tamanhos: ["7"] }).success).toBe(false);
  });

  it("aceita quantidades para SKUs selecionados", () => {
    const r = esquemaCadastroModelo.safeParse({
      ...base,
      pedras: ["06"],
      tamanhos: ["18"],
      quantidades: [{ pedra: "06", tamanho: "18", quantidade: 3 }],
    });
    expect(r.success).toBe(true);
  });

  it("rejeita quantidade > 0 para SKU não selecionado", () => {
    const r = esquemaCadastroModelo.safeParse({
      ...base,
      pedras: ["06"],
      tamanhos: ["18"],
      quantidades: [{ pedra: "01", tamanho: "18", quantidade: 3 }],
    });
    expect(r.success).toBe(false);
  });

  it("default de quantidades é lista vazia", () => {
    expect(esquemaCadastroModelo.parse({ ...base }).quantidades).toEqual([]);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/modelos/validarCadastro.test.ts`
Expected: FALHA — campos ainda não existem; `tamanhos: ["17"]` hoje é rejeitado.

- [ ] **Step 3: Implementar**

Em `src/lib/modelos/validarCadastro.ts`, remover o uso de `TAMANHOS_VALIDOS`/`TODOS_TAMANHOS` para tamanhos e adicionar os campos. Ajustar imports:

```ts
import { z } from "zod";
import { PEDRAS, TIPOS, type TipoCodigo } from "@/lib/codigo/referencia";
```

Adicionar o sub-esquema de quantidade antes do `esquemaCadastroModelo`:

```ts
const DOIS_DIGITOS = /^\d{2}$/;

const quantidadeSku = z.object({
  pedra: z.string().regex(DOIS_DIGITOS),
  tamanho: z.union([z.string().regex(DOIS_DIGITOS), z.null()]),
  quantidade: z.number().int().min(0),
});
```

Trocar o campo `tamanhos`, e acrescentar `modeloFornecedor` e `quantidades`, e o cross-check `.superRefine` no objeto:

```ts
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
```

Remover a constante `TODOS_TAMANHOS` (ficou sem uso).

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/lib/modelos/validarCadastro.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/modelos/validarCadastro.ts src/lib/modelos/validarCadastro.test.ts
git commit -m "feat(cadastro): validação de quantidades, modelo do fornecedor e tamanho custom"
```

---

## Task 7: `cadastrarModelo` grava entradas e modelo do fornecedor

Serviço que toca o banco (verificado rodando o app; sem mock de DB, por convenção do repo). A parte pura (casamento) já é testada na Task 4.

**Files:**
- Modify: `src/lib/modelos/cadastrarModelo.ts`

**Interfaces:**
- Consumes: `entradasIniciais` (Task 4), `movimentacoes` schema.
- Produces: `EntradaCadastroModelo` com `modeloFornecedor: string | null` e `quantidades: readonly QuantidadeSku[]`; `cadastrarModelo` insere entradas na mesma transação.

- [ ] **Step 1: Estender a interface de entrada**

Em `src/lib/modelos/cadastrarModelo.ts`, atualizar imports e a interface:

```ts
import { movimentacoes, modelos, variacoes } from "@/db/schema";
import { entradasIniciais, type QuantidadeSku } from "./entradasIniciais";
```

```ts
export interface EntradaCadastroModelo {
  tipo: TipoCodigo;
  descricao: string | null;
  modeloFornecedor: string | null;
  precoCusto: string | null;
  precoVenda: string | null;
  imagemPath: string | null;
  colecaoId: string | null;
  fornecedorId: string | null;
  pedras: readonly string[];
  tamanhos: readonly string[];
  quantidades: readonly QuantidadeSku[];
}
```

- [ ] **Step 2: Inserir modelo com `modeloFornecedor` e gravar entradas**

Substituir o corpo da transação (inserção do modelo, das variações e das entradas):

```ts
    const [modelo] = await tx
      .insert(modelos)
      .values({
        tipo: entrada.tipo,
        sequencial,
        descricao: entrada.descricao,
        modeloFornecedor: entrada.modeloFornecedor,
        precoCusto: entrada.precoCusto,
        precoVenda: entrada.precoVenda,
        imagemPath: entrada.imagemPath,
        colecaoId: entrada.colecaoId,
        fornecedorId: entrada.fornecedorId,
      })
      .returning({ id: modelos.id });

    const variacoesInseridas = await tx
      .insert(variacoes)
      .values(
        variacoesGeradas.map((v) => ({
          modeloId: modelo.id,
          pedra: v.pedra,
          tamanho: v.tamanho,
          codigo: v.codigo,
        })),
      )
      .returning({ id: variacoes.id, pedra: variacoes.pedra, tamanho: variacoes.tamanho });

    const entradas = entradasIniciais(variacoesInseridas, entrada.quantidades);
    if (entradas.length > 0) {
      await tx.insert(movimentacoes).values(
        entradas.map((e) => ({
          variacaoId: e.variacaoId,
          tipoMov: "entrada" as const,
          quantidade: e.quantidade,
          origem: "manual" as const,
          observacao: "Cadastro inicial",
          colecaoId: entrada.colecaoId,
          fornecedorId: entrada.fornecedorId,
        })),
      );
    }

    return {
      modeloId: modelo.id,
      sequencial,
      codigos: variacoesGeradas.map((v) => v.codigo),
    };
```

- [ ] **Step 3: Verificar tipos/compilação**

Run: `npm run lint && npm test -- src/lib/modelos`
Expected: sem erros; testes de lib passam.

- [ ] **Step 4: Commit**

```bash
git add src/lib/modelos/cadastrarModelo.ts
git commit -m "feat(cadastro): grava entradas por SKU e modelo do fornecedor na mesma transação"
```

---

## Task 8: API POST `/api/modelos` — receber quantidades e modelo do fornecedor

**Files:**
- Modify: `src/app/api/modelos/route.ts`

**Interfaces:**
- Consumes: `esquemaCadastroModelo` (Task 6), `cadastrarModelo` (Task 7).
- Produces: aceita form fields `modeloFornecedor` (texto) e `quantidades` (JSON string de `QuantidadeSku[]`).

- [ ] **Step 1: Ler o guia do Next**

Ler `node_modules/next/dist/docs/` sobre Route Handlers antes de editar (AGENTS.md).

- [ ] **Step 2: Parsear os novos campos**

Em `src/app/api/modelos/route.ts`, no `safeParse`, acrescentar:

```ts
  const quantidadesBruto = form.get("quantidades");
  let quantidades: unknown = [];
  try {
    quantidades = quantidadesBruto ? JSON.parse(String(quantidadesBruto)) : [];
  } catch {
    return NextResponse.json({ erro: "Campo 'quantidades' inválido (JSON)." }, { status: 422 });
  }

  const parsed = esquemaCadastroModelo.safeParse({
    tipo: form.get("tipo"),
    descricao: form.get("descricao"),
    modeloFornecedor: form.get("modeloFornecedor"),
    precoCusto: form.get("precoCusto"),
    precoVenda: form.get("precoVenda"),
    colecaoId: form.get("colecaoId"),
    fornecedorId: form.get("fornecedorId"),
    pedras: form.getAll("pedras").map(String),
    tamanhos: form.getAll("tamanhos").map(String),
    quantidades,
  });
```

E na chamada de `cadastrarModelo`, repassar:

```ts
    const resultado = await cadastrarModelo(db, {
      tipo: parsed.data.tipo,
      descricao: parsed.data.descricao,
      modeloFornecedor: parsed.data.modeloFornecedor,
      precoCusto: parsed.data.precoCusto,
      precoVenda: parsed.data.precoVenda,
      imagemPath,
      colecaoId: parsed.data.colecaoId,
      fornecedorId: parsed.data.fornecedorId,
      pedras: parsed.data.pedras,
      tamanhos: parsed.data.tamanhos,
      quantidades: parsed.data.quantidades,
    });
```

- [ ] **Step 3: Verificar compilação**

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/modelos/route.ts
git commit -m "feat(api): POST /api/modelos aceita quantidades e modelo do fornecedor"
```

---

## Task 9: `excluirProduto` remove a imagem órfã

**Files:**
- Modify: `src/lib/produtos/alterarProduto.ts`

**Interfaces:**
- Consumes: `removerImagem` (Task 5).
- Produces: `excluirProduto` apaga o arquivo de imagem após o commit; `definirAtivoProduto` não muda.

- [ ] **Step 1: Ler o `imagemPath` antes de apagar e remover o arquivo após o commit**

Em `src/lib/produtos/alterarProduto.ts`, importar e reescrever `excluirProduto`:

```ts
import { eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, movimentacoes, variacoes } from "@/db/schema";
import { removerImagem } from "@/lib/imagens/removerImagem";
```

```ts
export async function excluirProduto(db: Database, modeloId: string): Promise<void> {
  const imagemPath = await db.transaction(async (tx) => {
    if ((await qtdMovimentacoes(tx, modeloId)) > 0) {
      throw new Error(
        `Produto ${modeloId} já teve movimentação; não pode ser excluído. Inative-o.`,
      );
    }
    const [modelo] = await tx
      .select({ imagemPath: modelos.imagemPath })
      .from(modelos)
      .where(eq(modelos.id, modeloId));
    if (!modelo) {
      throw new Error(`Produto não encontrado: ${modeloId}.`);
    }
    await tx.delete(variacoes).where(eq(variacoes.modeloId, modeloId));
    await tx.delete(modelos).where(eq(modelos.id, modeloId));
    return modelo.imagemPath;
  });

  // Fora da transação: apagar o arquivo não deve abortar a exclusão no banco.
  if (imagemPath) await removerImagem(imagemPath);
}
```

- [ ] **Step 2: Verificar compilação e libs**

Run: `npm run lint && npm test -- src/lib/imagens`
Expected: sem erros; testes de `removerImagem` passam.

- [ ] **Step 3: Commit**

```bash
git add src/lib/produtos/alterarProduto.ts
git commit -m "fix(produtos): exclusão física remove também o arquivo de imagem órfão"
```

---

## Task 10: Componente `GradeSkusQuantidade`

Componente cliente que deriva os SKUs (pedra × tamanho, incl. "outro tamanho") e coleta a quantidade de cada um. Verificado rodando o app.

**Files:**
- Create: `src/components/GradeSkusQuantidade.tsx`

**Interfaces:**
- Consumes: `parseOutrosTamanhos`, `combinarTamanhos` (Task 3); `PEDRAS`, `Pedra`.
- Produces:
  - `interface QuantidadesPorChave { [chave: string]: number }` onde `chave = ` `` `${pedra}|${tamanho ?? ""}` ``
  - `interface SkuLinha { pedra: string; tamanho: string | null; rotulo: string }`
  - `montarSkus(pedras: string[], tamanhos: string[], temTamanho: boolean, pedrasRef: readonly Pedra[]): SkuLinha[]`
  - `chaveSku(pedra: string, tamanho: string | null): string`
  - componente `<GradeSkusQuantidade pedras tamanhos temTamanho pedrasRef quantidades onChange outrosTamanhos onAddOutro />`

- [ ] **Step 1: Implementar o componente**

```tsx
"use client";

/**
 * Grade de SKUs (pedra × tamanho) com quantidade por linha, para o cadastro.
 * Deriva as linhas das pedras/tamanhos selecionados + "outro tamanho" digitado.
 * Quantidade 0 é permitida (o SKU é criado sem movimentação).
 */

import { useState } from "react";
import type { Pedra } from "@/lib/codigo/referencia";
import { parseOutrosTamanhos } from "@/lib/modelos/tamanhos";

export interface SkuLinha {
  pedra: string;
  tamanho: string | null;
  rotulo: string;
}

export function chaveSku(pedra: string, tamanho: string | null): string {
  return `${pedra}|${tamanho ?? ""}`;
}

export function montarSkus(
  pedras: readonly string[],
  tamanhos: readonly string[],
  temTamanho: boolean,
  pedrasRef: readonly Pedra[],
): SkuLinha[] {
  const nomePedra = (c: string) => pedrasRef.find((p) => p.codigo === c)?.descricao ?? c;
  if (!temTamanho) {
    return pedras.map((pedra) => ({
      pedra,
      tamanho: null,
      rotulo: nomePedra(pedra),
    }));
  }
  return pedras.flatMap((pedra) =>
    tamanhos.map((tamanho) => ({
      pedra,
      tamanho,
      rotulo: `${nomePedra(pedra)} · ${tamanho}cm`,
    })),
  );
}

interface Props {
  pedras: readonly string[];
  tamanhos: readonly string[]; // já combinados (marcados + outros)
  temTamanho: boolean;
  pedrasRef: readonly Pedra[];
  quantidades: Record<string, number>;
  onChangeQuantidade: (chave: string, valor: number) => void;
  onAdicionarOutrosTamanhos: (tamanhos: string[]) => void;
}

export function GradeSkusQuantidade({
  pedras,
  tamanhos,
  temTamanho,
  pedrasRef,
  quantidades,
  onChangeQuantidade,
  onAdicionarOutrosTamanhos,
}: Props) {
  const [outro, setOutro] = useState("");
  const [erroOutro, setErroOutro] = useState<string | null>(null);
  const skus = montarSkus(pedras, tamanhos, temTamanho, pedrasRef);

  function adicionarOutro() {
    setErroOutro(null);
    try {
      const novos = parseOutrosTamanhos(outro);
      if (novos.length > 0) onAdicionarOutrosTamanhos(novos);
      setOutro("");
    } catch (e) {
      setErroOutro(e instanceof Error ? e.message : "Tamanho inválido.");
    }
  }

  const totalPecas = skus.reduce((s, k) => s + (quantidades[chaveSku(k.pedra, k.tamanho)] ?? 0), 0);

  return (
    <div className="space-y-3">
      {temTamanho && (
        <div className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col gap-1">
            <span className="font-medium">Outro tamanho</span>
            <input
              type="text"
              value={outro}
              onChange={(e) => setOutro(e.target.value)}
              placeholder="Ex.: 26 ou 26, 28"
              className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
          </label>
          <button
            type="button"
            onClick={adicionarOutro}
            className="rounded border border-amber-600 px-4 py-2 font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
          >
            Adicionar tamanho
          </button>
          {erroOutro && <span className="text-red-600">{erroOutro}</span>}
        </div>
      )}

      {skus.length === 0 ? (
        <p className="text-sm text-gray-500">
          Selecione ao menos uma pedra{temTamanho ? " e um tamanho" : ""} para informar quantidades.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left dark:bg-gray-900">
              <tr>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 text-right font-medium">Quantidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {skus.map((k) => {
                const chave = chaveSku(k.pedra, k.tamanho);
                return (
                  <tr key={chave}>
                    <td className="px-3 py-2">{k.rotulo}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={quantidades[chave] ?? 0}
                        onChange={(e) =>
                          onChangeQuantidade(chave, Math.max(0, Math.floor(Number(e.target.value) || 0)))
                        }
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-right dark:border-gray-700 dark:bg-gray-800"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 font-medium dark:border-gray-800">
                <td className="px-3 py-2">{skus.length} SKU(s)</td>
                <td className="px-3 py-2 text-right">{totalPecas} peça(s)</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/GradeSkusQuantidade.tsx
git commit -m "feat(cadastro): grade de SKUs com quantidade e outro tamanho"
```

---

## Task 11: Componente `ModalConfirmacaoCadastro`

**Files:**
- Create: `src/components/ModalConfirmacaoCadastro.tsx`

**Interfaces:**
- Consumes: `SkuLinha`/`chaveSku` (Task 10).
- Produces:
  - `interface ResumoCadastro { tipoNome: string; descricao: string; modeloFornecedor: string | null; precoCusto: string; precoVenda: string; colecaoNome: string; fornecedorNome: string; imagemPreview: string | null; skus: { rotulo: string; quantidade: number }[]; }`
  - `<ModalConfirmacaoCadastro resumo aoConfirmar aoCancelar enviando />`

- [ ] **Step 1: Implementar o componente**

```tsx
"use client";

/**
 * Popup de confirmação: revisa todos os dados antes de gravar (cadastro/edição).
 * Nada é enviado ao servidor até o usuário confirmar. Esc = "voltar e corrigir".
 */

import { useEffect } from "react";

export interface ResumoSku {
  rotulo: string;
  quantidade: number;
}

export interface ResumoCadastro {
  tipoNome: string;
  descricao: string;
  modeloFornecedor: string | null;
  precoCusto: string;
  precoVenda: string;
  colecaoNome: string;
  fornecedorNome: string;
  imagemPreview: string | null;
  skus: ResumoSku[];
}

interface Props {
  resumo: ResumoCadastro;
  enviando: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

export function ModalConfirmacaoCadastro({ resumo, enviando, aoConfirmar, aoCancelar }: Props) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !enviando) aoCancelar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoCancelar, enviando]);

  const totalPecas = resumo.skus.reduce((s, k) => s + k.quantidade, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar cadastro"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="text-lg font-semibold">Confirme os dados</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">Tipo</dt>
          <dd>{resumo.tipoNome}</dd>
          <dt className="text-gray-500">Descrição</dt>
          <dd>{resumo.descricao}</dd>
          <dt className="text-gray-500">Modelo do fornecedor</dt>
          <dd>{resumo.modeloFornecedor ?? "—"}</dd>
          <dt className="text-gray-500">Preço de custo</dt>
          <dd>{resumo.precoCusto}</dd>
          <dt className="text-gray-500">Preço de venda</dt>
          <dd>{resumo.precoVenda}</dd>
          <dt className="text-gray-500">Coleção</dt>
          <dd>{resumo.colecaoNome}</dd>
          <dt className="text-gray-500">Fornecedor</dt>
          <dd>{resumo.fornecedorNome}</dd>
        </dl>

        {resumo.imagemPreview && (
          // eslint-disable-next-line @next/next/no-img-element -- preview local (blob) ou caminho relativo
          <img
            src={resumo.imagemPreview}
            alt="Imagem do modelo"
            className="mt-4 h-20 w-20 rounded border border-gray-300 object-cover dark:border-gray-700"
          />
        )}

        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="py-1 font-medium">SKU</th>
              <th className="py-1 text-right font-medium">Qtd</th>
            </tr>
          </thead>
          <tbody>
            {resumo.skus.map((k) => (
              <tr key={k.rotulo}>
                <td className="py-1">{k.rotulo}</td>
                <td className="py-1 text-right">{k.quantidade}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 font-medium dark:border-gray-700">
              <td className="py-1">{resumo.skus.length} SKU(s)</td>
              <td className="py-1 text-right">{totalPecas} peça(s)</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={aoCancelar}
            disabled={enviando}
            className="rounded border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Voltar e corrigir
          </button>
          <button
            type="button"
            onClick={aoConfirmar}
            disabled={enviando}
            className="rounded bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {enviando ? "Gravando..." : "Confirmar e gravar"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/ModalConfirmacaoCadastro.tsx
git commit -m "feat(cadastro): modal de confirmação antes de gravar"
```

---

## Task 12: Refatorar `FormularioCadastroModelo` (modo criar) integrando grade + modal + campos novos

**Files:**
- Modify: `src/components/FormularioCadastroModelo.tsx`

**Interfaces:**
- Consumes: `GradeSkusQuantidade`, `chaveSku`, `montarSkus` (Task 10); `ModalConfirmacaoCadastro`, `ResumoCadastro` (Task 11); `combinarTamanhos` (Task 3).
- Produces: formulário que abre o modal no submit e envia `quantidades` (JSON) + `modeloFornecedor` na confirmação.

- [ ] **Step 1: Reescrever o componente (modo criar)**

Substituir `src/components/FormularioCadastroModelo.tsx` por (mantendo os campos existentes; adicionando estado de tamanhos/pedras/quantidades, campo "Modelo do fornecedor", a grade e o modal):

```tsx
"use client";

/**
 * Formulário de cadastro de modelo (tela 7.1).
 * Coleta atributos + seleção de pedras/tamanhos + quantidade por SKU e, ao
 * submeter, abre o modal de confirmação. O POST só ocorre após confirmar.
 */

import { useMemo, useRef, useState } from "react";
import { decodificarLegivel } from "@/lib/codigo/codigo";
import type { Pedra, Tipo } from "@/lib/codigo/referencia";
import { combinarTamanhos } from "@/lib/modelos/tamanhos";
import {
  GradeSkusQuantidade,
  chaveSku,
  montarSkus,
} from "@/components/GradeSkusQuantidade";
import {
  ModalConfirmacaoCadastro,
  type ResumoCadastro,
} from "@/components/ModalConfirmacaoCadastro";

interface Colecao {
  id: string;
  nome: string;
  data: string;
}
interface Fornecedor {
  id: string;
  nome: string;
}
interface Props {
  tipos: readonly Tipo[];
  pedras: readonly Pedra[];
  tamanhosPorTipo: Record<number, readonly string[]>;
  colecoes: readonly Colecao[];
  fornecedores: readonly Fornecedor[];
}
interface RespostaSucesso {
  modeloId: string;
  sequencial: string;
  codigos: string[];
}

export function FormularioCadastroModelo({
  tipos,
  pedras,
  tamanhosPorTipo,
  colecoes,
  fornecedores,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState<number>(tipos[0]?.codigo ?? 1);
  const [pedrasSel, setPedrasSel] = useState<string[]>([]);
  const [tamanhosSel, setTamanhosSel] = useState<string[]>([]);
  const [outrosTamanhos, setOutrosTamanhos] = useState<string[]>([]);
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<RespostaSucesso | null>(null);
  const [previewImagem, setPreviewImagem] = useState<string | null>(null);
  const [resumo, setResumo] = useState<ResumoCadastro | null>(null);

  const tipoSelecionado = tipos.find((t) => t.codigo === tipo);
  const temTamanho = Boolean(tipoSelecionado?.temTamanho);
  const tamanhosDoTipo = useMemo(() => tamanhosPorTipo[tipo] ?? [], [tamanhosPorTipo, tipo]);
  const tamanhos = useMemo(
    () => combinarTamanhos(tamanhosSel, outrosTamanhos),
    [tamanhosSel, outrosTamanhos],
  );

  function aoEscolherImagem(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0] ?? null;
    setPreviewImagem((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return arquivo ? URL.createObjectURL(arquivo) : null;
    });
  }

  function alternar(lista: string[], valor: string): string[] {
    return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
  }

  function abrirConfirmacao(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const form = evento.currentTarget;
    const dados = new FormData(form);
    const nomeColecao = colecoes.find((c) => c.id === dados.get("colecaoId"))?.nome ?? "";
    const nomeFornecedor = fornecedores.find((f) => f.id === dados.get("fornecedorId"))?.nome ?? "";
    const skus = montarSkus(pedrasSel, tamanhos, temTamanho, pedras).map((k) => ({
      rotulo: k.rotulo,
      quantidade: quantidades[chaveSku(k.pedra, k.tamanho)] ?? 0,
    }));
    setResumo({
      tipoNome: tipoSelecionado?.descricao ?? String(tipo),
      descricao: String(dados.get("descricao") ?? ""),
      modeloFornecedor: (String(dados.get("modeloFornecedor") ?? "").trim() || null),
      precoCusto: String(dados.get("precoCusto") ?? ""),
      precoVenda: String(dados.get("precoVenda") ?? ""),
      colecaoNome: nomeColecao,
      fornecedorNome: nomeFornecedor,
      imagemPreview: previewImagem,
      skus,
    });
  }

  function quantidadesSelecionadas() {
    const skus = montarSkus(pedrasSel, tamanhos, temTamanho, pedras);
    return skus.map((k) => ({
      pedra: k.pedra,
      tamanho: k.tamanho,
      quantidade: quantidades[chaveSku(k.pedra, k.tamanho)] ?? 0,
    }));
  }

  async function confirmar() {
    if (!formRef.current) return;
    setEnviando(true);
    setErro(null);
    const dados = new FormData(formRef.current);
    pedrasSel.forEach((p) => dados.append("pedras", p));
    tamanhos.forEach((t) => dados.append("tamanhos", t));
    dados.set("quantidades", JSON.stringify(quantidadesSelecionadas()));

    const resposta = await fetch("/api/modelos", { method: "POST", body: dados });
    const corpo = await resposta.json();
    setEnviando(false);
    setResumo(null);
    if (!resposta.ok) {
      setErro(corpo.erro ?? "Falha ao cadastrar.");
      return;
    }
    setSucesso(corpo as RespostaSucesso);
    formRef.current.reset();
    setPedrasSel([]);
    setTamanhosSel([]);
    setOutrosTamanhos([]);
    setQuantidades({});
    setPreviewImagem((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return null;
    });
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} onSubmit={abrirConfirmacao} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Tipo</span>
            <select
              name="tipo"
              value={tipo}
              onChange={(e) => {
                setTipo(Number(e.target.value));
                setTamanhosSel([]);
                setOutrosTamanhos([]);
                setQuantidades({});
              }}
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            >
              {tipos.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.descricao}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">
              Descrição <span className="text-red-600">*</span>
            </span>
            <input
              name="descricao"
              type="text"
              maxLength={500}
              required
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Modelo do fornecedor</span>
            <input
              name="modeloFornecedor"
              type="text"
              maxLength={200}
              placeholder="Referência do fornecedor (opcional)"
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">
              Preço de custo <span className="text-red-600">*</span>
            </span>
            <input
              name="precoCusto"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              required
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">
              Preço de venda <span className="text-red-600">*</span>
            </span>
            <input
              name="precoVenda"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              required
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">
              Coleção <span className="text-red-600">*</span>
            </span>
            <select
              name="colecaoId"
              required
              defaultValue=""
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="" disabled>
                Selecione…
              </option>
              {colecoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.data.split("-").reverse().join("/")})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">
              Fornecedor <span className="text-red-600">*</span>
            </span>
            <select
              name="fornecedorId"
              required
              defaultValue=""
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="" disabled>
                Selecione…
              </option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        {(colecoes.length === 0 || fornecedores.length === 0) && (
          <p className="text-xs text-gray-500">
            Cadastre antes em{" "}
            <a href="/colecoes" className="underline">
              Coleções
            </a>{" "}
            e{" "}
            <a href="/fornecedores" className="underline">
              Fornecedores
            </a>
            .
          </p>
        )}

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium">
            Imagem do modelo <span className="text-red-600">*</span>
          </span>
          <div className="flex items-center gap-4">
            {previewImagem ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview local (blob)
              <img
                src={previewImagem}
                alt="Pré-visualização da imagem do modelo"
                className="h-20 w-20 rounded border border-gray-300 object-cover dark:border-gray-700"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400 dark:border-gray-700">
                sem imagem
              </div>
            )}
            <label className="cursor-pointer rounded border border-amber-600 px-4 py-2 font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950">
              {previewImagem ? "Trocar imagem" : "Selecionar imagem"}
              <input
                name="imagem"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                onChange={aoEscolherImagem}
                className="sr-only"
              />
            </label>
          </div>
          <span className="text-xs text-gray-500">JPG, PNG ou WEBP, até 5 MB.</span>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Pedras</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {pedras.map((p) => (
              <label key={p.codigo} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pedrasSel.includes(p.codigo)}
                  onChange={() => setPedrasSel((atual) => alternar(atual, p.codigo))}
                />
                <span>
                  {p.codigo} · {p.descricao}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {temTamanho ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tamanhos (cm)</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {tamanhosDoTipo.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tamanhosSel.includes(t)}
                    onChange={() => setTamanhosSel((atual) => alternar(atual, t))}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="text-sm text-gray-500">{tipoSelecionado?.descricao} não tem tamanho.</p>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Quantidades por SKU</legend>
          <GradeSkusQuantidade
            pedras={pedrasSel}
            tamanhos={tamanhos}
            temTamanho={temTamanho}
            pedrasRef={pedras}
            quantidades={quantidades}
            onChangeQuantidade={(chave, valor) =>
              setQuantidades((atual) => ({ ...atual, [chave]: valor }))
            }
            onAdicionarOutrosTamanhos={(novos) =>
              setOutrosTamanhos((atual) => [...new Set([...atual, ...novos])])
            }
          />
        </fieldset>

        <button
          type="submit"
          className="rounded bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Revisar e cadastrar
        </button>
      </form>

      {resumo && (
        <ModalConfirmacaoCadastro
          resumo={resumo}
          enviando={enviando}
          aoConfirmar={confirmar}
          aoCancelar={() => setResumo(null)}
        />
      )}

      {erro && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="space-y-2 rounded border border-green-300 bg-green-50 px-4 py-3 text-sm dark:bg-green-950">
          <p className="font-medium">
            Modelo cadastrado · sequencial {sucesso.sequencial} · {sucesso.codigos.length} variação(ões):
          </p>
          <ul className="space-y-1">
            {sucesso.codigos.map((codigo) => (
              <li key={codigo} className="font-mono">
                {codigo} — {decodificarLegivel(codigo)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 3: Verificar rodando o app (cadastro real)**

Run:
```bash
npm run db:up
npm run dev
```
Testar em `/cadastro`: preencher Anel, marcar pedra Cristal, tamanhos 14/16, adicionar "outro tamanho" 26, informar quantidades (incl. uma 0), clicar "Revisar e cadastrar" → conferir o modal → "Confirmar e gravar". Depois verificar em Produtos/Catálogo o saldo dos SKUs com qtd > 0 e o modelo do fornecedor.
Expected: modelo criado; entradas gravadas só para qtd > 0; SKU com qtd 0 aparece com saldo 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/FormularioCadastroModelo.tsx
git commit -m "feat(cadastro): quantidades por SKU, modelo do fornecedor, outro tamanho e confirmação"
```

---

# PARTE 2 — Editar cadastro

## Task 13: Query `buscarModeloParaEdicao`

**Files:**
- Create: `src/lib/modelos/buscarModeloParaEdicao.ts`

**Interfaces:**
- Produces:
  - `interface VariacaoEdicao { id: string; pedra: string | null; tamanho: string | null; codigo: string; saldo: number; teveMovimentacao: boolean }`
  - `interface ModeloEdicao { id: string; tipo: TipoCodigo; sequencial: string; codigoBase: string; descricao: string | null; modeloFornecedor: string | null; precoCusto: string | null; precoVenda: string | null; imagemPath: string | null; colecaoId: string | null; fornecedorId: string | null; variacoes: VariacaoEdicao[] }`
  - `buscarModeloParaEdicao(db: Database, modeloId: string): Promise<ModeloEdicao | null>`

- [ ] **Step 1: Implementar a query**

```ts
/**
 * Carrega um modelo e suas variações (com saldo e flag de movimentação) para a
 * tela de edição. `teveMovimentacao` define se um SKU pode ser removido (regra 3).
 */

import { asc, eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, variacoes } from "@/db/schema";
import { montarCodigoBase } from "@/lib/codigo/codigo";
import type { TipoCodigo } from "@/lib/codigo/referencia";

export interface VariacaoEdicao {
  id: string;
  pedra: string | null;
  tamanho: string | null;
  codigo: string;
  saldo: number;
  teveMovimentacao: boolean;
}

export interface ModeloEdicao {
  id: string;
  tipo: TipoCodigo;
  sequencial: string;
  codigoBase: string;
  descricao: string | null;
  modeloFornecedor: string | null;
  precoCusto: string | null;
  precoVenda: string | null;
  imagemPath: string | null;
  colecaoId: string | null;
  fornecedorId: string | null;
  variacoes: VariacaoEdicao[];
}

export async function buscarModeloParaEdicao(
  db: Database,
  modeloId: string,
): Promise<ModeloEdicao | null> {
  const [modelo] = await db.select().from(modelos).where(eq(modelos.id, modeloId));
  if (!modelo) return null;

  const saldo = sql<number>`(
    select coalesce(sum(case when mv.tipo_mov = 'entrada' then mv.quantidade
                             when mv.tipo_mov = 'saida'   then -mv.quantidade end), 0)
    from movimentacoes mv where mv.variacao_id = ${variacoes.id})`;
  const teve = sql<boolean>`exists (
    select 1 from movimentacoes mv where mv.variacao_id = ${variacoes.id})`;

  const linhas = await db
    .select({
      id: variacoes.id,
      pedra: variacoes.pedra,
      tamanho: variacoes.tamanho,
      codigo: variacoes.codigo,
      saldo,
      teve,
    })
    .from(variacoes)
    .where(eq(variacoes.modeloId, modeloId))
    .orderBy(asc(variacoes.codigo));

  const tipo = modelo.tipo as TipoCodigo;
  return {
    id: modelo.id,
    tipo,
    sequencial: modelo.sequencial,
    codigoBase: montarCodigoBase(tipo, modelo.sequencial),
    descricao: modelo.descricao,
    modeloFornecedor: modelo.modeloFornecedor,
    precoCusto: modelo.precoCusto,
    precoVenda: modelo.precoVenda,
    imagemPath: modelo.imagemPath,
    colecaoId: modelo.colecaoId,
    fornecedorId: modelo.fornecedorId,
    variacoes: linhas.map((l) => ({
      id: l.id,
      pedra: l.pedra,
      tamanho: l.tamanho,
      codigo: l.codigo,
      saldo: Number(l.saldo),
      teveMovimentacao: Boolean(l.teve),
    })),
  };
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/modelos/buscarModeloParaEdicao.ts
git commit -m "feat(edicao): query de modelo + variações (saldo/flag) para edição"
```

---

## Task 14: Serviço `alterarModelo`

**Files:**
- Create: `src/lib/modelos/alterarModelo.ts`

**Interfaces:**
- Consumes: `entradasIniciais` (Task 4), `montarCodigo`.
- Produces:
  - `interface NovoSku { pedra: string; tamanho: string | null; quantidade: number }`
  - `interface AlteracaoModelo { descricao: string | null; modeloFornecedor: string | null; precoCusto: string | null; precoVenda: string | null; imagemPath?: string | null; colecaoId: string | null; fornecedorId: string | null; novosSkus: readonly NovoSku[]; removerVariacaoIds: readonly string[] }`
  - `alterarModelo(db: Database, modeloId: string, alteracao: AlteracaoModelo): Promise<void>`

- [ ] **Step 1: Implementar o serviço**

```ts
/**
 * Edição de um modelo (tela Produtos → Editar).
 * - Atualiza atributos; imagem só é trocada se `imagemPath` for informado.
 * - Adiciona novos SKUs (com quantidade de entrada, herdando coleção/fornecedor).
 * - Remove SKUs somente se nunca tiveram movimentação (revalidado no servidor).
 * Tipo e sequencial (logo, o código) são imutáveis.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, movimentacoes, variacoes } from "@/db/schema";
import { montarCodigo } from "@/lib/codigo/codigo";
import type { TipoCodigo } from "@/lib/codigo/referencia";
import { entradasIniciais } from "./entradasIniciais";

export interface NovoSku {
  pedra: string;
  tamanho: string | null;
  quantidade: number;
}

export interface AlteracaoModelo {
  descricao: string | null;
  modeloFornecedor: string | null;
  precoCusto: string | null;
  precoVenda: string | null;
  imagemPath?: string | null; // undefined = manter imagem atual
  colecaoId: string | null;
  fornecedorId: string | null;
  novosSkus: readonly NovoSku[];
  removerVariacaoIds: readonly string[];
}

type Transacao = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function garantirRemoviveis(tx: Transacao, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const [linha] = await tx
    .select({ qtd: sql<number>`count(*)` })
    .from(movimentacoes)
    .where(inArray(movimentacoes.variacaoId, [...ids]));
  if (Number(linha?.qtd ?? 0) > 0) {
    throw new Error("Um ou mais SKUs marcados para remoção já tiveram movimentação.");
  }
}

export async function alterarModelo(
  db: Database,
  modeloId: string,
  alteracao: AlteracaoModelo,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [modelo] = await tx.select().from(modelos).where(eq(modelos.id, modeloId));
    if (!modelo) throw new Error(`Produto não encontrado: ${modeloId}.`);

    await tx
      .update(modelos)
      .set({
        descricao: alteracao.descricao,
        modeloFornecedor: alteracao.modeloFornecedor,
        precoCusto: alteracao.precoCusto,
        precoVenda: alteracao.precoVenda,
        colecaoId: alteracao.colecaoId,
        fornecedorId: alteracao.fornecedorId,
        ...(alteracao.imagemPath !== undefined ? { imagemPath: alteracao.imagemPath } : {}),
      })
      .where(eq(modelos.id, modeloId));

    await garantirRemoviveis(tx, alteracao.removerVariacaoIds);
    if (alteracao.removerVariacaoIds.length > 0) {
      await tx.delete(variacoes).where(
        and(
          eq(variacoes.modeloId, modeloId),
          inArray(variacoes.id, [...alteracao.removerVariacaoIds]),
        ),
      );
    }

    if (alteracao.novosSkus.length > 0) {
      const tipo = modelo.tipo as TipoCodigo;
      const inseridas = await tx
        .insert(variacoes)
        .values(
          alteracao.novosSkus.map((s) => ({
            modeloId,
            pedra: s.pedra,
            tamanho: s.tamanho,
            codigo: montarCodigo({
              tipo,
              sequencial: modelo.sequencial,
              pedra: s.pedra,
              tamanho: s.tamanho,
            }),
          })),
        )
        .returning({ id: variacoes.id, pedra: variacoes.pedra, tamanho: variacoes.tamanho });

      const entradas = entradasIniciais(inseridas, alteracao.novosSkus);
      if (entradas.length > 0) {
        await tx.insert(movimentacoes).values(
          entradas.map((e) => ({
            variacaoId: e.variacaoId,
            tipoMov: "entrada" as const,
            quantidade: e.quantidade,
            origem: "manual" as const,
            observacao: "Entrada via edição",
            colecaoId: alteracao.colecaoId,
            fornecedorId: alteracao.fornecedorId,
          })),
        );
      }
    }
  });
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/modelos/alterarModelo.ts
git commit -m "feat(edicao): serviço alterarModelo (atributos + add/remover SKUs)"
```

---

## Task 15: Validação da edição + API `GET`/`PUT /api/modelos/[id]`

**Files:**
- Modify: `src/lib/modelos/validarCadastro.ts` (adicionar `esquemaEdicaoModelo`)
- Test: `src/lib/modelos/validarCadastro.test.ts`
- Create: `src/app/api/modelos/[id]/route.ts`

**Interfaces:**
- Consumes: `buscarModeloParaEdicao` (Task 13), `alterarModelo` (Task 14), `salvarImagem`, `mapearErroDb` (ver `src/lib/db/erros.ts`).
- Produces: `esquemaEdicaoModelo` (valida atributos + `novosSkus` + `removerVariacaoIds`); rotas `GET` e `PUT`.

- [ ] **Step 1: Teste do esquema de edição**

Adicionar em `src/lib/modelos/validarCadastro.test.ts`:

```ts
import { esquemaEdicaoModelo } from "./validarCadastro";

describe("esquemaEdicaoModelo", () => {
  const baseEd = {
    descricao: "Anel X",
    precoCusto: "10,00",
    precoVenda: "20,00",
    colecaoId: ID,
    fornecedorId: ID,
    novosSkus: [],
    removerVariacaoIds: [],
  };

  it("aceita edição sem novos SKUs nem remoções", () => {
    expect(esquemaEdicaoModelo.safeParse(baseEd).success).toBe(true);
  });

  it("aceita novos SKUs com tamanho custom e quantidade", () => {
    const r = esquemaEdicaoModelo.safeParse({
      ...baseEd,
      novosSkus: [{ pedra: "06", tamanho: "17", quantidade: 2 }],
    });
    expect(r.success).toBe(true);
  });

  it("rejeita pedra inválida em novo SKU", () => {
    const r = esquemaEdicaoModelo.safeParse({
      ...baseEd,
      novosSkus: [{ pedra: "99", tamanho: "18", quantidade: 1 }],
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/modelos/validarCadastro.test.ts`
Expected: FALHA — `esquemaEdicaoModelo` não existe.

- [ ] **Step 3: Implementar o esquema de edição**

Adicionar ao fim de `src/lib/modelos/validarCadastro.ts`:

```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/lib/modelos/validarCadastro.test.ts`
Expected: PASS.

- [ ] **Step 5: Ler o guia do Next e criar a rota**

Ler `node_modules/next/dist/docs/` (Route Handlers, params assíncronos) e criar `src/app/api/modelos/[id]/route.ts`:

```ts
/**
 * API de um modelo específico — GET (carregar p/ edição) e PUT (salvar edição).
 * Regra 3: remover SKU só se nunca teve movimentação (senão 409).
 */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { salvarImagem } from "@/lib/imagens/salvarImagem";
import { alterarModelo, type NovoSku } from "@/lib/modelos/alterarModelo";
import { buscarModeloParaEdicao } from "@/lib/modelos/buscarModeloParaEdicao";
import { esquemaEdicaoModelo } from "@/lib/modelos/validarCadastro";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  const modelo = await buscarModeloParaEdicao(db, id);
  if (!modelo) return NextResponse.json({ erro: "Modelo não encontrado." }, { status: 404 });
  return NextResponse.json(modelo);
}

function parseJson<T>(valor: FormDataEntryValue | null, fallback: T): T {
  if (!valor) return fallback;
  return JSON.parse(String(valor)) as T;
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  const form = await request.formData();

  let corpo: unknown;
  try {
    corpo = {
      descricao: form.get("descricao"),
      modeloFornecedor: form.get("modeloFornecedor"),
      precoCusto: form.get("precoCusto"),
      precoVenda: form.get("precoVenda"),
      colecaoId: form.get("colecaoId"),
      fornecedorId: form.get("fornecedorId"),
      novosSkus: parseJson<NovoSku[]>(form.get("novosSkus"), []),
      removerVariacaoIds: parseJson<string[]>(form.get("removerVariacaoIds"), []),
    };
  } catch {
    return NextResponse.json({ erro: "Campos JSON inválidos." }, { status: 422 });
  }

  const parsed = esquemaEdicaoModelo.safeParse(corpo);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados inválidos.", detalhes: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const imagem = form.get("imagem");
  const imagemPath =
    imagem instanceof File && imagem.size > 0 ? await salvarImagem(imagem) : undefined;

  try {
    await alterarModelo(db, id, {
      descricao: parsed.data.descricao,
      modeloFornecedor: parsed.data.modeloFornecedor,
      precoCusto: parsed.data.precoCusto,
      precoVenda: parsed.data.precoVenda,
      colecaoId: parsed.data.colecaoId,
      fornecedorId: parsed.data.fornecedorId,
      novosSkus: parsed.data.novosSkus,
      removerVariacaoIds: parsed.data.removerVariacaoIds,
      ...(imagemPath !== undefined ? { imagemPath } : {}),
    });
    return NextResponse.json({ id, atualizado: true });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    const conflito = mensagem.includes("já tiveram movimentação");
    return NextResponse.json({ erro: mensagem }, { status: conflito ? 409 : 400 });
  }
}
```

- [ ] **Step 6: Verificar compilação**

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/lib/modelos/validarCadastro.ts src/lib/modelos/validarCadastro.test.ts src/app/api/modelos/[id]/route.ts
git commit -m "feat(edicao): validação e API GET/PUT /api/modelos/[id]"
```

---

## Task 16: UI de edição — página, modo editar no formulário e link "Editar"

**Files:**
- Create: `src/app/produtos/[id]/editar/page.tsx`
- Create: `src/components/FormularioEdicaoModelo.tsx`
- Modify: `src/components/ListaProdutos.tsx`

**Interfaces:**
- Consumes: `buscarModeloParaEdicao`/`ModeloEdicao` (Task 13); `GradeSkusQuantidade`, `chaveSku`, `montarSkus` (Task 10); `ModalConfirmacaoCadastro`, `ResumoCadastro` (Task 11); `PEDRAS`, `TAMANHOS_VALIDOS`, `TIPOS`; `listarColecoes`, `listarFornecedores`.
- Produces: rota `/produtos/[id]/editar`; componente de edição; link "Editar" na lista.

> Nota de decomposição: a edição usa um componente próprio (`FormularioEdicaoModelo`) em vez de sobrecarregar o `FormularioCadastroModelo` com dois modos — mantém cada arquivo focado e < 500 linhas (CODE.md). Ambos reutilizam `GradeSkusQuantidade` e `ModalConfirmacaoCadastro`.

- [ ] **Step 1: Ler o guia do Next (páginas dinâmicas/params) antes de criar a página**

Ler `node_modules/next/dist/docs/` sobre dynamic routes e `params` assíncronos.

- [ ] **Step 2: Criar a página de edição**

`src/app/produtos/[id]/editar/page.tsx`:

```tsx
/**
 * Página de edição de modelo (tela Produtos → Editar).
 * Server component: carrega o modelo, coleções e fornecedores e delega ao form.
 */

import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { FormularioEdicaoModelo } from "@/components/FormularioEdicaoModelo";
import { PEDRAS, TAMANHOS_VALIDOS, buscarTipo } from "@/lib/codigo/referencia";
import { listarColecoes } from "@/lib/colecoes/colecoes";
import { listarFornecedores } from "@/lib/fornecedores/fornecedores";
import { buscarModeloParaEdicao } from "@/lib/modelos/buscarModeloParaEdicao";

export const dynamic = "force-dynamic";

export default async function PaginaEdicao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [modelo, colecoes, fornecedores] = await Promise.all([
    buscarModeloParaEdicao(db, id),
    listarColecoes(db),
    listarFornecedores(db),
  ]);
  if (!modelo) notFound();

  const tipo = buscarTipo(modelo.tipo);
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar {tipo?.descricao} {modelo.codigoBase}</h1>
        <p className="text-sm text-gray-500">
          Tipo e código são fixos. Saldo de SKUs existentes muda só pela Movimentação.
        </p>
      </div>
      <FormularioEdicaoModelo
        modelo={modelo}
        pedras={PEDRAS}
        tamanhosPorTipo={TAMANHOS_VALIDOS}
        colecoes={colecoes}
        fornecedores={fornecedores}
      />
    </section>
  );
}
```

- [ ] **Step 3: Criar o formulário de edição**

`src/components/FormularioEdicaoModelo.tsx`:

```tsx
"use client";

/**
 * Edição de modelo: pré-preenche atributos, lista SKUs existentes (saldo, com
 * remoção só se sem movimentação) e permite adicionar novos SKUs com quantidade.
 * Envia via PUT após confirmação no modal.
 */

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Pedra } from "@/lib/codigo/referencia";
import type { ModeloEdicao } from "@/lib/modelos/buscarModeloParaEdicao";
import { combinarTamanhos } from "@/lib/modelos/tamanhos";
import {
  GradeSkusQuantidade,
  chaveSku,
  montarSkus,
} from "@/components/GradeSkusQuantidade";
import {
  ModalConfirmacaoCadastro,
  type ResumoCadastro,
} from "@/components/ModalConfirmacaoCadastro";

interface Colecao {
  id: string;
  nome: string;
  data: string;
}
interface Fornecedor {
  id: string;
  nome: string;
}
interface Props {
  modelo: ModeloEdicao;
  pedras: readonly Pedra[];
  tamanhosPorTipo: Record<number, readonly string[]>;
  colecoes: readonly Colecao[];
  fornecedores: readonly Fornecedor[];
}

function precoParaInput(valor: string | null): string {
  return valor ? valor.replace(".", ",") : "";
}

export function FormularioEdicaoModelo({
  modelo,
  pedras,
  tamanhosPorTipo,
  colecoes,
  fornecedores,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const temTamanho = (tamanhosPorTipo[modelo.tipo] ?? []).length > 0;

  // SKUs já existentes: identificados por chave pedra|tamanho, para não duplicar.
  const existentes = useMemo(
    () => new Set(modelo.variacoes.map((v) => chaveSku(v.pedra ?? "", v.tamanho))),
    [modelo.variacoes],
  );

  const [pedrasSel, setPedrasSel] = useState<string[]>([]);
  const [tamanhosSel, setTamanhosSel] = useState<string[]>([]);
  const [outrosTamanhos, setOutrosTamanhos] = useState<string[]>([]);
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [remover, setRemover] = useState<Set<string>>(new Set());
  const [resumo, setResumo] = useState<ResumoCadastro | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const tamanhos = useMemo(
    () => combinarTamanhos(tamanhosSel, outrosTamanhos),
    [tamanhosSel, outrosTamanhos],
  );

  function alternar(lista: string[], valor: string): string[] {
    return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
  }

  // Só SKUs novos (não já existentes) entram como novosSkus.
  function novosSkusSelecionados() {
    return montarSkus(pedrasSel, tamanhos, temTamanho, pedras)
      .filter((k) => !existentes.has(chaveSku(k.pedra, k.tamanho)))
      .map((k) => ({
        pedra: k.pedra,
        tamanho: k.tamanho,
        quantidade: quantidades[chaveSku(k.pedra, k.tamanho)] ?? 0,
      }));
  }

  function abrirConfirmacao(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const dados = new FormData(evento.currentTarget);
    const novos = novosSkusSelecionados();
    setResumo({
      tipoNome: `${modelo.codigoBase}`,
      descricao: String(dados.get("descricao") ?? ""),
      modeloFornecedor: String(dados.get("modeloFornecedor") ?? "").trim() || null,
      precoCusto: String(dados.get("precoCusto") ?? ""),
      precoVenda: String(dados.get("precoVenda") ?? ""),
      colecaoNome: colecoes.find((c) => c.id === dados.get("colecaoId"))?.nome ?? "",
      fornecedorNome: fornecedores.find((f) => f.id === dados.get("fornecedorId"))?.nome ?? "",
      imagemPreview: modelo.imagemPath ? `/${modelo.imagemPath}` : null,
      skus: novos.map((s) => ({
        rotulo: `${pedras.find((p) => p.codigo === s.pedra)?.descricao ?? s.pedra}${
          s.tamanho ? ` · ${s.tamanho}cm` : ""
        } (novo)`,
        quantidade: s.quantidade,
      })),
    });
  }

  async function confirmar() {
    if (!formRef.current) return;
    setEnviando(true);
    setErro(null);
    const dados = new FormData(formRef.current);
    dados.set("novosSkus", JSON.stringify(novosSkusSelecionados()));
    dados.set("removerVariacaoIds", JSON.stringify([...remover]));

    const resposta = await fetch(`/api/modelos/${modelo.id}`, { method: "PUT", body: dados });
    const corpo = await resposta.json();
    setEnviando(false);
    setResumo(null);
    if (!resposta.ok) {
      setErro(corpo.erro ?? "Falha ao salvar.");
      return;
    }
    router.push("/produtos");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} onSubmit={abrirConfirmacao} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Descrição <span className="text-red-600">*</span></span>
            <input
              name="descricao"
              type="text"
              maxLength={500}
              required
              defaultValue={modelo.descricao ?? ""}
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Modelo do fornecedor</span>
            <input
              name="modeloFornecedor"
              type="text"
              maxLength={200}
              defaultValue={modelo.modeloFornecedor ?? ""}
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Preço de custo <span className="text-red-600">*</span></span>
            <input
              name="precoCusto"
              type="text"
              inputMode="decimal"
              required
              defaultValue={precoParaInput(modelo.precoCusto)}
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Preço de venda <span className="text-red-600">*</span></span>
            <input
              name="precoVenda"
              type="text"
              inputMode="decimal"
              required
              defaultValue={precoParaInput(modelo.precoVenda)}
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Coleção <span className="text-red-600">*</span></span>
            <select
              name="colecaoId"
              required
              defaultValue={modelo.colecaoId ?? ""}
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="" disabled>Selecione…</option>
              {colecoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.data.split("-").reverse().join("/")})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Fornecedor <span className="text-red-600">*</span></span>
            <select
              name="fornecedorId"
              required
              defaultValue={modelo.fornecedorId ?? ""}
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="" disabled>Selecione…</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Trocar imagem (opcional)</span>
          <input
            name="imagem"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="text-sm"
          />
          <span className="text-xs text-gray-500">Deixe em branco para manter a imagem atual.</span>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">SKUs existentes</legend>
          <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left dark:bg-gray-900">
                <tr>
                  <th className="px-3 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 text-right font-medium">Saldo</th>
                  <th className="px-3 py-2 font-medium">Remover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {modelo.variacoes.map((v) => (
                  <tr key={v.id}>
                    <td className="px-3 py-2 font-mono">{v.codigo}</td>
                    <td className="px-3 py-2 text-right">{v.saldo}</td>
                    <td className="px-3 py-2">
                      {v.teveMovimentacao ? (
                        <span className="text-xs text-gray-400">tem histórico</span>
                      ) : (
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={remover.has(v.id)}
                            onChange={() =>
                              setRemover((atual) => {
                                const novo = new Set(atual);
                                if (novo.has(v.id)) novo.delete(v.id);
                                else novo.add(v.id);
                                return novo;
                              })
                            }
                          />
                          <span className="text-xs">remover</span>
                        </label>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Adicionar SKUs</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {pedras.map((p) => (
              <label key={p.codigo} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pedrasSel.includes(p.codigo)}
                  onChange={() => setPedrasSel((a) => alternar(a, p.codigo))}
                />
                <span>{p.codigo} · {p.descricao}</span>
              </label>
            ))}
          </div>
          {temTamanho && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {(tamanhosPorTipo[modelo.tipo] ?? []).map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tamanhosSel.includes(t)}
                    onChange={() => setTamanhosSel((a) => alternar(a, t))}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          )}
          <GradeSkusQuantidade
            pedras={pedrasSel}
            tamanhos={tamanhos}
            temTamanho={temTamanho}
            pedrasRef={pedras}
            quantidades={quantidades}
            onChangeQuantidade={(chave, valor) =>
              setQuantidades((atual) => ({ ...atual, [chave]: valor }))
            }
            onAdicionarOutrosTamanhos={(novos) =>
              setOutrosTamanhos((atual) => [...new Set([...atual, ...novos])])
            }
          />
          <p className="text-xs text-gray-500">
            SKUs que já existem no modelo são ignorados (só entram combinações novas).
          </p>
        </fieldset>

        <button
          type="submit"
          className="rounded bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700"
        >
          Revisar e salvar
        </button>
      </form>

      {resumo && (
        <ModalConfirmacaoCadastro
          resumo={resumo}
          enviando={enviando}
          aoConfirmar={confirmar}
          aoCancelar={() => setResumo(null)}
        />
      )}

      {erro && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {erro}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Adicionar o link "Editar" na tela Produtos**

Em `src/components/ListaProdutos.tsx`, na coluna Ações (dentro do `<div className="flex gap-2">`, antes do bloco de Inativar/Reativar), adicionar:

```tsx
                      <a
                        href={`/produtos/${p.id}/editar`}
                        className="text-blue-700 hover:underline dark:text-blue-400"
                      >
                        Editar
                      </a>
```

- [ ] **Step 5: Verificar compilação**

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 6: Verificar rodando o app (edição real)**

Run: `npm run dev` (com `npm run db:up`).
Testar: em Produtos, clicar "Editar" num modelo → alterar preço/descrição/modelo do fornecedor; adicionar um SKU novo com quantidade; marcar para remover um SKU sem histórico → "Revisar e salvar" → confirmar. Conferir em Produtos/Catálogo.
Expected: atributos atualizados; SKU novo criado com saldo = quantidade; SKU sem histórico removido; SKU com histórico não removível.

- [ ] **Step 7: Commit**

```bash
git add src/app/produtos/[id]/editar/page.tsx src/components/FormularioEdicaoModelo.tsx src/components/ListaProdutos.tsx
git commit -m "feat(edicao): tela de editar cadastro (atributos + add/remover SKUs) e link na lista"
```

---

## Task 17: Verificação end-to-end e garantia de reuso do código

Sem novo código — validação integrada do conjunto (inclui a garantia da spec §1.1).

- [ ] **Step 1: Rodar toda a suíte e o lint**

Run: `npm test && npm run lint`
Expected: tudo verde.

- [ ] **Step 2: Verificar reuso do código após exclusão (spec §1.1)**

Com o app rodando (`npm run db:up` + `npm run dev`):
1. Anote o maior sequencial de Anel atual (ex.: `00105`).
2. Exclua esse modelo pela tela Produtos (botão "Excluir"; só aparece se saldo/movimentação = 0).
3. Confirme que o arquivo de imagem sumiu de `uploads/` (a foto órfã).
4. Cadastre um novo Anel e verifique que o sequencial gerado é o mesmo (`00105`), logo o código `100105` voltou a ser utilizável.

Expected: código reutilizado; imagem órfã removida.

- [ ] **Step 3: Usar a skill de verificação**

Use a skill `verify` (ou `/run`) para exercitar o cadastro com quantidades e a edição ponta a ponta, confirmando o comportamento observável (não só testes).

---

## Self-Review (feito na escrita do plano)

- **Cobertura da spec:** §1 exclusão + imagem (Task 9) e reuso do código (Task 17); §2.1 modelo do fornecedor (Tasks 2, 6, 7, 8, 12, 15, 16); §2.2 outro tamanho + afrouxamento (Tasks 1, 3, 6, 12); §3 grade + entradas (Tasks 4, 7, 8, 10, 12); §4 modal (Tasks 11, 12, 16); §5 edição (Tasks 13–16). Sem lacunas.
- **Placeholders:** nenhum passo com "TBD"/"handle errors" genérico; todo passo de código traz o código.
- **Consistência de tipos:** `QuantidadeSku`/`VariacaoComId`/`EntradaInicial` (Task 4) reusados em 7/14; `chaveSku`/`montarSkus` (Task 10) reusados em 12/16; `ResumoCadastro` (Task 11) em 12/16; `ModeloEdicao` (Task 13) em 15/16; `esquemaEdicaoModelo`/`NovoSku` (14/15).
