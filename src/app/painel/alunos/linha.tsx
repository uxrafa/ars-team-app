"use client";

import { useState, useTransition } from "react";
import { emReais, iniciais, linkWhatsapp, quandoFoi } from "@/lib/painel";
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

const PILULA = {
  ok: "border-[#3ecf8e]/35 bg-[#3ecf8e]/10 text-[#3ecf8e]",
  aviso: "border-[#f2b330]/35 bg-[#f2b330]/10 text-[#f2b330]",
  ruim: "border-raio/40 bg-raio/[0.14] text-raio-forte",
  neutro: "border-linha text-nevoa",
} as const;

const campo =
  "w-full rounded-lg border border-linha bg-tinta px-3 py-2 text-[13px] text-papel outline-none " +
  "transition focus:border-raio focus:ring-[3px] focus:ring-raio/25";

function Pilula({ tom, children }: { tom: keyof typeof PILULA; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-1 text-[11.5px] font-bold ${PILULA[tom]}`}>
      {children}
    </span>
  );
}

function estadoDoPagamento(a: AlunoNaTela): { tom: keyof typeof PILULA; texto: string } {
  if (a.status === "suspenso") return { tom: "ruim", texto: "Suspenso" };
  if (a.status === "carencia") return { tom: "aviso", texto: "Em carência" };
  if (a.acesso_ate === null) return { tom: "neutro", texto: "Sem data" };
  if (a.diasVencido !== null && a.diasVencido > 0) {
    return { tom: "ruim", texto: `Venceu faz ${a.diasVencido}d` };
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
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-linha bg-tinta-3 text-[11.5px] font-bold"
          >
            {iniciais(aluno.nome)}
          </span>
          <p className="text-[14px] font-semibold">{aluno.nome}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.09em] text-nevoa">WhatsApp</span>
            <input
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="(19) 99999-0000"
              className={campo}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.09em] text-nevoa">Plano</span>
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
            <span className="font-mono text-[9.5px] uppercase tracking-[0.09em] text-nevoa">Situação</span>
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
            <span className="font-mono text-[9.5px] uppercase tracking-[0.09em] text-nevoa">Pago até</span>
            <input
              type="date"
              value={form.acesso_ate}
              onChange={(e) => setForm({ ...form, acesso_ate: e.target.value })}
              className={campo}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.09em] text-nevoa">Mensalidade</span>
            <input
              inputMode="decimal"
              value={form.mensalidade}
              onChange={(e) => setForm({ ...form, mensalidade: e.target.value })}
              placeholder="250"
              className={campo}
            />
          </label>
        </div>

        {erro && (
          <p role="alert" className="mt-3 rounded-lg border border-raio/40 bg-raio/10 px-3.5 py-2.5 text-[13px] text-raio-forte">
            {erro}
          </p>
        )}

        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={salvar}
            disabled={pendente}
            className="rounded-lg bg-raio px-5 py-2 text-[13px] font-semibold text-papel transition hover:bg-raio-forte disabled:opacity-60"
          >
            {pendente ? "Salvando" : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditando(false);
              setErro(null);
            }}
            className="rounded-lg border border-linha px-5 py-2 text-[13px] font-semibold text-nevoa transition hover:text-papel"
          >
            Cancelar
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-linha px-5 py-3.5 lg:grid-cols-[1.7fr_0.8fr_1fr_1.3fr_0.9fr_auto] lg:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-linha bg-tinta-3 text-[11.5px] font-bold"
        >
          {iniciais(aluno.nome)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold">{aluno.nome}</p>
          <p className="truncate text-[12px] text-nevoa">{aluno.whatsapp || aluno.email}</p>
        </div>
      </div>

      <div className="hidden text-[13px] text-nevoa lg:block">
        {aluno.tipo === "consultoria" ? "Consultoria" : "Planilha"}
      </div>

      <div className="hidden lg:block">
        <Pilula tom={pagamento.tom}>{pagamento.texto}</Pilula>
        {aluno.mensalidade !== null && (
          <p className="mt-1 font-mono text-[10.5px] text-nevoa">{emReais(aluno.mensalidade)}/mês</p>
        )}
      </div>

      <div className="hidden lg:block">
        <p className={`text-[13px] ${aluno.ficha ? "" : "text-nevoa"}`}>{aluno.ficha ?? "Sem ficha"}</p>
        {aluno.fichaDetalhe && (
          <p className={`mt-0.5 font-mono text-[10.5px] uppercase ${aluno.fichaAlerta ? "text-[#f2b330]" : "text-nevoa"}`}>
            {aluno.fichaDetalhe}
          </p>
        )}
      </div>

      <div
        className={`hidden text-[13px] lg:block ${
          aluno.diasSemTreino !== null && aluno.diasSemTreino >= 7 ? "text-raio-forte" : "text-nevoa"
        }`}
      >
        {quandoFoi(aluno.ultimoCheckin, hoje)}
      </div>

      <div className="flex flex-none items-center gap-2">
        {zap && (
          <a
            href={zap}
            target="_blank"
            rel="noreferrer"
            aria-label={`Abrir WhatsApp de ${aluno.nome}`}
            className="rounded-lg border border-linha p-2 text-nevoa transition hover:border-[#3ecf8e]/50 hover:text-[#3ecf8e]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.7 8.7 0 0 1-4-1L3 20l1.1-3.4a8.7 8.7 0 0 1-1-4A8.38 8.38 0 0 1 11.5 4a8.5 8.5 0 0 1 9.5 7.5z" />
            </svg>
          </a>
        )}
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="rounded-lg border border-linha px-3 py-2 text-[12.5px] font-semibold text-nevoa transition hover:border-raio hover:text-papel"
        >
          Editar
        </button>
      </div>
    </li>
  );
}
