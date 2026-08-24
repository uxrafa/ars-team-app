"use client";

import { useActionState, useState } from "react";
import { Raio } from "@/components/raio";
import { cadastrar, entrar, type EstadoForm } from "./acoes";

const INICIAL: EstadoForm = {};

const campo =
  "w-full rounded-xl border border-linha bg-tinta-2 px-4 py-3 text-papel " +
  "placeholder:text-nevoa outline-none transition focus:border-raio " +
  "focus:ring-2 focus:ring-raio/40";

const rotulo = "mb-1.5 block text-xs font-semibold uppercase tracking-widest text-nevoa";

export default function Entrar() {
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [estadoEntrar, acaoEntrar, entrando] = useActionState(entrar, INICIAL);
  const [estadoCadastro, acaoCadastro, cadastrando] = useActionState(cadastrar, INICIAL);

  const ehCadastro = modo === "cadastrar";
  const estado = ehCadastro ? estadoCadastro : estadoEntrar;
  const ocupado = ehCadastro ? cadastrando : entrando;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-9 flex flex-col items-center text-center">
          <Raio className="mb-3 h-11 w-11 text-raio" />
          <h1 className="font-display text-4xl uppercase tracking-wide text-papel">
            ARS Team
          </h1>
          <p className="mt-2 text-sm text-nevoa">
            {ehCadastro
              ? "Crie seu acesso para comecar."
              : "Entre para ver seu treino da semana."}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-linha bg-tinta-2 p-1">
          {(["entrar", "cadastrar"] as const).map((valor) => (
            <button
              key={valor}
              type="button"
              onClick={() => setModo(valor)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                modo === valor
                  ? "bg-raio text-papel"
                  : "text-nevoa hover:text-papel"
              }`}
            >
              {valor === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        <form
          key={modo}
          action={ehCadastro ? acaoCadastro : acaoEntrar}
          className="flex flex-col gap-4"
        >
          {ehCadastro && (
            <div>
              <label className={rotulo} htmlFor="nome">
                Nome
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                autoComplete="name"
                placeholder="Como voce quer ser chamado"
                className={campo}
              />
            </div>
          )}

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
              autoComplete={ehCadastro ? "new-password" : "current-password"}
              placeholder={ehCadastro ? "Pelo menos 6 caracteres" : "Sua senha"}
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

          {estado.aviso && (
            <p
              role="status"
              className="rounded-xl border border-linha bg-tinta-2 px-4 py-3 text-sm text-papel"
            >
              {estado.aviso}
            </p>
          )}

          <button
            type="submit"
            disabled={ocupado}
            className="mt-1 rounded-xl bg-raio px-4 py-3.5 font-display text-lg uppercase tracking-wider text-papel transition hover:bg-raio-forte disabled:opacity-60"
          >
            {ocupado ? "Aguarde" : ehCadastro ? "Criar acesso" : "Entrar"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs leading-relaxed text-nevoa">
          Consultoria ARS Team · Allisson Santos · CREF 205331-G/SP
        </p>
      </div>
    </main>
  );
}
