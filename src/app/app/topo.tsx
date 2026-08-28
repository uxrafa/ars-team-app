"use client";

import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { Raio } from "@/components/raio";

/**
 * O topo do app.
 *
 * Na tela inicial ele é a marca. Nas outras vira o raio mais o nome da seção,
 * que é como os artboards resolvem: o aluno sempre sabe onde está sem gastar
 * uma linha de título no corpo.
 *
 * Na execução o topo some: lá a capa do vídeo ocupa o alto da tela e a seta de
 * voltar mora dentro dela.
 */
const TITULO: [RegExp, string][] = [
  [/^\/app\/evolucao/, "Evolução"],
  [/^\/app\/perfil/, "Perfil"],
  [/^\/app\/treino$/, "Treino"],
];

export function TopoDoApp() {
  const caminho = usePathname();

  if (/^\/app\/treino\/[^/]+/.test(caminho)) return null;

  const titulo = TITULO.find(([padrao]) => padrao.test(caminho))?.[1] ?? null;

  return (
    <header className="sticky top-0 z-30 border-b border-linha bg-[rgba(11,11,12,0.85)] backdrop-blur-md">
      <div className="mx-auto flex h-[53px] max-w-md items-center gap-2.5 px-5">
        {titulo ? (
          <>
            <Raio className="h-[18px] w-auto text-raio" />
            <span className="font-display text-[15px] uppercase tracking-[0.05em]">{titulo}</span>
          </>
        ) : (
          <Logo className="h-[18px] w-auto text-papel" />
        )}
      </div>
    </header>
  );
}
