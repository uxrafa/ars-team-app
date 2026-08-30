"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * As abas da tela de um aluno.
 *
 * Client component só por causa do `usePathname`, igual às abas do painel. A
 * ficha entra como aba, e não como tela separada: ela é uma das coisas
 * daquele aluno, não outro lugar.
 */
export function AbasDoAluno({ alunoId }: { alunoId: string }) {
  const caminho = usePathname();
  const base = `/painel/alunos/${alunoId}`;

  const abas = [
    { href: base, nome: "Resumo" },
    { href: `${base}/treinos`, nome: "Treinos" },
    { href: `${base}/evolucao`, nome: "Evolução" },
    { href: `${base}/ficha`, nome: "Ficha" },
  ];

  return (
    <nav aria-label="Seções do aluno" className="flex gap-1 overflow-x-auto border-b border-linha">
      {abas.map((aba) => {
        // O Resumo só casa exato, senão ficaria aceso em todas as abas.
        const ativa = aba.href === base ? caminho === base : caminho.startsWith(aba.href);

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
              <span
                aria-hidden="true"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-raio"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
