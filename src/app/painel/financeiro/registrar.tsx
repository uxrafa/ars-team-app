"use client";

import { useState, useTransition } from "react";
import { CampoPagoAte } from "@/components/pago-ate";
import { Aviso, Botao, CLASSE_CAMPO, Rotulo, TituloDeCartao } from "@/components/ui";
import {
  FORMAS_NA_TELA,
  MESES_MAXIMO,
  MESES_MINIMO,
  MESES_PADRAO,
  ROTULO_FORMA,
  dataCurta,
  mesesParaNumero,
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
    // Texto, e não número: ele precisa poder apagar o 2 para digitar 3 sem o
    // campo devolver um valor no meio do caminho.
    meses: String(MESES_PADRAO),
    pago_ate: null as string | null,
    forma: "pix" as FormaPagamento,
    observacao: "",
  };
  const [form, setForm] = useState(inicial);

  const escolhido = alunos.find((a) => a.id === form.aluno_id) ?? null;

  // A consequência do que ele está prestes a gravar, dita antes de gravar.
  // O cálculo que vale é o do banco (gatilho da migração 0014); este é o
  // mesmo, em `lib/pagamento.ts`, só para a tela não guardar segredo.
  const meses = mesesParaNumero(form.meses);
  const previsao =
    escolhido && form.recebido_em && meses !== null
      ? previsaoDeAcesso(escolhido.acesso_ate, form.recebido_em, meses)
      : null;
  const emendado =
    escolhido?.acesso_ate != null && escolhido.acesso_ate > form.recebido_em;

  // O "Pago até" segue a conta até ele mexer na data. Escolhida à mão, ela
  // vale (0021) -- é o caminho para o vencimento herdado do convite, que a
  // emenda levaria adiante. Mudar aluno, dia ou meses volta para a conta.
  const aMao = form.pago_ate !== null && form.pago_ate !== previsao?.ate;
  const pagoAte = form.pago_ate ?? previsao?.ate ?? "";

  function trocarAluno(id: string) {
    const a = alunos.find((x) => x.id === id) ?? null;
    setForm({
      ...form,
      aluno_id: id,
      valor: a?.mensalidade != null ? String(a.mensalidade).replace(".", ",") : form.valor,
      pago_ate: null,
    });
  }

  function salvar() {
    setErro(null);
    if (meses === null) {
      setErro(`Quantos meses esse pagamento cobre? De ${MESES_MINIMO} a ${MESES_MAXIMO}.`);
      return;
    }
    comecar(async () => {
      const r = await registrarPagamento({
        ...form,
        meses,
        // Só manda a data quando ela foi escolhida: sem ela, quem calcula é o
        // banco, com a mesma conta que a tela mostrou.
        pago_ate: aMao ? form.pago_ate : null,
      });
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
      <TituloDeCartao>Registrar pagamento</TituloDeCartao>

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
            onChange={(e) => setForm({ ...form, recebido_em: e.target.value, pago_ate: null })}
            className={CLASSE_CAMPO}
          />
        </label>

        <label className="flex flex-col gap-2">
          <Rotulo>Meses pagos</Rotulo>
          <input
            value={form.meses}
            onChange={(e) => setForm({ ...form, meses: e.target.value, pago_ate: null })}
            inputMode="numeric"
            placeholder={String(MESES_PADRAO)}
            className={`${CLASSE_CAMPO} font-mono`}
          />
        </label>

        <CampoPagoAte
          valor={pagoAte}
          aoMudar={(iso) => setForm({ ...form, pago_ate: iso })}
          apoio={
            !escolhido || !previsao
              ? null
              : aMao
                ? `Escolhida por você. A conta dava ${dataCurta(previsao.ate)}.`
                : emendado
                  ? `Somado ao vencimento atual, ${dataCurta(escolhido.acesso_ate)}. Se ele estiver errado, mude a data.`
                  : null
          }
        />

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
