/**
 * Peças da interface da ARS Team.
 *
 * Regras que valem para tudo aqui:
 *
 * 1. Botão usa a fonte do CORPO, nunca a Tanker. A Tanker é fonte de
 *    título: em rótulo de botão, em caixa alta e com entreletra larga,
 *    ela vira cartaz e o botão deixa de parecer um controle.
 * 2. Nada clicável abaixo de 44px de altura. Primário fica em 48.
 * 3. Toda coisa clicável tem contorno ou preenchimento visível.
 *    Texto solto não é botão.
 * 4. Tamanho de texto mínimo é 14px, e o padrão é 16px.
 */

import type { ComponentProps, ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Botão                                                               */
/* ------------------------------------------------------------------ */

type Aparencia = "primario" | "secundario" | "fantasma";
type Tamanho = "md" | "sm";

const APARENCIA: Record<Aparencia, string> = {
  // Vermelho sólido usa o tom que passa em contraste com rótulo branco.
  primario:
    "bg-raio-solido text-papel border border-raio-solido " +
    "hover:bg-raio-fundo hover:border-raio-fundo active:bg-raio-fundo",
  // Contorno de 3:1: é o que faz parecer botão, e não linha decorativa.
  secundario:
    "bg-tinta-3 text-papel border border-contorno " +
    "hover:border-nevoa hover:bg-tinta-3/70",
  fantasma:
    "bg-transparent text-nevoa border border-contorno " +
    "hover:text-papel hover:border-nevoa",
};

const TAMANHO: Record<Tamanho, string> = {
  md: "min-h-12 px-5 text-base",
  sm: "min-h-11 px-4 text-[15px]",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-sans font-semibold " +
  "leading-none transition-colors duration-150 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

type BotaoProps = {
  aparencia?: Aparencia;
  tamanho?: Tamanho;
  largura?: "auto" | "cheia";
  children: ReactNode;
  className?: string;
};

export function Botao({
  aparencia = "primario",
  tamanho = "md",
  largura = "auto",
  className = "",
  children,
  ...resto
}: BotaoProps & ComponentProps<"button">) {
  return (
    <button
      {...resto}
      className={`${BASE} ${APARENCIA[aparencia]} ${TAMANHO[tamanho]} ${
        largura === "cheia" ? "w-full" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function BotaoLink({
  aparencia = "primario",
  tamanho = "md",
  largura = "auto",
  className = "",
  children,
  ...resto
}: BotaoProps & ComponentProps<"a">) {
  return (
    <a
      {...resto}
      className={`${BASE} ${APARENCIA[aparencia]} ${TAMANHO[tamanho]} ${
        largura === "cheia" ? "w-full" : ""
      } ${className}`}
    >
      {children}
    </a>
  );
}

/** Botão só de ícone. 44x44 sempre, com nome acessível obrigatório. */
export function BotaoIcone({
  rotulo,
  className = "",
  children,
  ...resto
}: { rotulo: string; children: ReactNode; className?: string } & ComponentProps<"button">) {
  return (
    <button
      {...resto}
      aria-label={rotulo}
      title={rotulo}
      className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-contorno text-nevoa transition-colors duration-150 hover:border-nevoa hover:text-papel ${className}`}
    >
      {children}
    </button>
  );
}

export function LinkIcone({
  rotulo,
  className = "",
  children,
  ...resto
}: { rotulo: string; children: ReactNode; className?: string } & ComponentProps<"a">) {
  return (
    <a
      {...resto}
      aria-label={rotulo}
      title={rotulo}
      className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-contorno text-nevoa transition-colors duration-150 hover:border-nevoa hover:text-papel ${className}`}
    >
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Pílula de estado                                                    */
/* ------------------------------------------------------------------ */

export type Tom = "ok" | "aviso" | "urgente" | "neutro";

const TOM_PILULA: Record<Tom, string> = {
  ok: "border-ok/40 bg-ok/12 text-ok",
  aviso: "border-alerta/40 bg-alerta/12 text-alerta",
  urgente: "border-raio/50 bg-raio/15 text-raio-forte",
  neutro: "border-contorno text-nevoa",
};

export function Pilula({ tom = "neutro", children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-semibold ${TOM_PILULA[tom]}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Texto                                                               */
/* ------------------------------------------------------------------ */

/**
 * Rótulo de seção. Antes era 10.5px com entreletra de 0.11em, o que é
 * bonito parado e ruim de ler. Agora 12px com entreletra contida.
 */
export function Rotulo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`block text-xs font-semibold uppercase tracking-[0.07em] text-nevoa ${className}`}
    >
      {children}
    </span>
  );
}

/** Dado que precisa alinhar em coluna: peso, data, contagem. */
export function Dado({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-[13px] tabular text-nevoa ${className}`}>{children}</span>
  );
}

/* ------------------------------------------------------------------ */
/* Campo de formulário                                                 */
/* ------------------------------------------------------------------ */

export const CLASSE_CAMPO =
  "w-full min-h-12 rounded-xl border border-contorno bg-tinta-3 px-4 py-3 text-base text-papel " +
  "outline-none transition-colors duration-150 placeholder:text-nevoa-fraca " +
  "focus:border-raio focus:ring-[3px] focus:ring-raio/30";

export function Campo({
  rotulo,
  sufixo,
  dica,
  className = "",
  ...resto
}: { rotulo: string; sufixo?: string; dica?: string; className?: string } & ComponentProps<"input">) {
  return (
    <label className="flex flex-col gap-2">
      <Rotulo>{rotulo}</Rotulo>
      <span className="relative block">
        <input {...resto} className={`${CLASSE_CAMPO} ${sufixo ? "pr-12" : ""} ${className}`} />
        {sufixo && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-nevoa">
            {sufixo}
          </span>
        )}
      </span>
      {dica && <span className="text-sm text-nevoa">{dica}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Cartão                                                              */
/* ------------------------------------------------------------------ */

export function Cartao({
  children,
  className = "",
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border border-linha bg-tinta-2 ${padding ? "p-5" : ""} ${className}`}
    >
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Aviso                                                               */
/* ------------------------------------------------------------------ */

export function Aviso({ tom = "urgente", children }: { tom?: Tom; children: ReactNode }) {
  const cor =
    tom === "aviso"
      ? "border-alerta/40 bg-alerta/10 text-alerta"
      : tom === "ok"
        ? "border-ok/40 bg-ok/10 text-ok"
        : "border-raio/45 bg-raio/12 text-raio-forte";
  return (
    <p role="alert" className={`rounded-xl border px-4 py-3.5 text-[15px] leading-relaxed ${cor}`}>
      {children}
    </p>
  );
}
