"use client";

import { useState, useTransition } from "react";
import { Aviso, Botao } from "@/components/ui";
import { comecarTreino } from "./acoes";

/**
 * O botão que abre o treino.
 *
 * A ação redireciona quando dá certo, então aqui só existe caminho de erro:
 * treino em andamento com série dentro, ou sessão vencida.
 */
export function ComecarTreino({
  blocoId,
  children,
  aparencia = "primario",
  largura = "cheia",
}: {
  blocoId: string;
  children: React.ReactNode;
  aparencia?: "primario" | "secundario" | "fantasma";
  largura?: "auto" | "cheia";
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <>
      <Botao
        aparencia={aparencia}
        largura={largura}
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null);
            const r = await comecarTreino(blocoId);
            if (r?.erro) setErro(r.erro);
          })
        }
      >
        {pendente ? "Abrindo…" : children}
      </Botao>
      {erro && (
        <div className="mt-3">
          <Aviso>{erro}</Aviso>
        </div>
      )}
    </>
  );
}
