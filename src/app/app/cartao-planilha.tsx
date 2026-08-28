"use client";

import { useState } from "react";
import { NOME_DO_METODO, emMinutos } from "@/lib/ficha";
import type { BlocoDoAluno } from "@/lib/treino";
import { LinhaDeExercicio, Meta } from "./pecas";

/**
 * A planilha do aluno que comprou o produto.
 *
 * Sem check-in e sem sessão: é a ficha aberta, com os treinos num seletor e o
 * vídeo de execução a um toque. A linha só vira link quando o vídeo existe;
 * exercício sem vídeo gravado não deve parecer clicável.
 */
export function CartaoDaPlanilha({
  nome,
  resumo,
  blocos,
}: {
  nome: string;
  resumo: string;
  blocos: BlocoDoAluno[];
}) {
  const [escolhido, setEscolhido] = useState(blocos[0]?.id ?? "");
  const bloco = blocos.find((b) => b.id === escolhido) ?? blocos[0];
  if (!bloco) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-linha bg-tinta-2">
      <div className="px-[18px] pb-3.5 pt-4">
        <Meta>Sua planilha</Meta>
        <h2 className="mt-1 text-[17px] font-bold">{nome}</h2>
        <p className="mt-0.5 text-[13.5px] text-nevoa">{resumo}</p>
      </div>

      {blocos.length > 1 && (
        <div
          role="tablist"
          aria-label="Treinos da planilha"
          className="flex gap-[7px] px-[18px] pb-3.5"
        >
          {blocos.map((b) => {
            const atual = b.id === bloco.id;
            return (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={atual}
                onClick={() => setEscolhido(b.id)}
                className={`min-h-11 flex-1 rounded-[10px] px-2 text-[13px] transition-colors ${
                  atual
                    ? "bg-raio-solido font-bold text-papel"
                    : "border border-contorno text-nevoa hover:text-papel"
                }`}
              >
                {b.nome}
              </button>
            );
          })}
        </div>
      )}

      <ul>
        {bloco.itens.map((i) => (
          <LinhaDeExercicio
            key={i.id}
            nome={i.nome}
            grupo={i.grupo}
            temVideo={Boolean(i.video_url)}
            href={i.video_url ?? undefined}
            externo
            meta={
              `${i.series} séries × ${i.reps} reps · descanso ${emMinutos(i.descanso_seg)}` +
              (i.metodo !== "normal" ? ` · ${NOME_DO_METODO[i.metodo]}` : "")
            }
          />
        ))}
      </ul>
    </section>
  );
}
