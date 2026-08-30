"use client";

import { useActionState } from "react";
import { Aviso, Botao } from "@/components/ui";
import { CamposDeSenha } from "@/components/campos-de-senha";
import { definirSenha, type EstadoSenha } from "./acoes";

const INICIAL: EstadoSenha = {};

export function FormularioDeSenha({ email }: { email: string }) {
  const [estado, acaoDefinir, salvando] = useActionState(definirSenha, INICIAL);

  return (
    <form action={acaoDefinir} className="flex flex-col gap-5">
      <p className="text-[15px] leading-relaxed text-nevoa">
        Criando uma senha nova para <span className="text-papel">{email}</span>.
      </p>

      <CamposDeSenha rotulo="Senha nova" />

      {estado.erro && <Aviso>{estado.erro}</Aviso>}

      <Botao type="submit" disabled={salvando} largura="cheia" className="mt-1">
        {salvando ? "Salvando" : "Salvar e entrar"}
      </Botao>
    </form>
  );
}
