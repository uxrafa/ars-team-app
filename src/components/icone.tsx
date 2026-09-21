/**
 * Ícones de traço, no mesmo desenho da navegação do aluno (24px, traço 2).
 *
 * Ícone aqui é placa de sinalização: diz em que parte da tela a pessoa está.
 * Nunca é o único jeito de entender algo, então fica fora da leitura de tela.
 */

export type NomeIcone =
  | "alvo"
  | "prato"
  | "gota"
  | "relogio"
  | "haltere"
  | "lua"
  | "chama"
  | "lixeira"
  | "fechar"
  | "mais"
  | "lista";

const DESENHO: Record<NomeIcone, React.ReactNode> = {
  alvo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  prato: (
    <>
      <circle cx="13" cy="12" r="7" />
      <circle cx="13" cy="12" r="3.5" />
      <path d="M3.5 3v18M2 3v4.5a1.5 1.5 0 0 0 3 0V3" />
    </>
  ),
  gota: <path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z" />,
  relogio: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  haltere: <path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" />,
  lua: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  // Chama com a lingueta interna, senão lê como a gota da água.
  chama: (
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  ),
  lixeira: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  fechar: <path d="M6 6l12 12M18 6L6 18" />,
  mais: <path d="M12 5v14M5 12h14" />,
  lista: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
};

export function Icone({
  nome,
  tamanho = 20,
  className = "",
}: {
  nome: NomeIcone;
  tamanho?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`flex-none ${className}`}
    >
      {DESENHO[nome]}
    </svg>
  );
}
