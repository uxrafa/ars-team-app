"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navegação de baixo, que é onde o polegar chega.
 *
 * Some na tela de execução: lá o aluno está no meio da série, com o celular
 * apoiado em algum lugar, e qualquer coisa clicável fora do registro é toque
 * errado esperando para acontecer.
 */

type Aba = { href: string; nome: string; icone: "hoje" | "evolucao" | "perfil" };

const ICONE: Record<Aba["icone"], React.ReactNode> = {
  hoje: (
    <path d="M4 7h16M4 7v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7M4 7l1-3h14l1 3M9 12h6" />
  ),
  evolucao: <path d="M4 18l5-6 4 3 6-8M20 7h-4M20 7v4" />,
  perfil: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0" />,
};

export function NavDoAluno({ abas }: { abas: Aba[] }) {
  const caminho = usePathname();

  // A execução ocupa a tela inteira.
  if (/^\/app\/treino\/[^/]+/.test(caminho)) return null;

  return (
    <nav
      aria-label="Seções"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-linha bg-tinta/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md">
        {abas.map((aba) => {
          const ativa =
            aba.href === "/app" ? caminho === "/app" : caminho.startsWith(aba.href);

          return (
            <li key={aba.href} className="flex-1">
              <Link
                href={aba.href}
                aria-current={ativa ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[13px] font-semibold transition-colors ${
                  ativa ? "text-papel" : "text-nevoa"
                }`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke={ativa ? "var(--color-raio)" : "currentColor"}
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {ICONE[aba.icone]}
                </svg>
                {aba.nome}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
