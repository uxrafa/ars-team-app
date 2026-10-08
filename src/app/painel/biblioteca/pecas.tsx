"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Peças das duas abas da Biblioteca. Saíram de `visao.tsx` quando os
 * alimentos chegaram (08/10): a busca e o filtro têm de ser os mesmos, senão
 * ele aprende duas telas para a mesma coisa.
 */

export function Lupa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

/** Pílula de filtro. É botão de verdade, com contorno, não texto solto. */
export function Aba({
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

/**
 * Exercícios | Alimentos. Mesmo desenho das abas do aluno (traço embaixo),
 * e não pílula: pílula aqui é filtro, e aba é lugar.
 */
export function AbasDaBiblioteca() {
  const caminho = usePathname();
  const abas = [
    { href: "/painel/biblioteca", nome: "Exercícios" },
    { href: "/painel/biblioteca/alimentos", nome: "Alimentos" },
  ];

  return (
    <nav aria-label="Seções da biblioteca" className="flex gap-1 border-b border-linha">
      {abas.map((aba) => {
        const ativa = caminho === aba.href;
        return (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={ativa ? "page" : undefined}
            className={`relative flex min-h-11 flex-none items-center px-4 text-[15px] font-semibold transition-colors ${
              ativa ? "text-papel" : "text-nevoa hover:text-papel"
            }`}
          >
            {aba.nome}
            {ativa && (
              <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-raio" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
