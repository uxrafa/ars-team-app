"use client";

import { useMemo, useState } from "react";
import { Botao, CLASSE_CAMPO, Pilula } from "@/components/ui";
import {
  GRUPOS,
  NOME_DO_GRUPO,
  filtrar,
  type Grupo,
  type LinhaExercicio,
} from "@/lib/biblioteca";

/**
 * Escolher exercício sem sair da ficha.
 *
 * Reusa o filtro da biblioteca de propósito: é a mesma regra de busca sem
 * acento, então procurar "triceps" aqui acha o mesmo que acha lá.
 */
export function Seletor({
  exercicios,
  jaNaFicha,
  aoEscolher,
  aoFechar,
}: {
  exercicios: LinhaExercicio[];
  jaNaFicha: Set<string>;
  aoEscolher: (e: LinhaExercicio) => void;
  aoFechar: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState<Grupo | "todos">("todos");

  const gruposComItem = useMemo(
    () => GRUPOS.filter((g) => exercicios.some((e) => e.grupo === g.valor)),
    [exercicios],
  );

  const achados = useMemo(
    () => filtrar(exercicios, { busca, grupo, soSemVideo: false }),
    [exercicios, busca, grupo],
  );

  return (
    <div className="border-t border-linha bg-tinta-3/40 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          autoFocus
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar exercício"
          className={`${CLASSE_CAMPO} min-w-[220px] flex-1`}
        />
        <Botao type="button" onClick={aoFechar} aparencia="fantasma" tamanho="sm">
          Fechar
        </Botao>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {[{ valor: "todos" as const, nome: "Todos" }, ...gruposComItem].map((g) => (
          <button
            key={g.valor}
            type="button"
            onClick={() => setGrupo(g.valor as Grupo | "todos")}
            aria-pressed={grupo === g.valor}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-[15px] font-semibold transition-colors ${
              grupo === g.valor
                ? "border-raio-solido bg-raio-solido text-papel"
                : "border-contorno bg-tinta-3 text-nevoa hover:border-nevoa hover:text-papel"
            }`}
          >
            {g.nome}
          </button>
        ))}
      </div>

      {achados.length === 0 ? (
        <p className="px-4 py-8 text-center text-[15px] leading-relaxed text-nevoa">
          Nenhum exercício com esse filtro. Se ele não existe na biblioteca, cadastre em
          Biblioteca e volte aqui.
        </p>
      ) : (
        <ul className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-linha bg-tinta-2">
          {achados.map((e) => {
            const repetido = jaNaFicha.has(e.id);
            return (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-3 border-t border-linha px-4 py-3 first:border-t-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-papel">{e.nome}</span>
                  <span className="mt-0.5 block text-sm text-nevoa">
                    {NOME_DO_GRUPO[e.grupo]}
                    {e.equipamento ? ` · ${e.equipamento}` : ""}
                  </span>
                </span>

                {/* Repetir exercício na mesma ficha é legítimo (bi-set, ou o
                    mesmo movimento em dois treinos), então isto avisa e não
                    bloqueia. */}
                {repetido && <Pilula tom="aviso">Já está na ficha</Pilula>}

                <Botao type="button" onClick={() => aoEscolher(e)} aparencia="secundario" tamanho="sm">
                  Adicionar
                </Botao>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
