"use client";

import { Botao, BotaoIcone, CLASSE_CAMPO, Rotulo } from "@/components/ui";
import {
  METODOS,
  NOME_DO_METODO,
  emMinutos,
  mover,
  type BlocoNaTela,
  type ItemNaTela,
  type Metodo,
} from "@/lib/ficha";

function Seta({ para }: { para: "esquerda" | "direita" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {para === "esquerda" ? <path d="m15 6-6 6 6 6" /> : <path d="m9 6 6 6-6 6" />}
    </svg>
  );
}

function SetaVertical({ para }: { para: "cima" | "baixo" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {para === "cima" ? <path d="m6 15 6-6 6 6" /> : <path d="m6 9 6 6 6-6" />}
    </svg>
  );
}

function Xis() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/** A moldura da guia aberta: o topo é reto porque a aba encosta nele. */
const PAINEL =
  "overflow-hidden rounded-b-2xl rounded-tr-2xl border border-linha bg-tinta-2";

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

/**
 * O treino sem nenhum campo editável.
 *
 * É o estado normal da tela. Com tudo sempre em input, a ficha parecia um
 * formulário pela metade e nunca uma coisa pronta e salva; e cada exercício
 * carregava cinco controles, o que com três treinos passava de cem campos na
 * página. Aqui é tabela: lê rápido e não pede nada.
 */
