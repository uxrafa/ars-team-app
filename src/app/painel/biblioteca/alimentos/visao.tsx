"use client";

import { useMemo, useState } from "react";
import { Botao, CLASSE_CAMPO } from "@/components/ui";
import {
  GRUPO_SUPLEMENTOS,
  filtrarAlimentos,
  secoesDeAlimentos,
  type OrigemNoFiltro,
} from "@/lib/dieta";
import { Aba, AbasDaBiblioteca, Lupa } from "../pecas";
import { Linha, type LinhaAlimento } from "./linha";
import { Novo } from "./novo";

export function Visao({ lista }: { lista: LinhaAlimento[] }) {
  const [busca, setBusca] = useState("");
  const [origem, setOrigem] = useState<OrigemNoFiltro>("todos");

  const seus = useMemo(() => lista.filter((a) => a.origem === "proprio").length, [lista]);
  const daTaco = lista.length - seus;

  const filtrada = useMemo(() => filtrarAlimentos(lista, busca, origem), [lista, busca, origem]);
  const secoes = useMemo(() => secoesDeAlimentos(filtrada), [filtrada]);

  // Suplementos primeiro, que é o motivo de cadastrar; depois os grupos da
  // TACO, para um alimento dele poder morar junto dos parecidos.
  const grupos = useMemo(() => {
    const daBase = new Set(lista.map((a) => a.grupo).filter((g): g is string => !!g));
    daBase.delete(GRUPO_SUPLEMENTOS);
    return [GRUPO_SUPLEMENTOS, ...[...daBase].sort((a, b) => a.localeCompare(b, "pt-BR"))];
  }, [lista]);

  const filtrando = busca.trim() !== "" || origem !== "todos";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-3xl uppercase leading-none tracking-wide">Biblioteca</h1>
        <AbasDaBiblioteca />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <p className="text-[15px] text-nevoa">
          {filtrando
            ? `${filtrada.length} de ${lista.length} alimentos`
            : `${daTaco} da TACO · ${seus === 0 ? "nenhum seu ainda" : `${seus} ${seus === 1 ? "seu" : "seus"}`}`}
        </p>
        <div className="ml-auto">
          <Novo grupos={grupos} />
        </div>
      </div>

      <div className="sticky top-0 z-30 -mx-6 flex flex-wrap items-center gap-3 border-b border-linha bg-tinta/95 px-6 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] backdrop-blur lg:-mx-8 lg:px-8">
        <label className="relative min-w-[260px] flex-1">
          <span className="sr-only">Buscar alimento</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-nevoa">
            <Lupa />
          </span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar: whey, frango grelhado, arroz integral"
            className={`${CLASSE_CAMPO} pl-12`}
          />
        </label>

        <Aba ativa={origem === "todos"} onClick={() => setOrigem("todos")}>
          Todos
        </Aba>
        <Aba ativa={origem === "proprio"} onClick={() => setOrigem("proprio")}>
          Seus{seus > 0 && ` (${seus})`}
        </Aba>
        <Aba ativa={origem === "taco"} onClick={() => setOrigem("taco")}>
          TACO
        </Aba>

        {filtrando && (
          <Botao
            type="button"
            aparencia="fantasma"
            tamanho="sm"
            onClick={() => {
              setBusca("");
              setOrigem("todos");
            }}
          >
            Limpar
          </Botao>
        )}
      </div>

      {filtrada.length === 0 ? (
        <p className="rounded-2xl border border-linha bg-tinta-2 px-6 py-16 text-center text-[15px] leading-relaxed text-nevoa">
          {origem === "proprio" && seus === 0
            ? "Você ainda não cadastrou alimento. Use Novo alimento para o que não está na TACO, como whey."
            : "Nenhum alimento com esse filtro. Tente outra palavra ou limpe o filtro."}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {secoes.map((s) => (
            <section
              key={s.titulo}
              className="overflow-hidden rounded-2xl border border-linha bg-tinta-2"
            >
              <h2 className="flex items-baseline gap-2 bg-tinta-3 px-5 py-3 text-xs font-semibold uppercase tracking-[0.07em] text-nevoa">
                {s.titulo}
                <span className="font-mono text-[13px] normal-case tracking-normal">
                  {s.itens.length}
                </span>
                {/* Uma vez por seção, e não em toda linha: o "por 100 g" vale
                    para todos os números da lista. */}
                <span className="ml-auto font-sans text-xs normal-case tracking-normal">
                  por 100 g
                </span>
              </h2>
              <ul className="lg:grid lg:grid-cols-2">
                {s.itens.map((a) => (
                  <Linha key={a.id} a={a} grupos={grupos} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
