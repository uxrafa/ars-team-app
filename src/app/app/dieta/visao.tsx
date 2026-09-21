"use client";

import { useMemo, useState } from "react";
import { Cartao, Pilula, Rotulo } from "@/components/ui";
import { Icone } from "@/components/icone";
import {
  gramas,
  kcal,
  linhas,
  litros,
  macrosDoDia,
  milhar,
  porHorario,
  proximaRefeicao,
  type Alimento,
  type Dia,
} from "@/lib/dieta";
import type { OrientacaoNaTela } from "@/app/painel/alunos/[id]/dieta/carregar";

/**
 * O que comer hoje, de pé, com uma mão.
 *
 * Abre no dia certo (treino ou descanso) e marca a próxima refeição. O aluno
 * só consulta: não registra nada, por decisão do Rafael em 21/09.
 *
 * Client só pela troca de dia, que é estado de tela e não merece ida ao
 * servidor.
 */
export function VisaoDaDieta({
  orientacao,
  alimentos,
  hoje,
  temDescanso,
  agora,
}: {
  orientacao: OrientacaoNaTela;
  alimentos: Alimento[];
  hoje: Dia;
  temDescanso: boolean;
  agora: string;
}) {
  const [dia, setDia] = useState<Dia>(hoje);
  const mapa = useMemo(() => new Map(alimentos.map((a) => [a.id, a])), [alimentos]);

  const refeicoes = porHorario(orientacao.refeicoes.filter((r) => r.dia === dia));
  const total = macrosDoDia(orientacao.refeicoes, dia, mapa);
  // "Próxima" só faz sentido no dia de hoje.
  const proxima = dia === hoje ? proximaRefeicao(refeicoes.map((r) => r.horario), agora) : null;
  const dicas = linhas(orientacao.orientacoes);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-3xl uppercase leading-none tracking-wide">Dieta</h1>
        <div className="flex flex-wrap gap-2">
          {kcal(total) > 0 && (
            <Pilula>
              <Icone nome="chama" tamanho={15} className="mr-1.5" />
              {milhar(kcal(total))} kcal · P {gramas(total.proteina)}
            </Pilula>
          )}
          {orientacao.agua_litros && (
            <Pilula>
              <Icone nome="gota" tamanho={15} className="mr-1.5" />
              Água {litros(orientacao.agua_litros)}
            </Pilula>
          )}
        </div>
      </header>

      {temDescanso && (
        <div role="tablist" aria-label="Dia" className="grid grid-cols-2 gap-2">
          {(["treino", "descanso"] as Dia[]).map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={dia === d}
              onClick={() => setDia(d)}
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-[15px] font-semibold transition-colors ${
                dia === d ? "border-raio bg-tinta-3 text-papel" : "border-contorno text-nevoa"
              }`}
            >
              <Icone nome={d === "treino" ? "haltere" : "lua"} tamanho={18} className={dia === d ? "text-raio" : ""} />
              {d === "treino" ? "Treino" : "Descanso"}
              {d === hoje ? " · hoje" : ""}
            </button>
          ))}
        </div>
      )}

      <ol className="flex flex-col gap-3">
        {refeicoes.map((r, k) => (
          <li key={r.chave}>
            {/* A refeição de agora é a única coisa que ele procura ao abrir:
                borda da marca e fundo um tom acima, para achar sem ler. A que
                está sem alimento recua, para não competir com as outras. */}
            <Cartao
              padding={false}
              className={
                k === proxima
                  ? "border-raio/70 bg-tinta-3"
                  : r.itens.length === 0
                    ? "border-dashed bg-transparent opacity-60"
                    : ""
              }
            >
              <div className="flex items-center gap-3 px-4 pt-4">
                {r.horario && (
                  <span className={`inline-flex items-center gap-1.5 font-mono text-[15px] ${k === proxima ? "text-papel" : "text-nevoa"}`}>
                    <Icone nome="relogio" tamanho={16} />
                    {r.horario}
                  </span>
                )}
                <h2 className="flex-1 text-[17px] font-semibold text-papel">{r.nome}</h2>
                {k === proxima && <Pilula tom="urgente">Agora</Pilula>}
              </div>
              {r.itens.length === 0 && <p className="px-4 pb-4 pt-2 text-[15px] text-nevoa">Sem alimentos</p>}
              <ul className={r.itens.length ? "px-4 pb-4 pt-2" : "hidden"}>
                {r.itens.map((i, x) => {
                  const a = i.alimento_id ? mapa.get(i.alimento_id) : undefined;
                  return (
                    <li key={x} className="flex items-baseline gap-3 border-t border-linha py-2.5 first:border-t-0">
                      <span className="flex-1 text-[15px] leading-snug text-papel">
                        {a ? a.nome : i.descricao}
                      </span>
                      {a && i.gramas && (
                        <span className="flex-none text-right text-[15px] text-nevoa">
                          {i.descricao ? `${i.descricao} · ` : ""}
                          <span className="font-mono">{Math.round(i.gramas)} g</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Cartao>
          </li>
        ))}
      </ol>

      {dicas.length > 0 && (
        <Cartao>
          <div className="flex items-center gap-2 text-nevoa">
            <Icone nome="lista" tamanho={16} />
            <Rotulo>Orientações</Rotulo>
          </div>
          <ul className="mt-3 flex flex-col gap-2.5">
            {dicas.map((d, k) => (
              <li key={k} className="flex gap-2.5 text-[15px] leading-relaxed text-papel">
                <span aria-hidden="true" className="text-raio">•</span>
                {d}
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  );
}
