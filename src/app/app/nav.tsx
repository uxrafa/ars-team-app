"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navegação de baixo, que é onde o polegar chega.
 *
 * Cinco abas na consultoria e três na planilha, como no desenho aprovado. As
 * que ainda não existem ficam apagadas e sem link, em vez de sumirem: o aluno
 * precisa saber que elas vêm, e aba que some hoje e reaparece amanhã bagunça a
 * memória de posição.
 *
 * Some inteira na tela de execução: lá o aluno está no meio da série, com o
 * celular apoiado em algum lugar, e qualquer coisa clicável fora do registro é
 * toque errado esperando para acontecer.
 */

export type NomeDeIcone = "hoje" | "semana" | "evolucao" | "chat" | "perfil" | "treino" | "videos";

export type Aba = {
  href: string | null;
  nome: string;
  icone: NomeDeIcone;
};

const ICONE: Record<NomeDeIcone, React.ReactNode> = {
  hoje: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </>
  ),
  semana: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 3v3M16 3v3" />
    </>
  ),
  evolucao: <path d="M4 19V9M11 19V5M18 19v-6" />,
  chat: (
    <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.7 8.7 0 0 1-4-1L3 20l1.1-3.4a8.7 8.7 0 0 1-1-4A8.38 8.38 0 0 1 11.5 4a8.5 8.5 0 0 1 9.5 7.5z" />
  ),
  perfil: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
    </>
  ),
  treino: <path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" />,
  videos: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M10.5 9.5v5l4.5-2.5z" />
    </>
  ),
};

function Simbolo({ icone }: { icone: NomeDeIcone }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[21px] w-[21px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONE[icone]}
    </svg>
  );
}

export function NavDoAluno({ abas }: { abas: Aba[] }) {
  const caminho = usePathname();

  // A execução ocupa a tela inteira.
  if (/^\/app\/treino\/[^/]+/.test(caminho)) return null;

  return (
    <nav
      aria-label="Seções"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-linha bg-[rgba(22,21,23,0.94)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <ul className="mx-auto flex h-[66px] max-w-md items-center">
        {abas.map((aba) => {
          const ativa =
            aba.href === "/app"
              ? caminho === "/app"
              : Boolean(aba.href) && caminho.startsWith(aba.href!);

          const miolo = (
            <>
              <Simbolo icone={aba.icone} />
              <span className={`text-[11px] ${ativa ? "font-bold" : ""}`}>{aba.nome}</span>
            </>
          );

          return (
            <li key={aba.nome} className="flex-1">
              {aba.href ? (
                <Link
                  href={aba.href}
                  aria-current={ativa ? "page" : undefined}
                  className={`flex h-[66px] flex-col items-center justify-center gap-1 transition-colors ${
                    ativa ? "text-raio" : "text-nevoa hover:text-papel"
                  }`}
                >
                  {miolo}
                </Link>
              ) : (
                <span
                  title="Ainda não construído"
                  aria-disabled="true"
                  className="flex h-[66px] cursor-not-allowed flex-col items-center justify-center gap-1 text-nevoa/45"
                >
                  {miolo}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
