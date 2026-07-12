import { describe, expect, it } from "vitest";
import { conciliarTabelaLegado } from "./importarTabelaLegado";
import { parseTabelaLegado } from "./tabelaLegado";

const CABECALHO = "SKU\tCATEGORIA\tTAMANHO\tCOR DE PEDRA\tDESCRIÇÃO";

describe("conciliarTabelaLegado", () => {
  const plano = parseTabelaLegado(
    `${CABECALHO}\n1000011401\tANEL\t14\t01.CRISTAL\tAnel TAM: 14\n` +
      `1000011601\tANEL\t16\t01.CRISTAL\tAnel TAM: 16\n` +
      `2000010013\tBRINCO\t0\t13.OUTROS\tBrinco`,
  );

  it("conta modelos e SKUs novos com saldo zero implícito", () => {
    expect(conciliarTabelaLegado(plano, { modelos: [], skus: [] })).toMatchObject({
      modelosNovos: 2,
      modelosExistentes: 0,
      skusNovos: 3,
      skusExistentes: 0,
      conflitos: [],
    });
  });

  it("preserva SKU exato existente e inclui apenas os ausentes", () => {
    const analise = conciliarTabelaLegado(plano, {
      modelos: [{ id: "modelo-1", tipo: 1, sequencial: "00001" }],
      skus: [
        {
          codigo: "1000010114",
          modeloId: "modelo-1",
          pedra: "01",
          tamanho: "14",
        },
      ],
    });
    expect(analise).toMatchObject({
      modelosNovos: 1,
      modelosExistentes: 1,
      skusNovos: 2,
      skusExistentes: 1,
      conflitos: [],
    });
  });

  it("bloqueia combinação ocupada por código diferente", () => {
    const analise = conciliarTabelaLegado(plano, {
      modelos: [{ id: "modelo-1", tipo: 1, sequencial: "00001" }],
      skus: [
        {
          codigo: "codigo-incorreto",
          modeloId: "modelo-1",
          pedra: "01",
          tamanho: "14",
        },
      ],
    });
    expect(analise.conflitos).toHaveLength(1);
    expect(analise.conflitos[0]).toContain("codigo-incorreto");
  });
});
