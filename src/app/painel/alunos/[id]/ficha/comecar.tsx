"use client";

import { useState, useTransition } from "react";
import { Aviso, Botao, BotaoLink, CLASSE_CAMPO } from "@/components/ui";
import { copiarParaAluno, criarRascunho } from "./acoes";
import type { FichaDeOutro } from "./page";

/** Estado inicial: o aluno ainda não tem ficha nenhuma. */
export function Comecar({
  alunoId,
  nome,
  temAnamnese,
  anamneseEnviada,
  fichasDeOutros,
}: {
  alunoId: string;
  nome: string;
  temAnamnese: boolean;
  anamneseEnviada: boolean;
  fichasDeOutros: FichaDeOutro[];
}) {
  const [origem, setOrigem] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  // Começar copiando: o jeito mais rápido de montar as fichas da migração,
  // e antes só aparecia depois de abrir uma ficha vazia.
  function copiar() {
    if (!origem) return;
    setErro(null);
    comecar(async () => {
      const r = await copiarParaAluno(origem, alunoId);
      if (r.erro) setErro(r.erro);
    });
  }

  function criar() {
    setErro(null);
    comecar(async () => {
      const r = await criarRascunho(alunoId);
      if (r.erro) setErro(r.erro);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Sem migalha: o layout de /painel/alunos/[id] já diz de quem é. */}
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

        {fichasDeOutros.length > 0 && (
          <div className="mt-6 flex flex-col gap-2 text-left">
            <span className="text-sm text-nevoa">Comece copiando a ficha de outro aluno</span>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                aria-label="Ficha de outro aluno"
                className={CLASSE_CAMPO}
              >
                <option value="">Escolha um aluno</option>
                {fichasDeOutros.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.aluno} · {f.nome}
                  </option>
                ))}
              </select>
              <Botao type="button" onClick={copiar} disabled={pendente || !origem}>
                {pendente && origem ? "Copiando" : "Copiar"}
              </Botao>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {/* Com a cópia na tela, ela é a ação principal: um primário só. */}
          <Botao
            type="button"
            onClick={criar}
            disabled={pendente}
            aparencia={fichasDeOutros.length ? "secundario" : "primario"}
          >
            {pendente && !origem ? "Abrindo" : fichasDeOutros.length ? "Começar do zero" : "Abrir ficha"}
          </Botao>
          <BotaoLink href="/painel/alunos" aparencia="secundario">
            Voltar
          </BotaoLink>
        </div>
      </section>
    </div>
  );
}
