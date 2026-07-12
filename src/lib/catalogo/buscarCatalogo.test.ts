import { describe, expect, it } from "vitest";
import {
  agruparCatalogo,
  filtrarCatalogo,
  type LinhaCatalogo,
} from "./buscarCatalogo";

const linhas: LinhaCatalogo[] = [
  {
    modeloId: "modelo-1",
    tipo: 1,
    sequencial: "00001",
    descricao: "Anel Coração",
    imagemPath: "uploads/anel.png",
    precoVenda: "100.00",
    codigo: "1000010114",
    pedra: "01",
    tamanho: "14",
    saldo: 3,
  },
  {
    modeloId: "modelo-1",
    tipo: 1,
    sequencial: "00001",
    descricao: "Anel Coração",
    imagemPath: "uploads/anel.png",
    precoVenda: "100.00",
    codigo: "1000010516",
    pedra: "05",
    tamanho: "16",
    saldo: 2,
  },
  {
    modeloId: "modelo-2",
    tipo: 2,
    sequencial: "00001",
    descricao: "Brinco Cristal",
    imagemPath: null,
    precoVenda: null,
    codigo: "20000101",
    pedra: "01",
    tamanho: null,
    saldo: null,
  },
];

describe("agruparCatalogo", () => {
  it("unifica SKUs do mesmo modelo e soma seus estoques", () => {
    const modelos = agruparCatalogo(linhas);
    expect(modelos).toHaveLength(2);
    expect(modelos[0]).toMatchObject({
      codigoBase: "100001",
      precoVenda: 100,
      saldoTotal: 5,
    });
    expect(modelos[0].variacoes).toHaveLength(2);
  });
});

describe("filtrarCatalogo", () => {
  const modelos = agruparCatalogo(linhas);

  it("filtra pela pedra mas mantém todas as variações do modelo encontrado", () => {
    const filtrados = filtrarCatalogo(modelos, { pedra: "05" });
    expect(filtrados).toHaveLength(1);
    expect(filtrados[0].variacoes).toHaveLength(2);
  });

  it("busca por descrição, código base ou SKU completo", () => {
    expect(filtrarCatalogo(modelos, { busca: "coracao" })).toHaveLength(1);
    expect(filtrarCatalogo(modelos, { busca: "100001" })).toHaveLength(1);
    expect(filtrarCatalogo(modelos, { busca: "1000010516" })).toHaveLength(1);
  });
});
