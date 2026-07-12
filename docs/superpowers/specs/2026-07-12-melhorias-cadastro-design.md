# Melhorias no Cadastro de Modelo — Design

Data: 2026-07-12
Status: aprovado para implementação

## Contexto

O Quilate já está em produção (VPS otmzai.com.br). Hoje o fluxo de cadastro
(`/cadastro`) cria o `modelo` e todas as `variações` (SKUs = pedra × tamanho),
mas **não grava quantidade nenhuma** — o saldo começa em 0 e só entra depois
pela tela separada de **Movimentação** (entrada por código).

Este documento descreve cinco melhorias solicitadas para uso na operação real:

1. Excluir um cadastro de teste (com foto de carro) já feito.
2. Novos campos no cadastro: **Modelo do fornecedor** e **Outro tamanho**.
3. Informar **quantidades por SKU** no próprio cadastro (grava as entradas).
4. **Popup de confirmação** revisando os dados antes de gravar.
5. **Editar** um cadastro depois de feito.

## Regras estruturais que continuam valendo

- Saldo é VIEW derivada de `movimentacoes`; nunca coluna editável.
- Código = `tipo(1) + sequencial(5) + pedra(2) + tamanho(2)`. Sequencial é
  gerado pelo sistema, por tipo; usuário nunca digita.
- Saída nunca deixa saldo negativo (não afetado aqui, mas mantido).
- Excluir = deleção física só se nunca houve movimentação; senão, inativar.

## Decisões de design (confirmadas com o usuário)

- Quantidades informadas em **grade por SKU** (uma linha por combinação
  pedra × tamanho). Com uma única pedra, vira na prática "quantidade por tamanho".
- **Quantidade 0 é permitida**: o SKU é criado, mas sem movimentação de entrada.
- **Modelo do fornecedor**: campo de texto **opcional**, sem nenhuma lógica de
  SKU — apenas armazenado no modelo.
- **Outro tamanho**: campo digitável que aceita um ou mais valores de 2 dígitos
  (ex.: `26` ou `26, 28`), somados aos tamanhos marcados nos checkboxes.
- **Editar** permite: atributos do modelo + adicionar/remover SKUs (remover só
  SKUs sem movimentação). Tipo e código são imutáveis.
- **Popup de confirmação** aparece tanto no cadastro novo quanto na edição.

---

## 1. Excluir o cadastro de teste + limpeza de imagem órfã

O botão **"Excluir"** na tela Produtos já executa a deleção física quando o
produto nunca teve movimentação (é o caso do `100105`, saldo 0). Nenhuma tela
nova é necessária para excluir o registro de teste — basta clicar.

**Melhoria acoplada:** hoje `excluirProduto` apaga `modelos`/`variacoes` mas
deixa o arquivo de imagem órfão no disco (`uploads/`). Passar a remover também o
arquivo de imagem do modelo na deleção física.

- `src/lib/produtos/alterarProduto.ts`: após apagar o modelo, remover o arquivo
  em `imagemPath` (best-effort; se o arquivo não existir, ignora — não falha a
  transação de banco por causa de I/O de arquivo).
- A remoção do arquivo acontece **depois** do commit da transação (não dentro),
  para não abortar a exclusão do banco por erro de filesystem.
- Inativar (`definirAtivoProduto`) **não** mexe em arquivo — histórico e imagem
  preservados.

Regressão: teste garantindo que inativar não remove imagem e que excluir chama
a remoção do arquivo (com fake de filesystem).

---

## 2. Novos campos no cadastro

### 2.1 Modelo do fornecedor (coluna nova)

- Nova coluna `modelo_fornecedor text` em `modelos` (nullable). Migration Drizzle
  gerada via `drizzle-kit`; adicionar coluna nullable é seguro para os dados
  existentes.
- Campo de texto opcional no formulário (`maxLength` 200).
- Exibido no popup de confirmação e na tela de edição. Persistido em
  `cadastrarModelo` e `alterarModelo`.
- Não participa da geração de código nem de SKU.

### 2.2 Outro tamanho (tamanho digitável)

Hoje `montarCodigo` e `parseCodigo` (modo estrito) **rejeitam** qualquer tamanho
fora de `TAMANHOS_VALIDOS`. Para aceitar tamanho digitado, a regra de tamanho é
afrouxada de **"pertence à lista"** para **"2 dígitos numéricos"**:

