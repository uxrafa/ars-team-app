"use client";

import { useActionState } from "react";
import { Logo } from "@/components/logo";
import { entrar, type EstadoForm } from "./acoes";

const INICIAL: EstadoForm = {};

const campo =
  "w-full rounded-xl border border-linha bg-tinta-2 px-4 py-3 text-papel " +
  "placeholder:text-nevoa outline-none transition focus:border-raio " +
  "focus:ring-2 focus:ring-raio/40";

const rotulo = "mb-1.5 block text-xs font-semibold uppercase tracking-widest text-nevoa";

export default function Entrar() {
  const [estado, acaoEntrar, entrando] = useActionState(entrar, INICIAL);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-9 flex flex-col items-center text-center">
          <h1 className="sr-only">ARS Team</h1>
          <Logo className="h-14 w-auto text-papel" />
          <p className="mt-4 text-sm text-nevoa">
            Entre para ver seu treino da semana.
          </p>
        </div>

        <form action={acaoEntrar} className="flex flex-col gap-4">
          <div>
            <label className={rotulo} htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="voce@email.com"
              className={campo}
            />
          </div>

          <div>
            <label className={rotulo} htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              className={campo}
            />
          </div>

          {estado.erro && (
            <p
              role="alert"
              className="rounded-xl border border-raio/40 bg-raio/10 px-4 py-3 text-sm text-raio-forte"
            >
              {estado.erro}
            </p>
          )}

          <button
            type="submit"
            disabled={entrando}
            className="mt-1 rounded-xl bg-raio px-4 py-3.5 font-display text-lg uppercase tracking-wider text-papel transition hover:bg-raio-forte disabled:opacity-60"
          >
            {entrando ? "Aguarde" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-nevoa">
          Ainda não tem acesso? Fale com o Allisson para receber seu convite.
        </p>

        <p className="mt-8 text-center text-xs leading-relaxed text-nevoa">
          Consultoria ARS Team · Allisson Santos · CREF 205331-G/SP
        </p>
      </div>
    </main>
  );
}
