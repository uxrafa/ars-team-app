"use client";

import { useEffect, useRef } from "react";
import { BotaoIcone } from "@/components/ui";
import { Icone } from "@/components/icone";

/**
 * Modal do app.
 *
 * Existe porque abrir um formulário no fim de uma tela longa faz a ação
 * acontecer fora do campo de visão: o aluno tocava em "Nova" nas fotos e nada
 * parecia mudar, porque o formulário nascia bem mais abaixo (Rafael, 23/09).
 * Aqui o que ele pediu aparece na frente, com o resto escurecido.
 *
 * Fecha no Esc, no toque fora e no X. A rolagem do fundo trava enquanto está
 * aberto, senão o dedo arrasta a página atrás do painel.
 */
export function Modal({
  titulo,
  descricao,
  aoFechar,
  children,
}: {
  titulo: string;
  descricao?: string;
  aoFechar: () => void;
  children: React.ReactNode;
}) {
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // O foco entra no painel para o teclado e o leitor de tela irem junto.
    painel.current?.focus();

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const naTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", naTecla);

    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", naTecla);
    };
  }, [aoFechar]);

  return (
    <div
      className="cortina fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-[2px] sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className="painel-modal flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-linha bg-tinta-2 outline-none sm:rounded-2xl"
      >
        <div className="flex items-start gap-3 border-b border-linha px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold text-papel">{titulo}</h2>
            {descricao && <p className="mt-1 text-[13.5px] leading-[1.5] text-nevoa">{descricao}</p>}
          </div>
          <BotaoIcone rotulo="Fechar" type="button" onClick={aoFechar}>
            <Icone nome="fechar" tamanho={18} />
          </BotaoIcone>
        </div>

        {/* pb com área segura: no iPhone o painel encosta na barra de gestos. */}
        <div className="overflow-y-auto px-5 py-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