- `src/lib/codigo/codigo.ts`:
  - `montarCodigo`: trocar `!tamanhoValido(tipo, tamanho)` por checagem de
    formato `!/^\d{2}$/.test(tamanho)` (mantendo a exigência de `tamanho !== null`
    para tipos com tamanho). A validação de **pedra** continua estrita.
  - `parseCodigo` (modo estrito): a checagem de tamanho passa a ser de formato
    (`/^\d{2}$/`) em vez de `tamanhoValido`, para que SKUs com tamanho custom
    sejam re-parseáveis. Pedra continua validada contra a tabela.
- `src/lib/modelos/validarCadastro.ts`: `tamanhos` passa a aceitar qualquer
  string de 2 dígitos (não só `TODOS_TAMANHOS`).
- `TAMANHOS_VALIDOS` permanece como **tamanhos sugeridos** (checkboxes).
- Campo "Outro tamanho": texto que aceita um ou mais valores separados por
  vírgula. No cliente, cada valor é normalizado (trim, `padStart(2, "0")`),
  validado como 2 dígitos, deduplicado contra os checkboxes, e some do input após
  virar linha(s) na grade. Só aparece para tipos que têm tamanho.
- Pedra continua sendo escolhida só via checkboxes (sem "outra pedra").

Regressão: `codigo.test.ts` e `gerarVariacoes.test.ts` atualizados para o novo
comportamento; teste explícito de tamanho custom aceito (ex.: `13`) e de tamanho
inválido rejeitado (ex.: `1`, `abc`, `123`).

---

## 3. Grade de quantidades por SKU

### Cliente (`GradeSkusQuantidade`)

- Deriva a lista de SKUs no cliente a partir das pedras marcadas × (tamanhos
  marcados ∪ outros tamanhos). Para tipos sem tamanho (Brinco/Pingente), a
  "grade" é uma linha por pedra.
- Cada linha: rótulo legível (pedra + tamanho) + `input` numérico de quantidade
  (inteiro ≥ 0, default 0).
- Mostra totais: nº de SKUs e total de peças (soma das quantidades).
- Estado das quantidades mantido por chave `pedra|tamanho`, preservado quando o
  usuário adiciona/remove seleções.

### Servidor (`cadastrarModelo` estendido)

`EntradaCadastroModelo` ganha `quantidades: { pedra, tamanho, quantidade }[]`.
Dentro da **mesma transação** já existente:

1. gera sequencial;
2. insere o modelo (incl. `modeloFornecedor`);
3. gera e insere as variações (via `gerarVariacoes`);
4. para cada variação cujo `(pedra, tamanho)` tenha `quantidade > 0`, insere uma
   `movimentacao` de entrada:
   - `tipoMov='entrada'`, `quantidade`, `origem='manual'`,
   - `observacao='Cadastro inicial'`,
   - `colecaoId`/`fornecedorId` = os do modelo (a compra inicial herda a
     coleção/fornecedor de lançamento).

A quantidade é casada com a variação por `(pedra, tamanho)`. SKUs com quantidade
0 ficam sem movimentação (saldo 0).

Validação (`validarCadastro`): `quantidades` é um array de objetos com `pedra`
(2 dígitos), `tamanho` (`null` ou 2 dígitos) e `quantidade` (inteiro ≥ 0). Toda
quantidade > 0 precisa referenciar um SKU realmente gerado (pedra selecionada e
tamanho selecionado) — senão erro 422.

Regressão: teste de `cadastrarModelo` verificando que entradas são criadas só
para qtd > 0 e que o saldo resultante bate; teste de que qtd para (pedra,tamanho)
não selecionado é rejeitada.

---

## 4. Popup de confirmação (cadastro e edição)

`ModalConfirmacaoCadastro` — componente de modal acessível (foco preso, `Esc`
fecha = "voltar e corrigir"), aberto ao submeter o formulário, **antes** de
qualquer chamada ao servidor.

Conteúdo revisado:

- Tipo, Descrição, Modelo do fornecedor.
- Preço de custo, Preço de venda.
- Coleção, Fornecedor.
- Thumbnail da imagem (preview local no cadastro; imagem atual na edição).
- Tabela de SKUs a gravar: pedra, tamanho, quantidade (rótulo legível).
- Totais: nº de SKUs, total de peças, valor total de custo
  (Σ quantidade × preço de custo).

Botões: **"Confirmar e gravar"** (dispara o `fetch`) e **"Voltar e corrigir"**
(fecha o modal, mantém o formulário preenchido). Nada é enviado ao servidor até
a confirmação.

Na **edição**, o modal mostra o mesmo resumo, destacando o que muda: SKUs novos
(com quantidade de entrada) e SKUs a remover.

---

