"use client";

import { useActionState } from "react";
import { Logo } from "@/components/logo";
import { Aviso, Botao, CLASSE_CAMPO, Rotulo } from "@/components/ui";
import { CampoSenha } from "@/components/campo-senha";
import { entrar, type EstadoForm } from "./acoes";

const INICIAL: EstadoForm = {};

export default function Entrar() {
  const [estado, acaoEntrar, entrando] = useActionState(entrar, INICIAL);

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

          <CampoSenha
            name="senha"
            rotulo="Senha"
            autoComplete="current-password"
            placeholder="Sua senha"
          />

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
