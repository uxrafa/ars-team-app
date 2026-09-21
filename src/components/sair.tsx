"use client";

import { useRef } from "react";
import { Botao } from "@/components/ui";

/**
 * O botão de sair, com confirmação.
 *
 * Pedido do Rafael em 21/09: sair sem querer derruba o aluno no meio do
 * treino, e no painel o ícone fica colado no nome do Allisson. Um toque
 * errado não pode custar um login.
 *
 * O modal é o `<dialog>` nativo, e não uma div posicionada: ele já prende o
 * foco dentro, fecha no Esc e volta o foco para o botão ao fechar. Três coisas
 * que uma div faz errado de três jeitos diferentes.
 *
 * Só a pergunta e dois botões. Explicar o que é sair seria ruído (regra do
 * "o mais simples", em `sistema-de-interface.md`). O foco nasce em Cancelar:
 * quem abriu sem querer e aperta Enter continua dentro.
 *
 * Um componente só para as quatro saídas do app (menu do painel, Perfil do
 * aluno, acesso pausado e conta encerrada): o mesmo gesto pede a mesma
 * resposta em todo lugar.
 */
export function BotaoSair({
  jeito = "botao",
  rotulo = "Sair",
}: {
  /**
   * "botao" é o de largura cheia do app do aluno; "icone" é o quadrado de
   * 44px do rodapé do menu do painel. Prop simples, e não um botão passado de
   * fora: as telas que usam isto são de servidor, e servidor não passa função
   * para componente de navegador.
   */
  jeito?: "botao" | "icone";
  rotulo?: string;
}) {
  const modal = useRef<HTMLDialogElement>(null);
  const cancelar = useRef<HTMLButtonElement>(null);

  function abrir() {
    modal.current?.showModal();
    cancelar.current?.focus();
  }

  return (
    <>
      {jeito === "icone" ? (
        <button
          type="button"
          onClick={abrir}
          aria-label={rotulo}
          title={rotulo}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-contorno text-nevoa transition-colors hover:border-nevoa hover:text-papel"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      ) : (
        <Botao type="button" onClick={abrir} aparencia="fantasma" largura="cheia">
          {rotulo}
        </Botao>
      )}

      <dialog
        ref={modal}
        aria-labelledby="titulo-sair"
        // Tocar fora da caixa fecha, como em qualquer modal de celular.
        onClick={(e) => e.target === e.currentTarget && modal.current?.close()}
        className="m-auto w-[min(92vw,360px)] rounded-2xl border border-linha bg-tinta-2 p-0 text-papel backdrop:bg-black/70"
      >
        <div className="flex flex-col gap-5 p-6">
          <h2 id="titulo-sair" className="text-lg font-bold">
            Sair da conta?
          </h2>
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Botao
              ref={cancelar}
              type="button"
              aparencia="fantasma"
              onClick={() => modal.current?.close()}
            >
              Cancelar
            </Botao>
            <form action="/auth/sair" method="post">
              <Botao type="submit" largura="cheia">
                Sair
              </Botao>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
