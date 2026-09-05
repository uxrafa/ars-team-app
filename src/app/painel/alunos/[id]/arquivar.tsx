"use client";

import { useState, useTransition } from "react";
import { Aviso, Botao, CLASSE_CAMPO, Rotulo } from "@/components/ui";
import { arquivarAluno, reativarAluno } from "../acoes";

function quando(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(d);
}

/**
 * Tirar o aluno de circulação, e trazer de volta.
 *
 * Dois passos, e o segundo nomeia a pessoa: "Arquivar Marcos" é uma pergunta
 * que dá para responder errado uma vez, não duas. "Tem certeza?" não é
 * confirmação, é um clique a mais.
 *
 * O painel explica o que acontece E o que não acontece. O medo de quem clica
 * aqui é perder o histórico do aluno, e é justamente o que não perde.
 */
export function Arquivar({
  alunoId,
  alunoNome,
  arquivadoEm,
  arquivadoMotivo,
}: {
  alunoId: string;
  alunoNome: string;
  arquivadoEm: string | null;
  arquivadoMotivo: string | null;
}) {
  const [pedindo, setPedindo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  const primeiroNome = alunoNome.split(" ")[0] || "o aluno";

  function arquivar() {
    setErro(null);
    comecar(async () => {
      const r = await arquivarAluno(alunoId, motivo);
      if (r.erro) setErro(r.erro);
      else {
        setPedindo(false);
        setMotivo("");
      }
    });
  }

  function reativar() {
    setErro(null);
    comecar(async () => {
      const r = await reativarAluno(alunoId);
      if (r.erro) setErro(r.erro);
    });
  }

  if (arquivadoEm) {
    return (
      <section className="rounded-2xl border border-contorno bg-tinta-3/40 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-lg font-bold">Aluno arquivado</h2>
            <p className="mt-1.5 text-[15px] text-nevoa">
              Desde {quando(arquivadoEm)}
              {arquivadoMotivo ? ` · ${arquivadoMotivo}` : ""}
            </p>
          </div>
          {/* Reativar não pede confirmação: trazer alguém de volta não
              destrói nada, e um clique errado se desfaz com outro. */}
          <Botao
            type="button"
            onClick={reativar}
            disabled={pendente}
            aparencia="secundario"
            tamanho="sm"
            className="ml-auto"
          >
            {pendente ? "Reativando" : `Reativar ${primeiroNome}`}
          </Botao>
        </div>
        {erro && (
          <div className="mt-4">
            <Aviso>{erro}</Aviso>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">Tirar da lista</h2>
        {!pedindo && (
          <Botao
            type="button"
            onClick={() => setPedindo(true)}
            aparencia="fantasma"
            tamanho="sm"
            className="ml-auto"
          >
            Arquivar aluno
          </Botao>
        )}
      </div>

      {!pedindo ? (
        <p className="mt-2.5 text-[15px] leading-relaxed text-nevoa">
          Para quem parou de treinar. Sai das listas e das contas, e continua aqui inteiro.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <div className="rounded-xl border border-linha bg-tinta-3 px-4 py-3.5">
            <Rotulo>O que muda</Rotulo>
            <p className="mt-2 text-[15px] leading-relaxed">
              {primeiroNome} some da lista de alunos, do painel, da fila de atenção e do
              Financeiro, e para de entrar no app.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-nevoa">
              A ficha, os treinos registrados, as medidas, as fotos e os pagamentos dele{" "}
              <span className="text-papel">não são apagados</span>. Dá para reativar depois, e
              tudo volta como estava.
            </p>
          </div>

          <label className="flex flex-col gap-2">
            <Rotulo>Motivo</Rotulo>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="opcional — daqui a um ano você não vai lembrar"
              className={CLASSE_CAMPO}
            />
          </label>

          {erro && <Aviso>{erro}</Aviso>}

          <div className="flex flex-wrap gap-2.5">
            <Botao type="button" onClick={arquivar} disabled={pendente} tamanho="sm">
              {pendente ? "Arquivando" : `Arquivar ${primeiroNome}`}
            </Botao>
            <Botao
              type="button"
              onClick={() => {
                setPedindo(false);
                setErro(null);
              }}
              aparencia="fantasma"
              tamanho="sm"
            >
              Cancelar
            </Botao>
          </div>
        </div>
      )}
    </section>
  );
}
