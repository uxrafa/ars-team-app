"use client";

import { useState, type ComponentProps } from "react";
import { CLASSE_CAMPO, Rotulo } from "./ui";

/**
 * Campo de senha com o olho de mostrar.
 *
 * Vive em arquivo separado do `ui.tsx` de proposito: precisa de estado, e
 * marcar o `ui.tsx` inteiro como client empurraria Botao, Cartao e Pilula
 * para o pacote do navegador sem necessidade.
 *
 * Digitar senha as cegas no celular e o que mais gera erro de login, e o
 * publico daqui digita de pe, na academia. O olho e um alvo de 44px e nao
 * pede nada do servidor.
 */
export function CampoSenha({
  rotulo,
  dica,
  className = "",
  ...resto
}: { rotulo: string; dica?: string; className?: string } & ComponentProps<"input">) {
  const [ver, setVer] = useState(false);

  return (
    <label className="flex flex-col gap-2">
      <Rotulo>{rotulo}</Rotulo>
      <span className="relative block">
        <input
          {...resto}
          type={ver ? "text" : "password"}
          className={`${CLASSE_CAMPO} pr-14 ${className}`}
        />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          aria-label={ver ? "Esconder a senha" : "Mostrar a senha"}
          aria-pressed={ver}
          title={ver ? "Esconder a senha" : "Mostrar a senha"}
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-nevoa transition-colors hover:text-papel"
        >
          {ver ? <OlhoFechado /> : <OlhoAberto />}
        </button>
      </span>
      {dica && <span className="text-sm leading-relaxed text-nevoa">{dica}</span>}
    </label>
  );
}

function OlhoAberto() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function OlhoFechado() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.3 3.9" />
      <path d="M6.3 8.2A16.7 16.7 0 0 0 2 12s3.6 6 10 6a9.9 9.9 0 0 0 4-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
