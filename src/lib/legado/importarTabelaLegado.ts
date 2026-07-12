/** Análise e importação transacional da tabela legada, sempre com saldo zero. */

import { sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, variacoes } from "@/db/schema";
import {
  parseTabelaLegado,
  type CorrecaoTabelaLegado,
  type PlanoTabelaLegado,
} from "./tabelaLegado";

export interface ModeloExistenteTabelaLegado {
  id: string;
  tipo: number;
  sequencial: string;
}

export interface SkuExistenteTabelaLegado {
  codigo: string;
  modeloId: string;
  pedra: string | null;
  tamanho: string | null;
}

export interface EstadoTabelaLegado {
  modelos: ModeloExistenteTabelaLegado[];
  skus: SkuExistenteTabelaLegado[];
}

export interface AnaliseTabelaLegado {
  totalLinhas: number;
  totalModelos: number;
  totalSkus: number;
  modelosNovos: number;
  modelosExistentes: number;
  skusNovos: number;
  skusExistentes: number;
  conflitos: string[];
  correcoes: CorrecaoTabelaLegado[];
}

export interface ResultadoImportacaoTabelaLegado extends AnaliseTabelaLegado {
  aplicado: true;
}

export class ConflitoTabelaLegadoError extends Error {
  constructor(readonly conflitos: string[]) {
    super(`Importação bloqueada por ${conflitos.length} conflito(s).`);
    this.name = "ConflitoTabelaLegadoError";
  }
}

const chaveModelo = (tipo: number, sequencial: string): string => `${tipo}:${sequencial}`;
const chaveVariacao = (modeloId: string, pedra: string | null, tamanho: string | null): string =>
  `${modeloId}:${pedra ?? "-"}:${tamanho ?? "-"}`;

export function conciliarTabelaLegado(
  plano: PlanoTabelaLegado,
  estado: EstadoTabelaLegado,
): AnaliseTabelaLegado {
  const modelosPorChave = new Map(
    estado.modelos.map((modelo) => [chaveModelo(modelo.tipo, modelo.sequencial), modelo]),
  );
  const skusPorCodigo = new Map(estado.skus.map((sku) => [sku.codigo, sku]));
  const skusPorVariacao = new Map(
    estado.skus.map((sku) => [chaveVariacao(sku.modeloId, sku.pedra, sku.tamanho), sku]),
  );

  let modelosNovos = 0;
  let modelosExistentes = 0;
  let skusNovos = 0;
  let skusExistentes = 0;
  const conflitos: string[] = [];

  for (const modeloPlano of plano.modelos) {
    const modelo = modelosPorChave.get(chaveModelo(modeloPlano.tipo, modeloPlano.sequencial));
    if (modelo) modelosExistentes += 1;
    else modelosNovos += 1;

    for (const skuPlano of modeloPlano.skus) {
      const peloCodigo = skusPorCodigo.get(skuPlano.codigo);
      if (peloCodigo) {
        if (!modelo || peloCodigo.modeloId !== modelo.id) {
          conflitos.push(
            `SKU ${skuPlano.codigo} já pertence a outro modelo (${peloCodigo.modeloId}).`,
          );
        } else {
          skusExistentes += 1;
        }
        continue;
      }

      if (modelo) {
        const pelaVariacao = skusPorVariacao.get(
          chaveVariacao(modelo.id, skuPlano.pedra, skuPlano.tamanho),
        );
        if (pelaVariacao) {
          conflitos.push(
            `Modelo ${modeloPlano.tipo}${modeloPlano.sequencial} já possui pedra ${skuPlano.pedra}` +
              `${skuPlano.tamanho ? ` e tamanho ${skuPlano.tamanho}` : ""} com o código ${pelaVariacao.codigo}.`,
          );
          continue;
        }
      }
      skusNovos += 1;
    }
  }

  return {
    totalLinhas: plano.totalLinhas,
    totalModelos: plano.modelos.length,
    totalSkus: plano.modelos.reduce((total, modelo) => total + modelo.skus.length, 0),
    modelosNovos,
    modelosExistentes,
    skusNovos,
    skusExistentes,
    conflitos,
    correcoes: plano.correcoes,
  };
}

type Executor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

async function carregarEstado(executor: Executor): Promise<EstadoTabelaLegado> {
  const [modelosAtuais, skusAtuais] = await Promise.all([
    executor
      .select({ id: modelos.id, tipo: modelos.tipo, sequencial: modelos.sequencial })
      .from(modelos),
    executor
      .select({
        codigo: variacoes.codigo,
        modeloId: variacoes.modeloId,
        pedra: variacoes.pedra,
        tamanho: variacoes.tamanho,
      })
      .from(variacoes),
  ]);
  return { modelos: modelosAtuais, skus: skusAtuais };
}

export async function analisarTabelaLegado(
  db: Database,
  conteudo: string,
): Promise<AnaliseTabelaLegado> {
  const plano = parseTabelaLegado(conteudo);
  return conciliarTabelaLegado(plano, await carregarEstado(db));
}

export async function importarTabelaLegado(
  db: Database,
  conteudo: string,
): Promise<ResultadoImportacaoTabelaLegado> {
  const plano = parseTabelaLegado(conteudo);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(658399)`);
    const estado = await carregarEstado(tx);
    const analise = conciliarTabelaLegado(plano, estado);
    if (analise.conflitos.length > 0) {
      throw new ConflitoTabelaLegadoError(analise.conflitos);
    }

    const modelosPorChave = new Map(
      estado.modelos.map((modelo) => [chaveModelo(modelo.tipo, modelo.sequencial), modelo]),
    );
    const codigosExistentes = new Set(estado.skus.map((sku) => sku.codigo));

    for (const modeloPlano of plano.modelos) {
      const chave = chaveModelo(modeloPlano.tipo, modeloPlano.sequencial);
      let modeloId = modelosPorChave.get(chave)?.id;
      if (!modeloId) {
        const [novo] = await tx
          .insert(modelos)
          .values({
            tipo: modeloPlano.tipo,
            sequencial: modeloPlano.sequencial,
            descricao: modeloPlano.descricao,
            origemCodigo: "existente",
          })
          .returning({ id: modelos.id });
        modeloId = novo.id;
      }

      const novosSkus = modeloPlano.skus.filter((sku) => !codigosExistentes.has(sku.codigo));
      if (novosSkus.length > 0) {
        await tx.insert(variacoes).values(
          novosSkus.map((sku) => ({
            modeloId,
            pedra: sku.pedra,
            tamanho: sku.tamanho,
            codigo: sku.codigo,
          })),
        );
      }
    }

    return { ...analise, aplicado: true as const };
  });
}
