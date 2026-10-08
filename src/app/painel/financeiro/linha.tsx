"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import { CampoPagoAte } from "@/components/pago-ate";
import { Aviso, Botao, CLASSE_CAMPO, Pilula } from "@/components/ui";
import { emReais, iniciais } from "@/lib/painel";
import { ROTULO_FORMA, dataCurta, type PagamentoNaTela } from "@/lib/pagamento";
import { corrigirPagoAte, estornarPagamento } from "./acoes";

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
export function LinhaPagamentoNaLista({
  p,
  editavel = false,
}: {
  p: PagamentoNaTela;
  /** Só o último pagamento válido do aluno acompanha o Pago até (0021). */
  editavel?: boolean;
}) {
  const [pedindo, setPedindo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  const [editando, setEditando] = useState(false);
  const [pagoAte, setPagoAte] = useState(p.competencia_ate);
  const [erroData, setErroData] = useState<string | null>(null);
  const [salvando, salvar] = useTransition();

  const estornado = p.estornado_em !== null;

  // Estável de propósito: o Modal refaz o efeito (e puxa o foco para o
  // painel) quando `aoFechar` muda, e uma função nova a cada letra digitada
  // tiraria o cursor do campo de data.
  const fecharEdicao = useCallback(() => setEditando(false), []);

  function abrirEdicao() {
    setPagoAte(p.competencia_ate);
    setErroData(null);
    setEditando(true);
  }

  function gravarData() {
    setErroData(null);
    salvar(async () => {
      const r = await corrigirPagoAte(p.aluno_id, pagoAte);
      if (r.erro) setErroData(r.erro);
      else setEditando(false);
    });
  }

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
            {/* Sem "N meses": depois que o Pago até é corrigido no aluno
                (0021), a contagem digitada no registro deixa de bater com a
                data, e é a data que interessa. */}
            {dataCurta(p.recebido_em)} · {ROTULO_FORMA[p.forma]} · até{" "}
            {dataCurta(p.competencia_ate)}
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

        {editavel && (
          <Botao type="button" onClick={abrirEdicao} aparencia="secundario" tamanho="sm">
            Editar
          </Botao>
        )}

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

      {editando && (
        <Modal
          titulo={`Pago até de ${p.aluno.split(" ")[0]}`}
          descricao="Muda o vencimento do aluno e este pagamento, juntos."
          aoFechar={fecharEdicao}
        >
          <div className="flex flex-col gap-4">
            <CampoPagoAte valor={pagoAte} aoMudar={setPagoAte} />
            {erroData && <Aviso>{erroData}</Aviso>}
            <div className="flex flex-wrap gap-2.5">
              <Botao type="button" onClick={gravarData} disabled={salvando} tamanho="sm">
                {salvando ? "Salvando" : "Salvar"}
              </Botao>
              <Botao
                type="button"
                onClick={() => setEditando(false)}
                aparencia="fantasma"
                tamanho="sm"
              >
                Cancelar
              </Botao>
            </div>
          </div>
        </Modal>
      )}

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
