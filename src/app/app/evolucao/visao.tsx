"use client";

import { useState } from "react";
import { carga as formatarCarga, curtaComMes, type CargaQueSubiu } from "@/lib/treino";
import { Meta } from "../pecas";
import { GraficoDePeso, type Ponto } from "./grafico";
import { RegistroDeMedidas, RegistroDePeso } from "./registro";
import { Fotos, type FotoNaTela } from "./fotos";

export type LinhaMedida = {
  data: string;
  peso_kg: number | null;
  cintura_cm: number | null;
  quadril_cm: number | null;
  braco_cm: number | null;
  coxa_cm: number | null;
};

const MEDIDAS = [
  ["cintura_cm", "Cintura"],
  ["quadril_cm", "Quadril"],
  ["braco_cm", "Braço"],
  ["coxa_cm", "Coxa"],
] as const;

const ABAS = [
  ["peso", "Peso"],
  ["medidas", "Medidas"],
  ["fotos", "Fotos"],
] as const;

type Aba = (typeof ABAS)[number][0];

export function VisaoDaEvolucao({
  pontos,
  ultimaLinha,
  subiram,
  alunoId,
  fotos,
  objetivo,
}: {
  pontos: Ponto[];
  ultimaLinha: LinhaMedida | null;
  subiram: CargaQueSubiu[];
  alunoId: string;
  fotos: FotoNaTela[];
  objetivo: string | null;
}) {
  const [aba, setAba] = useState<Aba>("peso");

  const ultimo = pontos[pontos.length - 1] ?? null;

  /**
   * A variação da janela: o ponto mais antigo dentro dos últimos 30 dias, ou o
   * primeiro que existir. Comparar sempre com o começo de tudo deixaria o
   * número parado depois de alguns meses.
   */
  const limite = ultimo
    ? new Date(Date.parse(`${ultimo.data}T00:00:00Z`) - 30 * 86400000).toISOString().slice(0, 10)
    : null;
  const base = limite ? (pontos.find((p) => p.data >= limite) ?? pontos[0]) : null;
  const variacao = ultimo && base && base !== ultimo ? ultimo.valor - base.valor : null;

  // Perder peso não é vitória para quem está atrás de massa. O verde só entra
  // quando a direção bate com o objetivo que o aluno declarou na anamnese.
  const noRumo =
    variacao === null
      ? false
      : objetivo === "emagrecimento"
        ? variacao < 0
        : objetivo === "hipertrofia"
          ? variacao > 0
          : false;

  return (
    <div className="flex flex-col gap-[22px]">
      <div role="tablist" aria-label="Evolução" className="flex gap-[7px]">
        {ABAS.map(([valor, nome]) => {
          const atual = aba === valor;
          return (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={atual}
              onClick={() => setAba(valor)}
              className={`min-h-11 flex-1 rounded-[10px] px-2 text-[13px] transition-colors ${
                atual
                  ? "bg-raio-solido font-bold text-papel"
                  : "border border-contorno text-nevoa hover:text-papel"
              }`}
            >
              {nome}
            </button>
          );
        })}
      </div>

      {/* ---------------------------------------------------------- */}
      {aba === "peso" && (
        <>
          <section className="rounded-2xl border border-linha bg-tinta-2 px-[18px] pb-3 pt-[18px]">
            <div className="flex items-end gap-3">
              <div className="min-w-0">
                <Meta>Peso atual</Meta>
                <p className="mt-1 font-display text-[38px] leading-none tracking-wide">
                  {ultimo ? formatarCarga(ultimo.valor) : "-"}
                  <span className="text-[20px] text-nevoa"> kg</span>
                </p>
              </div>

              {variacao !== null && Math.abs(variacao) >= 0.1 && (
                <span
                  className={`ml-auto flex flex-none items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-bold ${
                    noRumo ? "border-ok/30 bg-ok/[0.14] text-ok" : "border-contorno text-nevoa"
                  }`}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {variacao < 0 ? (
                      <path d="M12 19V5M6 13l6 6 6-6" />
                    ) : (
                      <path d="M12 5v14M6 11l6-6 6 6" />
                    )}
                  </svg>
                  {formatarCarga(Math.abs(variacao))} kg
                </span>
              )}
            </div>

            {base && ultimo && base !== ultimo ? (
              <Meta className="mt-1.5 block">Desde {curtaComMes(base.data)}</Meta>
            ) : (
              <Meta className="mt-1.5 block">Primeiro registro</Meta>
            )}

            {pontos.length >= 2 ? (
              <>
                <GraficoDePeso pontos={pontos} />
                <div className="mt-1.5 flex justify-between">
                  <span className="font-mono text-[11px] text-nevoa">
                    {curtaComMes(pontos[0].data)}
                  </span>
                  <span className="font-mono text-[11px] text-nevoa">
                    {curtaComMes(pontos[pontos.length - 1].data)}
                  </span>
                </div>
              </>
            ) : (
              <p className="mb-2 mt-3 text-[13.5px] leading-[1.5] text-nevoa">
                A linha começa no segundo registro. Pese uma vez por semana, sempre no mesmo dia e
                horário, que ela fica útil rápido.
              </p>
            )}
          </section>

          <RegistroDePeso atual={ultimo ? formatarCarga(ultimo.valor) : ""} />

          {subiram.length > 0 && (
            <section className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.07em] text-nevoa">
                Cargas que subiram
              </span>
              <ul className="overflow-hidden rounded-[14px] border border-linha bg-tinta-2">
                {subiram.map((c) => (
                  <li
                    key={c.exercicio_id}
                    className="flex items-center gap-3 border-t border-linha px-4 py-3.5 first:border-t-0"
                  >
                    <span className="min-w-0 flex-1 text-[13.5px] font-semibold">{c.nome}</span>
                    <span className="flex-none font-mono text-xs tabular text-nevoa">
                      {formatarCarga(c.de)} kg
                    </span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 flex-none text-nevoa"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                    <span className="flex-none font-mono text-xs font-medium tabular text-ok">
                      {formatarCarga(c.para)} kg
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* ---------------------------------------------------------- */}
      {aba === "medidas" && (
        <>
          {ultimaLinha && MEDIDAS.some(([c]) => ultimaLinha[c] !== null) && (
            <section className="rounded-2xl border border-linha bg-tinta-2 px-[18px] py-4">
              {/* A unidade fica no rótulo do cartão, uma vez, em vez de uma
                  linha inteira embaixo da grade. */}
              <Meta>Último registro · {curtaComMes(ultimaLinha.data)} · em cm</Meta>
              <dl className="mt-3 grid grid-cols-4 gap-2">
                {MEDIDAS.map(([chave, nome]) => (
                  <div key={chave}>
                    <dt className="text-[11px] text-nevoa">{nome}</dt>
                    <dd className="mt-0.5 font-mono text-[15px] tabular text-papel">
                      {ultimaLinha[chave] !== null ? formatarCarga(Number(ultimaLinha[chave])) : "-"}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <RegistroDeMedidas
            atuais={{
              cintura_cm: ultimaLinha?.cintura_cm ?? null,
              quadril_cm: ultimaLinha?.quadril_cm ?? null,
              braco_cm: ultimaLinha?.braco_cm ?? null,
              coxa_cm: ultimaLinha?.coxa_cm ?? null,
            }}
          />
        </>
      )}

      {/* ---------------------------------------------------------- */}
      {aba === "fotos" && <Fotos alunoId={alunoId} fotos={fotos} />}
    </div>
  );
}
