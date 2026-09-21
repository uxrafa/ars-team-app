"use client";

import { useState } from "react";
import { carga as formatarCarga, curtaComMes, type CargaQueSubiu } from "@/lib/treino";
import { Meta } from "../pecas";
import { GraficoDePeso, type Ponto } from "./grafico";
import { RegistroDeMedidas, RegistroDePeso } from "./registro";
import { Fotos, type FotoNaTela } from "./fotos";
import {
  PERIODOS,
  pontosDoPeriodo,
  rotuloDaDiferenca,
  variacaoDoPeriodo,
  type ChaveDaMedida,
  type Periodo,
  type ResumoDasMedidas,
} from "@/lib/medidas";

const ABAS = [
  ["peso", "Peso"],
  ["medidas", "Medidas"],
  ["fotos", "Fotos"],
] as const;

type Aba = (typeof ABAS)[number][0];

export function VisaoDaEvolucao({
  pontos,
  medidas,
  subiram,
  alunoId,
  fotos,
  objetivo,
}: {
  pontos: Ponto[];
  medidas: ResumoDasMedidas;
  subiram: CargaQueSubiu[];
  alunoId: string;
  fotos: FotoNaTela[];
  objetivo: string | null;
}) {
  const [aba, setAba] = useState<Aba>("peso");

  const [periodo, setPeriodo] = useState<Periodo>("3m");

  const ultimo = pontos[pontos.length - 1] ?? null;

  // A variação acompanha o período escolhido: "desde quando" é a primeira
  // pesagem da janela. Antes era fixo em 30 dias e o aluno não via o resto.
  const doPeriodo = pontosDoPeriodo(pontos, periodo);
  const base = doPeriodo[0] ?? null;
  const variacao = variacaoDoPeriodo(doPeriodo);
  // Filtro só aparece quando muda alguma coisa: com um mês de dados, os
  // quatro botões mostrariam o mesmo gráfico.
  const temHistorico = pontosDoPeriodo(pontos, "1m").length < pontos.length;

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

            {temHistorico && (
              <div role="group" aria-label="Período" className="mt-4 grid grid-cols-4 gap-1.5">
                {PERIODOS.map((p) => (
                  <button
                    key={p.valor}
                    type="button"
                    aria-pressed={periodo === p.valor}
                    onClick={() => setPeriodo(p.valor)}
                    className={`min-h-11 rounded-[10px] text-[13px] transition-colors ${
                      periodo === p.valor
                        ? "border border-contorno bg-tinta-3 font-bold text-papel"
                        : "text-nevoa hover:text-papel"
                    }`}
                  >
                    {p.nome}
                  </button>
                ))}
              </div>
            )}

            {doPeriodo.length >= 2 ? (
              <>
                {/* key: trocar de período volta a escolha para a última pesagem. */}
                <GraficoDePeso key={periodo} pontos={doPeriodo} />
                <div className="mt-1.5 flex justify-between">
                  <span className="font-mono text-[11px] text-nevoa">
                    {curtaComMes(doPeriodo[0].data)}
                  </span>
                  <span className="font-mono text-[11px] text-nevoa">
                    {curtaComMes(doPeriodo[doPeriodo.length - 1].data)}
                  </span>
                </div>

                {/* A lista completa fica a um toque, e não na tela: é o que
                    ele consulta às vezes, não toda vez. */}
                <details className="mt-3 border-t border-linha pt-1">
                  <summary className="flex min-h-11 cursor-pointer items-center text-[13px] font-semibold text-nevoa hover:text-papel">
                    Ver pesagens ({doPeriodo.length})
                  </summary>
                  <ul className="pb-2">
                    {[...doPeriodo].reverse().map((p) => (
                      <li
                        key={p.data}
                        className="flex justify-between border-t border-linha py-2 text-[14px] first:border-t-0"
                      >
                        <span className="font-mono text-nevoa">{curtaComMes(p.data)}</span>
                        <span className="text-papel">{formatarCarga(p.valor)} kg</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            ) : pontos.length >= 2 ? (
              <p className="mb-2 mt-3 text-[13.5px] leading-[1.5] text-nevoa">
                Só uma pesagem nesse período. Escolha um período maior.
              </p>
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
          {medidas.ultima && (
            <section className="rounded-2xl border border-linha bg-tinta-2 px-[18px] py-4">
              {/* A unidade e as datas ficam no rótulo, uma vez, e não em cada
                  medida. Com comparação, "05/08 → 21/09" diz de quando a
                  quando a seta está falando. */}
              <Meta>
                Em cm ·{" "}
                {medidas.desde
                  ? `${curtaComMes(medidas.desde)} → ${curtaComMes(medidas.ultima)}`
                  : curtaComMes(medidas.ultima)}
              </Meta>
              <dl className="mt-3 grid grid-cols-4 gap-2">
                {medidas.itens.map((m) => (
                  <div key={m.chave}>
                    <dt className="text-[13px] text-nevoa">{m.nome}</dt>
                    <dd className="mt-0.5 font-mono text-[15px] tabular text-papel">
                      {m.atual !== null ? formatarCarga(m.atual) : "-"}
                    </dd>
                    {/* Seta sem cor: cintura descendo é ótimo para quem
                        emagrece e braço subindo é ótimo para quem ganha massa.
                        Pintar de verde ou vermelho seria julgar pelo aluno. */}
                    {m.diferenca !== null && (
                      <dd className="mt-0.5 font-mono text-[13px] tabular text-nevoa">
                        {rotuloDaDiferenca(m.diferenca)}
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            </section>
          )}

          <RegistroDeMedidas
            atuais={Object.fromEntries(medidas.itens.map((m) => [m.chave, m.atual])) as Record<ChaveDaMedida, number | null>}
          />
        </>
      )}

      {/* ---------------------------------------------------------- */}
      {aba === "fotos" && <Fotos alunoId={alunoId} fotos={fotos} />}
    </div>
  );
}
