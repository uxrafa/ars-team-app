"use client";

import Link from "next/link";
import { use, useActionState } from "react";
import { Logo } from "@/components/logo";
import { Aviso, Botao, CLASSE_CAMPO, Rotulo } from "@/components/ui";
import { pedirLink, type EstadoPedido } from "./acoes";

const INICIAL: EstadoPedido = {};

export default function Esqueci({
  searchParams,
}: {
  searchParams: Promise<{ expirado?: string }>;
}) {
  const { expirado } = use(searchParams);
  const [estado, acaoPedir, pedindo] = useActionState(pedirLink, INICIAL);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <header className="mb-9 flex flex-col items-center text-center">
          <h1 className="sr-only">Recuperar acesso · ARS Team</h1>
          <Logo className="h-12 w-auto text-papel" />
        </header>

        {estado.enviado ? (
          /* Sem repetir o e-mail digitado: a tela responde igual para conta que
             existe e para conta que não existe, então mostrar o endereço de
             volta daria a impressão errada de confirmação. */
          <section className="flex flex-col gap-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-ok/40 bg-ok/10">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-ok"
                aria-hidden="true"
              >
                <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-bold">Link enviado</h2>
              <p className="mt-2.5 text-[15px] leading-relaxed text-nevoa">
                Se existir uma conta com esse e-mail, o link para criar uma senha nova chega em
                instantes. Ele vale por uma hora e serve uma vez só.
              </p>
            </div>

            <p className="text-sm leading-relaxed text-nevoa">
              Não chegou? Veja no spam. Se mesmo assim não vier, chame o Allisson no WhatsApp.
            </p>

            <Link
              href="/entrar"
              className="inline-flex min-h-11 items-center justify-center text-[15px] font-semibold text-raio-forte"
            >
              Voltar para a entrada
            </Link>
          </section>
        ) : (
          <>
            <div className="mb-7 text-center">
              <h2 className="text-xl font-bold">Esqueceu a senha?</h2>
              <p className="mt-2.5 text-[15px] leading-relaxed text-nevoa">
                Escreva o e-mail da sua conta e a gente manda um link para você criar outra.
              </p>
            </div>

            {expirado && (
              <div className="mb-5">
                <Aviso tom="aviso">
                  Esse link não vale mais. Eles duram uma hora e servem uma vez só. Peça outro
                  aqui.
                </Aviso>
              </div>
            )}

            <form action={acaoPedir} className="flex flex-col gap-5">
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

              {estado.erro && <Aviso>{estado.erro}</Aviso>}

              <Botao type="submit" disabled={pedindo} largura="cheia" className="mt-1">
                {pedindo ? "Enviando" : "Mandar link"}
              </Botao>
            </form>

            <p className="mt-7 text-center">
              <Link
                href="/entrar"
                className="inline-flex min-h-11 items-center justify-center text-[15px] font-semibold text-nevoa transition-colors hover:text-papel"
              >
                Lembrei, quero entrar
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
