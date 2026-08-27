"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Aviso, Botao, BotaoLink } from "@/components/ui";
import { criarRascunho } from "./acoes";

/** Estado inicial: o aluno ainda não tem ficha nenhuma. */
export function Comecar({
  alunoId,
  nome,
  temAnamnese,
  anamneseEnviada,
}: {
  alunoId: string;
  nome: string;
  temAnamnese: boolean;
  anamneseEnviada: boolean;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  function criar() {
    setErro(null);
    comecar(async () => {
      const r = await criarRascunho(alunoId);
      if (r.erro) setErro(r.erro);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/painel/alunos"
          className="text-[15px] text-nevoa underline underline-offset-4 hover:text-papel"
        >
          Alunos
        </Link>
        <span aria-hidden="true" className="text-nevoa">
          /
        </span>
        <span className="text-[15px] text-papel">{nome}</span>
      </div>

      <section className="mx-auto w-full max-w-xl rounded-2xl border border-linha bg-tinta-2 p-8 text-center">
        <h1 className="font-display text-3xl uppercase leading-none tracking-wide">
          Sem ficha ainda
        </h1>
        <p className="mx-auto mt-3.5 max-w-[42ch] text-[15px] leading-relaxed text-nevoa">
          {nome.split(" ")[0]} ainda não tem treino montado. Abra a ficha e monte os treinos: o
          aluno só passa a enxergar quando você publicar.
        </p>

        {!anamneseEnviada && (
          <div className="mt-5 text-left">
            <Aviso tom="aviso">
              {temAnamnese
                ? "A anamnese ainda está pela metade. Dá para montar a ficha assim mesmo, mas você monta sem saber lesão e histórico de saúde."
                : "Esse aluno ainda não respondeu a anamnese. Dá para montar a ficha assim mesmo, mas você monta sem saber lesão e histórico de saúde."}
            </Aviso>
          </div>
        )}

        {erro && (
          <div className="mt-5 text-left">
            <Aviso>{erro}</Aviso>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Botao type="button" onClick={criar} disabled={pendente}>
            {pendente ? "Abrindo" : "Abrir ficha"}
          </Botao>
          <BotaoLink href="/painel/alunos" aparencia="secundario">
            Voltar
          </BotaoLink>
        </div>
      </section>
    </div>
  );
}
