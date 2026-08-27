"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * As abas do painel, com o traço vermelho embaixo da aba atual.
 *
 * É client component só por causa disso: saber em que página se está pede
 * `usePathname`. O resto do cabeçalho continua no servidor.
 */
export function Abas({
  abas,
  emBreve,
}: {
  abas: readonly { href: string; nome: string }[];
  emBreve: readonly string[];
}) {
  const caminho = usePathname();

  return (
    <nav className="flex items-center gap-1 self-stretch text-[15px]">
      {abas.map((aba) => {
        // "/painel" só casa exato, senão ficaria aceso em todas as telas.
        const ativa =
          aba.href === "/painel" ? caminho === "/painel" : caminho.startsWith(aba.href);

        return (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={ativa ? "page" : undefined}
            className={`relative flex min-h-11 items-center px-3 font-semibold transition-colors ${
              ativa ? "text-papel" : "text-nevoa hover:text-papel"
            }`}
          >
            {aba.nome}
            {ativa && (
              <span
                aria-hidden="true"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-raio"
              />
            )}
          </Link>
        );
      })}

      {emBreve.map((nome) => (
        <span
          key={nome}
          title="Ainda não construído"
          className="hidden min-h-11 cursor-not-allowed items-center px-3 text-nevoa/45 sm:flex"
        >
          {nome}
        </span>
      ))}
    </nav>
  );
}
