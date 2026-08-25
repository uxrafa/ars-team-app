"use client";

import { useState, useTransition } from "react";
import { emReais, iniciais, linkWhatsapp, quandoFoi } from "@/lib/painel";
import { Aviso, Botao, CLASSE_CAMPO, LinkIcone, Pilula, Rotulo, type Tom } from "@/components/ui";
import { salvarCobranca, type DadosCobranca } from "./acoes";

export type AlunoNaTela = {
  id: string;
  nome: string;
  email: string;
  whatsapp: string | null;
  tipo: "consultoria" | "planilha";
  status: "ativo" | "carencia" | "suspenso";
  acesso_ate: string | null;
  mensalidade: number | null;
  /** já calculado no servidor, para a tela não repetir conta */
  diasVencido: number | null;
  ficha: string | null;
  fichaDetalhe: string | null;
  fichaAlerta: boolean;
  ultimoCheckin: string | null;
  diasSemTreino: number | null;
  anamnese: "nenhuma" | "rascunho" | "enviada";
};

const campo = CLASSE_CAMPO;

function estadoDoPagamento(a: AlunoNaTela): { tom: Tom; texto: string } {
  if (a.status === "suspenso") return { tom: "urgente", texto: "Suspenso" };
  if (a.status === "carencia") return { tom: "aviso", texto: "Em carência" };
  if (a.acesso_ate === null) return { tom: "neutro", texto: "Sem data" };
  if (a.diasVencido !== null && a.diasVencido > 0) {
    return { tom: "urgente", texto: `Venceu faz ${a.diasVencido} dias` };
  }
  return { tom: "ok", texto: "Em dia" };
}

export function LinhaAluno({ aluno, hoje }: { aluno: AlunoNaTela; hoje: string }) {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  const [form, setForm] = useState<DadosCobranca>({
    id: aluno.id,
    whatsapp: aluno.whatsapp ?? "",
    tipo: aluno.tipo,
    status: aluno.status,
    acesso_ate: aluno.acesso_ate ?? "",
    mensalidade: aluno.mensalidade !== null ? String(aluno.mensalidade).replace(".", ",") : "",
  });

  const pagamento = estadoDoPagamento(aluno);
  const zap = linkWhatsapp(
    aluno.whatsapp,
    `Oi ${aluno.nome.split(" ")[0]}, tudo bem?`,
  );

  function salvar() {
    setErro(null);
    comecar(async () => {
      const r = await salvarCobranca(form);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setEditando(false);
    });
  }

  if (editando) {
    return (
      <li className="border-t border-linha bg-tinta-3/40 px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-contorno bg-tinta-3 text-sm font-bold"
          >
            {iniciais(aluno.nome)}
          </span>
          <p className="text-base font-semibold">{aluno.nome}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1.5">
            <Rotulo>WhatsApp</Rotulo>
            <input
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="(19) 99999-0000"
              className={campo}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <Rotulo>Plano</Rotulo>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as DadosCobranca["tipo"] })}
              className={campo}
            >
              <option value="consultoria">Consultoria</option>
              <option value="planilha">Planilha</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <Rotulo>Situação</Rotulo>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as DadosCobranca["status"] })}
              className={campo}
            >
              <option value="ativo">Ativo</option>
              <option value="carencia">Em carência</option>
              <option value="suspenso">Suspenso</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <Rotulo>Pago até</Rotulo>
            <input
              type="date"
              value={form.acesso_ate}
              onChange={(e) => setForm({ ...form, acesso_ate: e.target.value })}
              className={campo}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <Rotulo>Mensalidade</Rotulo>
            <input
              inputMode="decimal"
              value={form.mensalidade}
              onChange={(e) => setForm({ ...form, mensalidade: e.target.value })}
              placeholder="250"
              className={campo}
            />
          </label>
        </div>

        {erro && <div className="mt-4"><Aviso>{erro}</Aviso></div>}

        <div className="mt-4 flex gap-2.5">
          <Botao type="button" onClick={salvar} disabled={pendente} tamanho="sm">
            {pendente ? "Salvando" : "Salvar"}
          </Botao>
          <Botao
            type="button"
            aparencia="fantasma"
            tamanho="sm"
            onClick={() => {
              setEditando(false);
              setErro(null);
            }}
          >
            Cancelar
          </Botao>
        </div>
      </li>
    );
  }

  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-linha px-5 py-4 hover:bg-tinta-3/40 lg:grid-cols-[1.7fr_0.8fr_1fr_1.3fr_0.9fr_auto] lg:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-contorno bg-tinta-3 text-sm font-bold"
        >
          {iniciais(aluno.nome)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{aluno.nome}</p>
          <p className="mt-0.5 truncate text-sm text-nevoa">{aluno.whatsapp || aluno.email}</p>
        </div>
      </div>

      <div className="hidden text-[15px] text-nevoa lg:block">
        {aluno.tipo === "consultoria" ? "Consultoria" : "Planilha"}
      </div>

      <div className="hidden lg:block">
        <Pilula tom={pagamento.tom}>{pagamento.texto}</Pilula>
        {aluno.mensalidade !== null && (
          <p className="mt-1.5 font-mono text-[13px] text-nevoa">{emReais(aluno.mensalidade)}/mês</p>
        )}
      </div>

      <div className="hidden lg:block">
        <p className={`text-[15px] ${aluno.ficha ? "" : "text-nevoa"}`}>{aluno.ficha ?? "Sem ficha"}</p>
        {aluno.fichaDetalhe && (
          <p className={`mt-1 font-mono text-[13px] uppercase ${aluno.fichaAlerta ? "text-alerta" : "text-nevoa"}`}>
            {aluno.fichaDetalhe}
          </p>
        )}
      </div>

      <div
        className={`hidden text-[15px] lg:block ${
          aluno.diasSemTreino !== null && aluno.diasSemTreino >= 7 ? "text-raio-forte" : "text-nevoa"
        }`}
      >
        {quandoFoi(aluno.ultimoCheckin, hoje)}
      </div>

      <div className="flex flex-none items-center gap-2">
        {zap && (
          <LinkIcone
            href={zap}
            target="_blank"
            rel="noreferrer"
            rotulo={`Abrir WhatsApp de ${aluno.nome}`}
            className="hover:border-ok/60 hover:text-ok"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.7 8.7 0 0 1-4-1L3 20l1.1-3.4a8.7 8.7 0 0 1-1-4A8.38 8.38 0 0 1 11.5 4a8.5 8.5 0 0 1 9.5 7.5z" />
            </svg>
          </LinkIcone>
        )}
        <Botao type="button" aparencia="secundario" tamanho="sm" onClick={() => setEditando(true)}>
          Editar
        </Botao>
      </div>
    </li>
  );
}
