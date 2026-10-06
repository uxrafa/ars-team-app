"use client";

import { useState, useTransition } from "react";
import { Aviso, Botao } from "@/components/ui";
import { marcarEvolucaoVista } from "./acoes";

/**
 * O aviso do topo da Evolucao quando o aluno mandou foto ou medida nova.
 *
 * Fica ate o treinador dizer que viu. Ver a foto e o trabalho; o botao so
 * registra que o trabalho foi feito.
 */
export function NovidadeNaEvolucao({ alunoId, texto }: { alunoId: string; texto: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-ok/40 bg-ok/[0.07] p-5 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.07em] text-ok">Avaliação nova</p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-papel">{texto}</p>
        {erro && (
          <div className="mt-3">
            <Aviso>{erro}</Aviso>
          </div>
        )}
      </div>
      <Botao
        type="button"
        tamanho="sm"
        aparencia="secundario"
        disabled={pendente}
        className="flex-none"
        onClick={() => {
          setErro(null);
          comecar(async () => {
            const r = await marcarEvolucaoVista(alunoId);
            if (r.erro) setErro(r.erro);
          });
        }}
      >
        {pendente ? "Marcando" : "Marcar como visto"}
      </Botao>
    </section>
  );
}
