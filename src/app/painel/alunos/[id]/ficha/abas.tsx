"use client";

import type { BlocoNaTela } from "@/lib/ficha";

function Mais() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/**
 * Os treinos como guias de navegador, e não empilhados um embaixo do outro.
 *
 * Com três treinos de oito exercícios, a lista vertical passava de duas telas
 * de rolagem só para chegar no Treino C. Aqui o Allisson vê os três de uma vez
 * e troca com um toque, e só o treino aberto é desenhado: além de resolver a
 * rolagem, tira dois terços dos campos da página.
 *
 * A barra rola na horizontal quando não cabe, então oito treinos continuam
 * funcionando sem empurrar nada para baixo.
 */
export function AbasDeTreino({
  blocos,
  ativa,
  aoTrocar,
  aoAdicionar,
}: {
  blocos: BlocoNaTela[];
  ativa: number;
  aoTrocar: (i: number) => void;
  aoAdicionar: () => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Treinos da ficha"
      className="flex items-end gap-1 overflow-x-auto pb-px"
    >
      {blocos.map((b, i) => {
        const aberta = i === ativa;
        return (
          <button
            key={b.id ?? `novo-${i}`}
            type="button"
            role="tab"
            id={`aba-treino-${i}`}
            aria-selected={aberta}
            aria-controls={`painel-treino-${i}`}
            onClick={() => aoTrocar(i)}
            className={`flex min-h-11 flex-none items-center gap-2.5 rounded-t-xl border border-b-0 px-4 text-[15px] font-semibold transition-colors ${
              aberta
                ? "border-linha bg-tinta-2 text-papel"
                : "border-transparent bg-tinta-3/50 text-nevoa hover:bg-tinta-3 hover:text-papel"
            }`}
          >
            {b.nome || `Treino ${i + 1}`}
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[12px] tabular ${
                aberta ? "bg-tinta-3 text-nevoa" : "text-nevoa-fraca"
              }`}
            >
              {b.itens.length}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={aoAdicionar}
        aria-label="Adicionar treino"
        title="Adicionar treino"
        className="mb-px flex h-11 w-11 flex-none items-center justify-center rounded-t-xl text-nevoa transition-colors hover:bg-tinta-3 hover:text-papel"
      >
        <Mais />
      </button>
    </div>
  );
}
