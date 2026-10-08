"use client";

import { useState, useTransition } from "react";
import { Aviso, Botao } from "@/components/ui";
import { decimal, kcal, milhar, type Alimento } from "@/lib/dieta";
import { alternarAlimento, salvarAlimento, type DadosAlimento } from "./acoes";
import { CamposDoAlimento } from "./campos";

export type LinhaAlimento = Alimento & { ativo: boolean };

function paraForm(a: LinhaAlimento): DadosAlimento {
  return {
    nome: a.nome,
    grupo: a.grupo ?? "",
    proteina: decimal(a.proteina_g),
    carboidrato: decimal(a.carboidrato_g),
    gordura: decimal(a.gordura_g),
  };
}

/**
 * Uma linha da biblioteca. A da TACO é só consulta: não tem Editar, tem a
 * etiqueta. A dele edita no lugar, como os exercícios.
 */
export function Linha({ a, grupos }: { a: LinhaAlimento; grupos: string[] }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(() => paraForm(a));
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  const proprio = a.origem === "proprio";

  function salvar() {
    setErro(null);
    comecar(async () => {
      const r = await salvarAlimento(a.id, form);
      if (r.erro) return setErro(r.erro);
      setEditando(false);
    });
  }

  function mudarAtivo() {
    setErro(null);
    comecar(async () => {
      const r = await alternarAlimento(a.id, !a.ativo);
      if (r.erro) return setErro(r.erro);
      setEditando(false);
    });
  }

  if (editando) {
    return (
      <li className="border-t border-linha bg-tinta-3/40 px-5 py-4 first:border-t-0 lg:col-span-2 lg:[&:nth-child(2)]:border-t-0">
        <CamposDoAlimento form={form} aoMudar={setForm} grupos={grupos} />
        <p className="mt-3 text-sm leading-relaxed text-nevoa">
          Mudar os valores muda a conta de todas as dietas que usam este alimento.
        </p>

        {erro && (
          <div className="mt-4">
            <Aviso>{erro}</Aviso>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2.5">
          <Botao type="button" onClick={salvar} disabled={pendente} tamanho="sm">
            {pendente ? "Salvando" : "Salvar"}
          </Botao>
          <Botao
            type="button"
            onClick={() => {
              setForm(paraForm(a));
              setErro(null);
              setEditando(false);
            }}
            disabled={pendente}
            aparencia="secundario"
            tamanho="sm"
          >
            Cancelar
          </Botao>
          <Botao
            type="button"
            onClick={mudarAtivo}
            disabled={pendente}
            aparencia="fantasma"
            tamanho="sm"
            className="sm:ml-auto"
          >
            {a.ativo ? "Tirar de circulação" : "Voltar a usar"}
          </Botao>
        </div>
      </li>
    );
  }

  const calorias = kcal({
    proteina: a.proteina_g,
    carboidrato: a.carboidrato_g,
    gordura: a.gordura_g,
  });

  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-linha px-5 py-3.5 transition-colors first:border-t-0 hover:bg-tinta-3/40 lg:odd:border-r lg:[&:nth-child(2)]:border-t-0 ${
        a.ativo ? "" : "opacity-55"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-papel">{a.nome}</span>
        {/* P · C · G em mono, em coluna, para comparar um alimento com o de
            baixo sem ler rótulo por rótulo. */}
        <span className="mt-0.5 block font-mono text-[13px] text-nevoa">
          P {decimal(a.proteina_g)} · C {decimal(a.carboidrato_g)} · G {decimal(a.gordura_g)} ·{" "}
          {milhar(calorias)} kcal
          {!a.ativo && <span className="font-sans"> · fora de circulação</span>}
        </span>
      </span>

      {proprio ? (
        <Botao
          type="button"
          onClick={() => {
            setForm(paraForm(a));
            setEditando(true);
          }}
          aparencia="secundario"
          tamanho="sm"
        >
          Editar
        </Botao>
      ) : (
        // Texto, e não pílula: com contorno parecia um botão ao lado do
        // "Editar" das linhas dele, e convidava a clicar no que não edita.
        <span className="text-sm text-nevoa-fraca">TACO</span>
      )}

      {erro && (
        <div className="w-full">
          <Aviso>{erro}</Aviso>
        </div>
      )}
    </li>
  );
}
