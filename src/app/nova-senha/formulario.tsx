"use client";

import { useActionState } from "react";
import { Aviso, Botao } from "@/components/ui";
import { CampoSenha } from "@/components/campo-senha";
import { definirSenha, type EstadoSenha } from "./acoes";

const INICIAL: EstadoSenha = {};

export function FormularioDeSenha({ email }: { email: string }) {
  const [estado, acaoDefinir, salvando] = useActionState(definirSenha, INICIAL);

  return (
    <form action={acaoDefinir} className="flex flex-col gap-5">
      <p className="text-[15px] leading-relaxed text-nevoa">
        Criando uma senha nova para <span className="text-papel">{email}</span>.
      </p>

      {/* Um campo só, com o olho, e não dois com "repita a senha": no celular,
          na academia, digitar a mesma coisa duas vezes às cegas é o que mais
          gera erro. Ver é melhor do que repetir. */}
      <CampoSenha
        name="senha"
        rotulo="Senha nova"
        autoComplete="new-password"
        autoFocus
        placeholder="Pelo menos 6 caracteres"
        dica="Toque no olho para conferir o que você digitou."
      />

      {estado.erro && <Aviso>{estado.erro}</Aviso>}

      <Botao type="submit" disabled={salvando} largura="cheia" className="mt-1">
        {salvando ? "Salvando" : "Salvar e entrar"}
      </Botao>
    </form>
  );
}