export function BlocoLeitura({ bloco, indice }: { bloco: BlocoNaTela; indice: number }) {
  return (
    <section
      id={`painel-treino-${indice}`}
      role="tabpanel"
      aria-labelledby={`aba-treino-${indice}`}
      className={PAINEL}
    >
      {bloco.foco && (
        <p className="border-b border-linha bg-tinta-3 px-5 py-3 text-[15px] text-nevoa">
          {bloco.foco}
        </p>
      )}

      {bloco.itens.length === 0 ? (
        <p className="px-6 py-12 text-center text-[15px] leading-relaxed text-nevoa">
          Nenhum exercício neste treino ainda. Toque em Editar ficha para montar.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="bg-tinta-3">
                {["", "Exercício", "Séries", "Reps", "Descanso", "Método"].map((t, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.07em] text-nevoa"
                  >
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloco.itens.map((item, i) => (
                <tr key={item.id ?? `novo-${i}`} className="border-t border-linha align-top">
                  <td className="px-4 py-3.5 font-mono text-[13px] tabular text-nevoa">{i + 1}</td>
                  <td className="px-4 py-3.5">
                    <span className="block text-[15px] font-semibold text-papel">{item.nome}</span>
                    {item.observacao && (
                      <span className="mt-1 block text-sm leading-snug text-nevoa">
                        {item.observacao}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[13px] tabular text-papel">
                    {item.series || "?"}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[13px] tabular text-papel">
                    {item.reps || "?"}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[13px] tabular text-nevoa">
                    {emMinutos(item.descanso_seg)}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-nevoa">
                    {item.metodo === "normal" ? "—" : NOME_DO_METODO[item.metodo]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Edição                                                              */
/* ------------------------------------------------------------------ */

/** Campo estreito de número, para séries e descanso. */
function Numero({
  valor,
  aoMudar,
  sufixo,
  min,
  max,
}: {
  valor: number;
  aoMudar: (v: number) => void;
  sufixo?: string;
  min: number;
  max: number;
}) {
  return (
    <span className="relative block">
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={Number.isFinite(valor) ? valor : ""}
        onChange={(e) => aoMudar(e.target.value === "" ? NaN : Number(e.target.value))}
        className={`${CLASSE_CAMPO} ${sufixo ? "pr-10" : ""}`}
      />
      {sufixo && (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-nevoa">
          {sufixo}
        </span>
      )}
    </span>
  );
}

function Item({
  item,
  indice,
  total,
  aoMudar,
  aoMover,
  aoRemover,
}: {
  item: ItemNaTela;
  indice: number;
  total: number;
  aoMudar: (i: ItemNaTela) => void;
  aoMover: (passo: -1 | 1) => void;
  aoRemover: () => void;
}) {
  return (
    <li className="border-t border-linha px-5 py-4 first:border-t-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-linha bg-tinta-3 font-mono text-[13px] text-nevoa">
          {indice + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-papel">{item.nome}</span>
          <span className="mt-0.5 block text-sm text-nevoa">
            {item.series || 0} x {item.reps || "?"} · descanso {emMinutos(item.descanso_seg)}
          </span>
        </span>

        <span className="flex flex-none gap-1.5">
          <BotaoIcone
            rotulo="Subir exercício"
            onClick={() => aoMover(-1)}
            disabled={indice === 0}
            className="disabled:opacity-40"
          >
            <SetaVertical para="cima" />
          </BotaoIcone>
          <BotaoIcone
            rotulo="Descer exercício"
            onClick={() => aoMover(1)}
            disabled={indice === total - 1}
            className="disabled:opacity-40"
          >
            <SetaVertical para="baixo" />
          </BotaoIcone>
          <BotaoIcone rotulo={`Tirar ${item.nome} do treino`} onClick={aoRemover}>
            <Xis />
          </BotaoIcone>
        </span>
      </div>

      {/* Tudo numa linha só no desktop, observação incluída: com 8 exercícios
          por treino, cada campo em linha separada vira uma página de rolagem. */}
      <div className="mt-3.5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_1.6fr]">
        <label className="flex flex-col gap-1.5">
          <Rotulo>Séries</Rotulo>
          <Numero
            valor={item.series}
            min={1}
            max={20}
            aoMudar={(v) => aoMudar({ ...item, series: v })}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <Rotulo>Repetições</Rotulo>
          <input
            value={item.reps}
            onChange={(e) => aoMudar({ ...item, reps: e.target.value })}
            placeholder="10-12"
            className={CLASSE_CAMPO}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <Rotulo>Descanso</Rotulo>
          <Numero
            valor={item.descanso_seg}
            min={0}
            max={900}
            sufixo="seg"
            aoMudar={(v) => aoMudar({ ...item, descanso_seg: v })}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <Rotulo>Método</Rotulo>
          <select
            value={item.metodo}
            onChange={(e) => aoMudar({ ...item, metodo: e.target.value as Metodo })}
            className={CLASSE_CAMPO}
          >
            {METODOS.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2 xl:col-span-1">
          <Rotulo>Observação para o aluno</Rotulo>
          <input
            value={item.observacao}
            onChange={(e) => aoMudar({ ...item, observacao: e.target.value })}
            placeholder="Ex.: desce em 3 segundos"
            className={CLASSE_CAMPO}
          />
        </label>
      </div>
    </li>
  );
}

export function Bloco({
  bloco,
  indice,
  total,
  aoMudar,
  aoMover,
  aoRemover,
  aoAbrirSeletor,
  seletorAberto,
  children,
}: {
  bloco: BlocoNaTela;
  indice: number;
  total: number;
  aoMudar: (b: BlocoNaTela) => void;
  /** Move a guia inteira de lugar: -1 é para a esquerda. */
  aoMover: (passo: -1 | 1) => void;
  aoRemover: () => void;
  aoAbrirSeletor: () => void;
  seletorAberto: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section
      id={`painel-treino-${indice}`}
      role="tabpanel"
      aria-labelledby={`aba-treino-${indice}`}
      className={PAINEL}
    >
      <header className="flex flex-wrap items-end gap-3 bg-tinta-3 px-5 py-4">
        <label className="flex min-w-[140px] flex-col gap-1.5">
          <Rotulo>Treino</Rotulo>
          <input
            value={bloco.nome}
            onChange={(e) => aoMudar({ ...bloco, nome: e.target.value })}
            className={CLASSE_CAMPO}
          />
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
          <Rotulo>Foco</Rotulo>
          <input
            value={bloco.foco}
            onChange={(e) => aoMudar({ ...bloco, foco: e.target.value })}
            placeholder="Peito e tríceps"
            className={CLASSE_CAMPO}
          />
        </label>

        {/* A ordem dos treinos agora é a ordem das guias, então as setas
            apontam para os lados e não para cima e para baixo. */}
        <span className="flex flex-none gap-1.5">
          <BotaoIcone
            rotulo="Mover treino para a esquerda"
            onClick={() => aoMover(-1)}
            disabled={indice === 0}
            className="disabled:opacity-40"
          >
            <Seta para="esquerda" />
          </BotaoIcone>
          <BotaoIcone
            rotulo="Mover treino para a direita"
            onClick={() => aoMover(1)}
            disabled={indice === total - 1}
            className="disabled:opacity-40"
          >
            <Seta para="direita" />
          </BotaoIcone>
          <BotaoIcone rotulo={`Apagar ${bloco.nome}`} onClick={aoRemover}>
            <Xis />
          </BotaoIcone>
        </span>
      </header>

      {bloco.itens.length === 0 ? (
        <p className="px-6 py-10 text-center text-[15px] leading-relaxed text-nevoa">
          Nenhum exercício neste treino ainda.
        </p>
      ) : (
        <ul>
          {bloco.itens.map((item, i) => (
            <Item
              key={item.id ?? `novo-${i}`}
              item={item}
              indice={i}
              total={bloco.itens.length}
              aoMudar={(novo) =>
                aoMudar({ ...bloco, itens: bloco.itens.map((x, j) => (j === i ? novo : x)) })
              }
              aoMover={(passo) => aoMudar({ ...bloco, itens: mover(bloco.itens, i, passo) })}
              aoRemover={() =>
                aoMudar({ ...bloco, itens: bloco.itens.filter((_, j) => j !== i) })
              }
            />
          ))}
        </ul>
      )}

      <div className="border-t border-linha px-5 py-4">
        <Botao
          type="button"
          onClick={aoAbrirSeletor}
          aparencia={seletorAberto ? "fantasma" : "secundario"}
          tamanho="sm"
        >
          {seletorAberto ? "Fechar a biblioteca" : "Adicionar exercício"}
        </Botao>
      </div>

      {children}
    </section>
  );
}
