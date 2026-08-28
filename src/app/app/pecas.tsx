import Link from "next/link";

/**
 * Peças visuais compartilhadas da área do aluno.
 *
 * Os valores aqui (raio de 16px no cartão, 10px na miniatura, 14px no nome do
 * exercício e 12px no dado) vêm dos artboards aprovados, não de gosto. Onde eu
 * subi um número foi por alvo de toque: linha clicável não fica abaixo de 44px,
 * que é o piso da WCAG e a régua do sistema de interface.
 */

/* ------------------------------------------------------------------ */
/* Miniatura do exercício                                              */
/* ------------------------------------------------------------------ */

/**
 * Cada grupo muscular tem seu tom na miniatura. É o que o desenho faz: dá
 * ritmo de cor na lista sem inventar um ícone diferente para cada exercício.
 */
const TOM_DO_GRUPO: Record<string, string> = {
  peito: "#2a1310",
  costas: "#101c2a",
  pernas: "#102418",
  ombro: "#241a10",
  biceps: "#1a1024",
  triceps: "#1a1024",
  abdomen: "#24101c",
  cardio: "#2a1310",
  mobilidade: "#101c24",
  outros: "#1c1b20",
};

export function Miniatura({
  grupo,
  temVideo,
  tamanho = 48,
}: {
  grupo: string;
  temVideo: boolean;
  tamanho?: 44 | 48;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-[10px] ${
        tamanho === 48 ? "h-12 w-12" : "h-11 w-11"
      }`}
      style={{
        background: `linear-gradient(135deg, ${TOM_DO_GRUPO[grupo] ?? TOM_DO_GRUPO.outros}, #0b0b0c)`,
      }}
    >
      {temVideo ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-papel" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      ) : (
        // Sem vídeo gravado ainda: haltere no lugar do play, para não prometer
        // um vídeo que não abre.
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-nevoa"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M6.5 7v10M17.5 7v10M3 10v4M21 10v4M6.5 12h11" />
        </svg>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Linha de exercício                                                  */
/* ------------------------------------------------------------------ */

const LINHA =
  "flex min-h-[68px] items-center gap-3 px-[18px] py-3 text-left";

export function LinhaDeExercicio({
  nome,
  meta,
  grupo,
  temVideo,
  href,
  externo,
  marca,
}: {
  nome: string;
  meta: string;
  grupo: string;
  temVideo: boolean;
  href?: string;
  /** Link que sai do app, como o vídeo no YouTube. */
  externo?: boolean;
  /** Substitui a seta: a contagem de séries feitas, por exemplo. */
  marca?: React.ReactNode;
}) {
  const conteudo = (
    <>
      <Miniatura grupo={grupo} temVideo={temVideo} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-papel">{nome}</span>
        <span className="mt-0.5 block text-xs text-nevoa">{meta}</span>
      </span>
      {/* Seta só onde há para onde ir. Chevron em linha que não abre nada é
          promessa que a tela não cumpre. */}
      {marca ??
        (href ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4 flex-none text-nevoa"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        ) : null)}
    </>
  );

  const clicavel = `${LINHA} transition-colors hover:bg-tinta-3`;

  return (
    <li className="border-t border-linha first:border-t-0">
      {href && externo ? (
        <a href={href} target="_blank" rel="noreferrer" className={clicavel}>
          {conteudo}
        </a>
      ) : href ? (
        <Link href={href} className={clicavel}>
          {conteudo}
        </Link>
      ) : (
        <div className={LINHA}>{conteudo}</div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Texto                                                               */
/* ------------------------------------------------------------------ */

/** Linha de dado em mono, caixa alta: "FICHA ATÉ 20/SET", "~50 MIN". */
export function Meta({
  children,
  tom = "nevoa",
  className = "",
}: {
  children: React.ReactNode;
  tom?: "nevoa" | "raio" | "papel";
  className?: string;
}) {
  const cor = tom === "raio" ? "text-raio-forte" : tom === "papel" ? "text-papel" : "text-nevoa";
  return (
    <span className={`font-mono text-xs uppercase tracking-[0.07em] tabular ${cor} ${className}`}>
      {children}
    </span>
  );
}

/** Selo de plano: "Consultoria", "Planilha". */
export function Selo({ tom, children }: { tom: "raio" | "neutro"; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${
        tom === "raio"
          ? "border border-raio/30 bg-raio/15 text-raio-forte"
          : "border border-linha bg-tinta-2 text-nevoa"
      }`}
    >
      {children}
    </span>
  );
}

/** Cartão de número: 4 SÉRIES, 10-12 REPS, 60s DESCANSO. */
export function CartaoDeNumero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="flex-1 rounded-xl border border-linha bg-tinta-2 px-2 py-3 text-center">
      <div className="font-display text-[19px] uppercase leading-none tracking-wide">{valor}</div>
      <div className="mt-1 font-mono text-xs uppercase tracking-[0.08em] text-nevoa">{rotulo}</div>
    </div>
  );
}
