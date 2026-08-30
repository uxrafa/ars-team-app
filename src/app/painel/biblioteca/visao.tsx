"use client";

import { useMemo, useState } from "react";
import { Botao, CLASSE_CAMPO } from "@/components/ui";
import {
  GRUPOS,
  NOME_DO_GRUPO,
  agruparPorGrupo,
  filtrar,
  resumo,
  type Grupo,
  type LinhaExercicio,
} from "@/lib/biblioteca";
import { Linha } from "./linha";
import { Novo } from "./novo";

function Lupa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

/** Pílula de filtro. É botão de verdade, com contorno, não texto solto. */
function Aba({
  ativa,
  onClick,
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativa}
      className={`inline-flex min-h-11 items-center rounded-full border px-4 text-[15px] font-semibold transition-colors ${
        ativa
          ? "border-raio-solido bg-raio-solido text-papel"
          : "border-contorno bg-tinta-3 text-nevoa hover:border-nevoa hover:text-papel"
      }`}
    >
      {children}
    </button>
  );
}

export function Visao({ lista }: { lista: LinhaExercicio[] }) {
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState<Grupo | "todos">("todos");
  const [soSemVideo, setSoSemVideo] = useState(false);

  const r = useMemo(() => resumo(lista), [lista]);
  const filtrada = useMemo(
    () => filtrar(lista, { busca, grupo, soSemVideo }),
    [lista, busca, grupo, soSemVideo],
  );
  const secoes = useMemo(() => agruparPorGrupo(filtrada), [filtrada]);

  // Só mostra a aba do grupo que tem exercício, senão sobram sete abas vazias.
  const gruposComItem = useMemo(
    () => GRUPOS.filter((g) => lista.some((e) => e.grupo === g.valor)),
    [lista],
  );

  const filtrando = busca.trim() !== "" || grupo !== "todos" || soSemVideo;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase leading-none tracking-wide">Biblioteca</h1>
          {/* Uma contagem só, que troca de conteúdo quando há filtro. Duas
              faziam ele parar para descobrir qual responde à pergunta dele. */}
          <p className="mt-2.5 text-[15px] text-nevoa">
            {r.total === 0
              ? "Nenhum exercício cadastrado ainda."
              : filtrando
                ? `${filtrada.length} de ${r.total} exercícios`
                : `${r.total} exercícios · ${r.comVideo} com vídeo, ${r.semVideo} ainda sem`}
          </p>
        </div>
        <div className="ml-auto">
          <Novo />
        </div>
      </div>

      {/* A barra de filtro gruda no topo: com 121 itens, rolar até o fim e
          perder a busca de vista é o incômodo óbvio. */}
      <div className="sticky top-0 z-30 -mx-6 flex flex-col gap-3 border-b border-linha bg-tinta/95 px-6 py-4 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[260px] flex-1">
            <span className="sr-only">Buscar exercício</span>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-nevoa">
              <Lupa />
            </span>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou equipamento"
              className={`${CLASSE_CAMPO} pl-12`}
            />
          </label>

          <Aba ativa={soSemVideo} onClick={() => setSoSemVideo((v) => !v)}>
            Só sem vídeo{r.semVideo > 0 && ` (${r.semVideo})`}
          </Aba>

          {filtrando && (
            <Botao
              type="button"
              aparencia="fantasma"
              tamanho="sm"
              onClick={() => {
                setBusca("");
                setGrupo("todos");
                setSoSemVideo(false);
              }}
            >
              Limpar
            </Botao>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Aba ativa={grupo === "todos"} onClick={() => setGrupo("todos")}>
            Todos
          </Aba>
          {gruposComItem.map((g) => (
            <Aba key={g.valor} ativa={grupo === g.valor} onClick={() => setGrupo(g.valor)}>
              {g.nome}
            </Aba>
          ))}
        </div>
      </div>

      {filtrada.length === 0 ? (
        <p className="rounded-2xl border border-linha bg-tinta-2 px-6 py-16 text-center text-[15px] leading-relaxed text-nevoa">
          {lista.length === 0
            ? "A biblioteca está vazia. Cadastre o primeiro exercício em Novo exercício."
            : "Nenhum exercício com esse filtro. Tente outra palavra ou limpe o filtro."}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {secoes.map((s) => (
            <section
              key={s.grupo}
              className="overflow-hidden rounded-2xl border border-linha bg-tinta-2"
            >
              <h2 className="flex items-baseline gap-2 bg-tinta-3 px-5 py-3 text-xs font-semibold uppercase tracking-[0.07em] text-nevoa">
                {NOME_DO_GRUPO[s.grupo]}
                <span className="font-mono text-[13px] normal-case tracking-normal">
                  {s.itens.length}
                </span>
              </h2>
              {/* Duas colunas no desktop: com 121 itens, uma coluna vira
                  rolagem longa e sobra espaco vazio na direita da linha. */}
              <ul className="lg:grid lg:grid-cols-2">
                {s.itens.map((e) => (
                  <Linha key={e.id} e={e} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