## 5. Editar cadastro

### Navegação

- Novo link **"Editar"** por linha na tela Produtos (`ListaProdutos`).
- Rota de página: `/produtos/[id]/editar` (`src/app/produtos/[id]/editar/page.tsx`),
  reaproveitando o `FormularioCadastroModelo` em **modo edição**.

### Carregamento

- `GET /api/modelos/[id]`: retorna atributos do modelo + variações com saldo
  (para render read-only dos SKUs existentes) e flag `teveMovimentacao` por SKU
  (define se pode ser removido).

### O que pode mudar

- Atributos: descrição, preço de custo, preço de venda, coleção, fornecedor,
  imagem, modelo do fornecedor.
- **Adicionar** SKUs: novas combinações pedra × tamanho (inclui outro tamanho),
  cada nova com campo de quantidade de entrada (mesma regra do cadastro: qtd > 0
  gera movimentação de entrada com coleção/fornecedor do modelo).
- **Remover** SKUs: só os que **não tiveram movimentação** (deleção física da
  variação). SKUs com movimentação são exibidos como leitura (saldo) e não podem
  ser removidos aqui — para tirar de circulação, usar inativação (fora do escopo
  desta edição por SKU; permanece a inativação do modelo inteiro na tela
  Produtos).

### Imutável

- Tipo e sequencial/código. Trocar imagem substitui o arquivo (o antigo vira
  órfão; limpeza de imagem só na deleção física do modelo — ver seção 1).
- Saldo de SKUs existentes não é editado aqui (só via Movimentação).

### Servidor (`alterarModelo`)

Novo serviço + `PUT /api/modelos/[id]`, em uma transação:

1. atualiza os atributos do modelo;
2. insere variações novas + movimentações de entrada (qtd > 0);
3. apaga variações marcadas para remoção **somente se** não tiverem movimentação
   (revalida no servidor; erro 409 se alguma tiver histórico).

`definirAtivoProduto`/`excluirProduto` continuam responsáveis por
inativar/reativar/excluir o modelo inteiro na tela Produtos.

---

## Arquitetura e arquivos

Refatoração do formulário (hoje 300 linhas) para não ultrapassar 500 linhas por
arquivo e manter responsabilidade única:

- `FormularioCadastroModelo.tsx` — orquestra; aceita modo `criar | editar` e
  dados iniciais opcionais. Faz o submit via modal.
- `GradeSkusQuantidade.tsx` — deriva e renderiza a grade de SKUs com quantidades;
  gerencia "outro tamanho".
- `ModalConfirmacaoCadastro.tsx` — o popup de revisão/confirmação.

Backend/lib:

- `src/db/schema.ts` + migration: coluna `modelo_fornecedor`.
- `src/lib/codigo/codigo.ts`: afrouxar validação de tamanho (formato).
- `src/lib/modelos/validarCadastro.ts`: quantidades + tamanho custom + modelo do
  fornecedor.
- `src/lib/modelos/gerarVariacoes.ts`: inalterado na assinatura; casamento de
  quantidade fica em `cadastrarModelo`.
- `src/lib/modelos/cadastrarModelo.ts`: grava entradas na mesma transação.
- `src/lib/modelos/alterarModelo.ts` (novo): edição.
- `src/lib/produtos/alterarProduto.ts`: remover arquivo de imagem na deleção.
- `src/app/api/modelos/route.ts`: aceitar quantidades + modelo do fornecedor.
- `src/app/api/modelos/[id]/route.ts` (novo): `GET` e `PUT`.
- `src/components/ListaProdutos.tsx`: link "Editar".
- Página de edição sob `src/app/`.

## Testes

`npm test`. Novos/atualizados:

- `codigo.test.ts`: tamanho custom aceito/rejeitado (formato).
- `gerarVariacoes.test.ts`: geração com tamanho custom.
- `validarCadastro.test.ts`: quantidades válidas/ inválidas, modelo do
  fornecedor, tamanho custom.
- `cadastrarModelo`: entradas criadas só para qtd > 0; saldo correto (com fake de
  DB no padrão existente do projeto).
- `alterarModelo`: adicionar SKU, remover SKU sem movimentação, recusa remover
  SKU com movimentação.
- `alterarProduto`: exclusão remove imagem; inativação não.

## Fora de escopo

- Ajustar saldo de SKU existente pela edição (isso é Movimentação).
- Pedras customizadas (só tamanho é digitável).
- Inativação por SKU individual.
- Multi-tenant, migração de planilha, WhatsApp/N8N (seção 9 da spec).
