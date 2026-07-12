import { describe, expect, it } from "vitest";
import { ErroTabelaLegado, parseTabelaLegado } from "./tabelaLegado";

const CABECALHO = "SKU\tCATEGORIA\tTAMANHO\tCOR DE PEDRA\tDESCRIÇÃO";

describe("parseTabelaLegado", () => {
  it("inverte pedra e tamanho para tipos com tamanho", () => {
    const plano = parseTabelaLegado(
      `${CABECALHO}\n1000011401\tANEL\t14\t01.CRISTAL\tAnel Coração TAM: 14`,
    );

    expect(plano.modelos[0]).toMatchObject({
      tipo: 1,
      sequencial: "00001",
      descricao: "Anel Coração",
      skus: [{ codigoLegado: "1000011401", codigo: "1000010114", pedra: "01", tamanho: "14" }],
    });
  });

  it("remove o tamanho fictício de brinco e pingente", () => {
    const plano = parseTabelaLegado(
      `${CABECALHO}\n2000010013\tBRINCO\t0\t13.OUTROS\tBrinco colorido`,
    );
    expect(plano.modelos[0].skus[0]).toMatchObject({ codigo: "20000113", tamanho: null });
  });

  it("agrupa variações do mesmo modelo e remove tamanho final da descrição", () => {
    const plano = parseTabelaLegado(
      `${CABECALHO}\n3000017000\tCOLAR\t70\t00.SEM PEDRA\tEscapulário 70cm\n` +
        `3000016000\tCOLAR\t60\t00.SEM PEDRA\tEscapulário 60cm`,
    );
    expect(plano.modelos).toHaveLength(1);
    expect(plano.modelos[0].descricao).toBe("Escapulário");
    expect(plano.modelos[0].skus).toHaveLength(2);
  });

  it("aplica e relata as duas correções conhecidas", () => {
    const plano = parseTabelaLegado(
      `${CABECALHO}\n1000492101\tANEL\t22\t01.CRISTAL\tAnel TAM: 22\n` +
        `2001180001\tBRINCO\t0\t\`\tBrinco Zircônia Cristal`,
    );
    expect(plano.correcoes.map((c) => c.codigo)).toEqual(["1000490122", "20011801"]);
  });

  it("recusa divergência não catalogada entre SKU e colunas", () => {
    expect(() =>
      parseTabelaLegado(`${CABECALHO}\n1000011401\tANEL\t16\t01.CRISTAL\tAnel`),
    ).toThrow(ErroTabelaLegado);
  });

  it("recusa SKU convertido duplicado", () => {
    const tabela =
      `${CABECALHO}\n1000011401\tANEL\t14\t01.CRISTAL\tAnel\n` +
      `1000011401\tANEL\t14\t01.CRISTAL\tAnel`;
    expect(() => parseTabelaLegado(tabela)).toThrow("Tabela legada inválida");
  });
});
