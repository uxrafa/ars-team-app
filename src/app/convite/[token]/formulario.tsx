"use client";

import { useActionState } from "react";
import { Aviso, Botao, CLASSE_CAMPO, Rotulo } from "@/components/ui";
import { CamposDeSenha } from "@/components/campos-de-senha";
import { aceitarConvite, type EstadoAceite } from "./acoes";

const INICIAL: EstadoAceite = {};

export function Formulario({
  token,
  nome,
  email,
  tipo,
}: {
  token: string;
  nome: string;
  email: string;
  tipo: "consultoria" | "planilha";
}) {
  const [estado, acao, enviando] = useActionState(aceitarConvite, INICIAL);

  return (
    <form action={acao} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />

      {/* O e-mail vem do convite e nao se edita: e ele que o banco confere
          contra o token. Mostrar mesmo assim, porque e o que o aluno vai
          digitar toda vez que entrar. */}
      <div className="flex flex-col gap-2">
        <Rotulo>Seu e-mail de acesso</Rotulo>
        <p className="min-h-12 break-all rounded-xl border border-linha bg-tinta-3 px-4 py-3 text-base text-papel">
          {email}
        </p>
        <span className="text-sm leading-relaxed text-nevoa">
          Se este e-mail não for o seu, avise o Allisson antes de continuar.
        </span>
      </div>

      <label className="flex flex-col gap-2">
        <Rotulo>Seu nome</Rotulo>
        <input
          name="nome"
          type="text"
          defaultValue={nome}
          autoComplete="name"
          required
          className={CLASSE_CAMPO}
        />
      </label>

      <CamposDeSenha rotulo="Crie sua senha" />

      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.aviso && <Aviso tom="ok">{estado.aviso}</Aviso>}

      <Botao type="submit" disabled={enviando} largura="cheia" className="mt-1">
        {enviando
          ? "Criando seu acesso"
          : tipo === "planilha"
            ? "Criar acesso e ver o treino"
            : "Criar acesso e começar"}
      </Botao>

      <p className="text-center text-sm leading-relaxed text-nevoa">
        {tipo === "planilha"
          ? "Depois disso, seu treino já aparece na tela inicial."
          : "Depois disso, você responde a anamnese e o Allisson monta sua ficha."}
      </p>
    </form>
  );
}
