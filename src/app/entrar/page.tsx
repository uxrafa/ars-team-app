"use client";

import { useActionState, useState } from "react";
import { Logo } from "@/components/logo";
import { Aviso, Botao, CLASSE_CAMPO, Rotulo } from "@/components/ui";
import { entrar, type EstadoForm } from "./acoes";

const INICIAL: EstadoForm = {};

function OlhoAberto() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function OlhoFechado() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.3 3.9" />
      <path d="M6.3 8.2A16.7 16.7 0 0 0 2 12s3.6 6 10 6a9.9 9.9 0 0 0 4-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export default function Entrar() {
  const [estado, acaoEntrar, entrando] = useActionState(entrar, INICIAL);
  const [verSenha, setVerSenha] = useState(false);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <header className="mb-9 flex flex-col items-center text-center">
          <h1 className="sr-only">ARS Team</h1>
          <Logo className="h-12 w-auto text-papel" />
          <p className="mt-5 text-[15px] text-nevoa">Entre para ver seu treino da semana.</p>
        </header>

        <form action={acaoEntrar} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <Rotulo>E-mail</Rotulo>
            <input
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoFocus
              placeholder="voce@email.com"
              className={CLASSE_CAMPO}
            />
          </label>

          <label className="flex flex-col gap-2">
            <Rotulo>Senha</Rotulo>
            <span className="relative block">
              <input
                name="senha"
                type={verSenha ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Sua senha"
                className={`${CLASSE_CAMPO} pr-14`}
              />
              {/* Digitar senha às cegas no celular é o que mais gera erro de
                  login. O olho resolve, e não pede nada do servidor. */}
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? "Esconder a senha" : "Mostrar a senha"}
                aria-pressed={verSenha}
                title={verSenha ? "Esconder a senha" : "Mostrar a senha"}
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-nevoa transition-colors hover:text-papel"
              >
                {verSenha ? <OlhoFechado /> : <OlhoAberto />}
              </button>
            </span>
          </label>

          {estado.erro && <Aviso>{estado.erro}</Aviso>}

          <Botao type="submit" disabled={entrando} largura="cheia" className="mt-1">
            {entrando ? "Aguarde" : "Entrar"}
          </Botao>
        </form>

        <p className="mt-7 text-center text-sm leading-relaxed text-nevoa">
          Esqueceu a senha ou ainda não tem acesso?
          <br />
          Fale com o Allisson pelo WhatsApp.
        </p>

        <p className="mt-9 text-center text-sm leading-relaxed text-nevoa">
          Consultoria ARS Team · Allisson Santos
          <br />
          <span className="whitespace-nowrap">CREF 205331-G/SP</span>
        </p>
      </div>
    </main>
  );
}
