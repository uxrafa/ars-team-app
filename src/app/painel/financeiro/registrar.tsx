"use client";

import { useState, useTransition } from "react";
import { Aviso, Botao, CLASSE_CAMPO, Rotulo } from "@/components/ui";
import {
  FORMAS_NA_TELA,
  PLANOS_EM_MESES,
  ROTULO_FORMA,
  dataCurta,
  previsaoDeAcesso,
  type FormaPagamento,
} from "@/lib/pagamento";
import { registrarPagamento } from "./acoes";

export type AlunoParaCobrar = {
  id: string;
  nome: string;
  acesso_ate: string | null;
  mensalidade: number | null;
};

/**
 * O formulário de registro manual.
 *
 * Fica fechado até alguém pedir, igual ao par leitura/edição da ficha e do
 * cartão de cobrança: campo aberto o tempo todo em tela de consulta é ruído,
 * e registrar pagamento não é o que o Allisson faz todo dia.
 */
export function Registrar({
  alunos,
  hoje,
  abertoDeInicio,
  alunoDeInicio,
}: {
  alunos: AlunoParaCobrar[];
  hoje: string;
  abertoDeInicio: boolean;
  alunoDeInicio: string | null;
}) {
  const [aberto, setAberto] = useState(abertoDeInicio);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  const inicial = {
    aluno_id: alunoDeInicio ?? "",
    // A mensalidade cadastrada é o palpite certo na maioria das vezes, e
    // continua editável para o mês em que houve desconto ou reajuste.
    valor:
      alunos.find((a) => a.id === alunoDeInicio)?.mensalidade?.toString().replace(".", ",") ?? "",
    recebido_em: hoje,
    meses: 1,
    forma: "pix" as FormaPagamento,
    observacao: "",
  };
  const [form, setForm] = useState(inicial);

  const escolhido = alunos.find((a) => a.id === form.aluno_id) ?? null;

  // A consequência do que ele está prestes a gravar, dita antes de gravar.
  // O cálculo que vale é o do banco (gatilho da migração 0014); este é o
  // mesmo, em `lib/pagamento.ts`, só para a tela não guardar segredo.
  const previsao =
    escolhido && form.recebido_em
      ? previsaoDeAcesso(escolhido.acesso_ate, form.recebido_em, form.meses)
      : null;

  function trocarAluno(id: string) {
    const a = alunos.find((x) => x.id === id) ?? null;
    setForm({
      ...form,
      aluno_id: id,
      valor: a?.mensalidade != null ? String(a.mensalidade).replace(".", ",") : form.valor,
    });
  }

  function salvar() {
    setErro(null);
    comecar(async () => {
      const r = await registrarPagamento(form);
      if (r.erro) setErro(r.erro);
      else {
        setForm({ ...inicial, aluno_id: "", valor: "" });
        setAberto(false);
      }
    });
  }

  if (!aberto) {
    return (
      <Botao type="button" onClick={() => setAberto(true)} disabled={alunos.length === 0}>
        Registrar pagamento
      </Botao>
    );
  }

  return (
    <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
      <h2 className="text-lg font-bold">Registrar pagamento</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-2">
          <Rotulo>Aluno</Rotulo>
          <select
            value={form.aluno_id}
            onChange={(e) => trocarAluno(e.target.value)}
            className={CLASSE_CAMPO}
          >
            <option value="">Escolher</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <Rotulo>Valor recebido</Rotulo>
          <input
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
            inputMode="decimal"
            placeholder="250"
            className={CLASSE_CAMPO}
          />
        </label>

        <label className="flex flex-col gap-2">
          <Rotulo>Entrou em</Rotulo>
          <input
            type="date"
            value={form.recebido_em}
            max={hoje}
            onChange={(e) => setForm({ ...form, recebido_em: e.target.value })}
            className={CLASSE_CAMPO}
          />
        </label>

        <label className="flex flex-col gap-2">
          <Rotulo>Período pago</Rotulo>
          <select
            value={form.meses}
            onChange={(e) => setForm({ ...form, meses: Number(e.target.value) })}
            className={CLASSE_CAMPO}
          >
            {PLANOS_EM_MESES.map((p) => (
              <option key={p.meses} value={p.meses}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <Rotulo>Forma</Rotulo>
          <select
            value={form.forma}
            onChange={(e) => setForm({ ...form, forma: e.target.value as FormaPagamento })}
            className={CLASSE_CAMPO}
          >
            {FORMAS_NA_TELA.map((f) => (
              <option key={f} value={f}>
                {ROTULO_FORMA[f]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <Rotulo>Observação</Rotulo>
          <input
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            placeholder="opcional"
            className={CLASSE_CAMPO}
          />
        </label>
      </div>

      {previsao && (
        <p className="mt-4 rounded-xl border border-linha bg-tinta-3 px-4 py-3.5 text-[15px] leading-relaxed">
          O acesso de {escolhido!.nome.split(" ")[0]} passa a valer até{" "}
          <span className="font-mono text-[15px] text-papel">{dataCurta(previsao.ate)}</span>
          {escolhido!.acesso_ate && escolhido!.acesso_ate > form.recebido_em ? (
            <span className="text-nevoa">
              {" "}
              — emendado no vencimento de {dataCurta(escolhido!.acesso_ate)}, que ainda está de pé.
            </span>
          ) : null}
        </p>
      )}

      {erro && (
        <div className="mt-4">
          <Aviso>{erro}</Aviso>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2.5">
        <Botao type="button" onClick={salvar} disabled={pendente} tamanho="sm">
          {pendente ? "Registrando" : "Registrar"}
        </Botao>
        <Botao
          type="button"
          onClick={() => {
            setAberto(false);
            setErro(null);
          }}
          aparencia="fantasma"
          tamanho="sm"
        >
          Cancelar
        </Botao>
      </div>
    </section>
  );
}
