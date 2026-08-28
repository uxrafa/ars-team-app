"use client";

import { useState } from "react";
import { BotaoLink } from "@/components/ui";
import { LinhaDeExercicio, Meta } from "./pecas";
import { ComecarTreino } from "./comecar";
import { carga as formatarCarga, duracaoEstimada, type BlocoDoAluno } from "@/lib/treino";

/**
 * O cartão do treino do dia.
 *
 * Quando a ficha tem mais de um treino, os A/B/C viram um seletor no topo do
 * cartão, que é o mesmo controle do artboard da planilha. Isso resolve o
 * "quero fazer o B hoje" sem precisar da aba Semana, que ainda não existe, e
 * sem uma segunda lista solta embaixo.
 *
 * Com treino em andamento o seletor some: trocar de treino no meio da sessão
 * não é uma coisa que exista, e o botão passa a ser continuar.
 */
export function CartaoDoTreino({
  blocos,
  sugerido,
  sessaoAberta,
  seriesFeitas,
  seriesPrescritas,
  ultimaCarga,
  treinouHoje,
  diaDeTreino,
}: {
  blocos: BlocoDoAluno[];
  sugerido: string;
  sessaoAberta: boolean;
  seriesFeitas: number;
  seriesPrescritas: number;
  ultimaCarga: Record<string, number>;
  treinouHoje: boolean;
  diaDeTreino: boolean;
}) {
  const [escolhido, setEscolhido] = useState(sugerido);
  const bloco = blocos.find((b) => b.id === escolhido) ?? blocos[0];
  if (!bloco) return null;

  const trocavel = blocos.length > 1 && !sessaoAberta;

  return (
    <section className="overflow-hidden rounded-2xl border border-linha bg-tinta-2">
      <div className="px-[18px] pb-3 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <Meta tom={sessaoAberta ? "raio" : treinouHoje ? "nevoa" : "raio"}>
            {sessaoAberta
              ? "Treino em andamento"
              : treinouHoje
                ? "Próximo treino"
                : diaDeTreino
                  ? "Treino de hoje"
                  : "Quando você quiser"}
          </Meta>
          <Meta>
            {sessaoAberta
              ? `${seriesFeitas} de ${seriesPrescritas} séries`
              : `~${duracaoEstimada(bloco)} min`}
          </Meta>
        </div>
        <h2 className="mt-1 text-[17px] font-bold leading-snug">
          {bloco.nome}
          {bloco.foco && ` · ${bloco.foco}`}
        </h2>
      </div>

      {trocavel && (
        <div
          role="tablist"
          aria-label="Treinos da sua ficha"
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
        {bloco.itens.map((i) => {
          const ultima = ultimaCarga[i.exercicio_id];
          return (
            <LinhaDeExercicio
              key={i.id}
              nome={i.nome}
              grupo={i.grupo}
              temVideo={Boolean(i.video_url)}
              meta={
                `${i.series} séries × ${i.reps} reps` +
                (ultima ? ` · última ${formatarCarga(ultima)} kg` : "")
              }
            />
          );
        })}
      </ul>

      <div className="px-[18px] pb-[18px] pt-4">
        {sessaoAberta ? (
          <BotaoLink href="/app/treino" largura="cheia">
            Continuar treino
          </BotaoLink>
        ) : (
          <ComecarTreino blocoId={bloco.id}>
            {treinouHoje ? "Treinar de novo" : "Começar treino"}
          </ComecarTreino>
        )}
      </div>
    </section>
  );
}
