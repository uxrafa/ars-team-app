"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Botao, CLASSE_CAMPO, Pilula } from "@/components/ui";
import { emReais, iniciais } from "@/lib/painel";
import { ROTULO_FORMA, dataCurta, type PagamentoNaTela } from "@/lib/pagamento";
import { estornarPagamento } from "./acoes";

/**
 * Uma linha da lista de pagamentos.
 *
 * É client component só por causa do estorno, que abre um campo. O resto da
 * tela continua no servidor.
 *
 * O pagamento estornado NÃO some da lista: sumir com ele esconderia que o
 * erro aconteceu, e o Allisson perderia a única pista de por que o vencimento
 * do aluno voltou.
 */
export function LinhaPagamentoNaLista({ p }: { p: PagamentoNaTela }) {
  const [pedindo, setPedindo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  const estornado = p.estornado_em !== null;

  function confirmar() {
    setErro(null);
    comecar(async () => {
      const r = await estornarPagamento(p.id, motivo);
      if (r.erro) setErro(r.erro);
      else {
        setPedindo(false);
        setMotivo("");
      }
    });
  }

  return (
    <li className="border-t border-linha px-5 py-4 first:border-t-0 hover:bg-tinta-3/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-contorno bg-tinta-3 text-sm font-bold"
        >
          {iniciais(p.aluno)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">
            <Link href={`/painel/alunos/${p.aluno_id}`} className="hover:text-raio-forte">
              {p.aluno}
            </Link>
          </p>
          <p className="mt-1 truncate font-mono text-[13px] uppercase text-nevoa">
            {dataCurta(p.recebido_em)} · {ROTULO_FORMA[p.forma]} · {p.meses}{" "}
            {p.meses === 1 ? "mês" : "meses"} até {dataCurta(p.competencia_ate)}
          </p>
        </div>

        {p.origem === "gateway" && (
          <span className="flex-none">
            <Pilula>Gateway</Pilula>
          </span>
        )}

        <span
          className={`flex-none font-mono text-base tabular ${
            estornado ? "text-nevoa-fraca line-through" : "text-papel"
          }`}
        >
          {emReais(p.valor)}
        </span>

        <span className="flex w-[112px] flex-none justify-end">
          {estornado ? (
            <Pilula tom="neutro">Estornado</Pilula>
          ) : (
            <Botao
              type="button"
              onClick={() => setPedindo(true)}
              aparencia="fantasma"
              tamanho="sm"
            >
              Estornar
            </Botao>
          )}
        </span>
      </div>

      {p.observacao && !pedindo && (
        <p className="mt-2 pl-15 text-sm leading-snug text-nevoa">{p.observacao}</p>
      )}

      {estornado && p.estorno_motivo && (
        <p className="mt-2 pl-15 text-sm leading-snug text-nevoa">
          Estornado: {p.estorno_motivo}
        </p>
      )}

      {pedindo && (
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Por que está estornando?"
            autoFocus
            className={`${CLASSE_CAMPO} sm:max-w-[26rem]`}
          />
          <Botao type="button" onClick={confirmar} disabled={pendente} tamanho="sm">
            {pendente ? "Estornando" : "Confirmar estorno"}
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
          <p className="w-full text-sm leading-relaxed text-nevoa">
            {erro ??
              "O valor sai da conta do mês e o vencimento do aluno volta para onde estava. O pagamento não é apagado, e estorno não se desfaz."}
          </p>
        </div>
      )}
    </li>
  );
}
