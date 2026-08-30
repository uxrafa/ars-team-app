"use client";

import { useState, useTransition } from "react";
import { Aviso, Botao, CLASSE_CAMPO, Rotulo } from "@/components/ui";
import { emReais } from "@/lib/painel";
import { salvarCobranca, type DadosCobranca } from "../acoes";

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-linha py-2.5 first:border-t-0">
      <span className="text-sm text-nevoa">{rotulo}</span>
      <span className="text-right text-[15px] text-papel">{valor}</span>
    </div>
  );
}

function curta(iso: string | null): string {
  if (!iso) return "sem data";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano.slice(2)}`;
}

/**
 * Plano, vencimento e mensalidade.
 *
 * Saiu da linha da lista e veio para cá: editar dentro de uma linha de tabela
 * obrigava a espremer cinco campos num espaço que não era deles, e a lista
 * ficou sendo só o caminho para chegar aqui.
 *
 * Segue o mesmo par leitura/edição da ficha: sem campo aberto o tempo todo.
 */
export function Cobranca({
  aluno,
}: {
  aluno: {
    id: string;
    email: string;
    whatsapp: string | null;
    tipo: "consultoria" | "planilha";
    status: "ativo" | "carencia" | "suspenso";
    acesso_ate: string | null;
    mensalidade: number | null;
  };
}) {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  const inicial: DadosCobranca = {
    id: aluno.id,
    whatsapp: aluno.whatsapp ?? "",
    tipo: aluno.tipo,
    status: aluno.status,
    acesso_ate: aluno.acesso_ate ?? "",
    mensalidade: aluno.mensalidade !== null ? String(aluno.mensalidade).replace(".", ",") : "",
  };
  const [form, setForm] = useState<DadosCobranca>(inicial);

  function salvar() {
    setErro(null);
    comecar(async () => {
      const r = await salvarCobranca(form);
      if (r.erro) setErro(r.erro);
      else setEditando(false);
    });
  }

  const SITUACOES = [
    ["ativo", "Ativo"],
    ["carencia", "Em carência"],
    ["suspenso", "Suspenso"],
  ] as const;

  return (
    <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">Plano e cobrança</h2>
        {!editando && (
          <Botao
            type="button"
            onClick={() => {
              setForm(inicial);
              setEditando(true);
            }}
            aparencia="secundario"
            tamanho="sm"
            className="ml-auto"
          >
            Editar
          </Botao>
        )}
      </div>

      {editando ? (
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <Rotulo>WhatsApp</Rotulo>
              <input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                inputMode="tel"
                placeholder="11988887777"
                className={CLASSE_CAMPO}
              />
            </label>

            <label className="flex flex-col gap-2">
              <Rotulo>Plano</Rotulo>
              <select
                value={form.tipo}
                onChange={(e) =>
                  setForm({ ...form, tipo: e.target.value as DadosCobranca["tipo"] })
                }
                className={CLASSE_CAMPO}
              >
                <option value="consultoria">Consultoria</option>
                <option value="planilha">Planilha</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <Rotulo>Situação</Rotulo>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as DadosCobranca["status"] })
                }
                className={CLASSE_CAMPO}
              >
                {SITUACOES.map(([valor, nome]) => (
                  <option key={valor} value={valor}>
                    {nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <Rotulo>Pago até</Rotulo>
              <input
                type="date"
                value={form.acesso_ate}
                onChange={(e) => setForm({ ...form, acesso_ate: e.target.value })}
                className={CLASSE_CAMPO}
              />
            </label>

            <label className="flex flex-col gap-2">
              <Rotulo>Mensalidade</Rotulo>
              <input
                value={form.mensalidade}
                onChange={(e) => setForm({ ...form, mensalidade: e.target.value })}
                inputMode="decimal"
                placeholder="250"
                className={CLASSE_CAMPO}
              />
            </label>
          </div>

          {erro && <Aviso>{erro}</Aviso>}

          <div className="flex flex-wrap gap-2.5">
            <Botao type="button" onClick={salvar} disabled={pendente} tamanho="sm">
              {pendente ? "Salvando" : "Salvar"}
            </Botao>
            <Botao
              type="button"
              onClick={() => {
                setEditando(false);
                setErro(null);
              }}
              aparencia="fantasma"
              tamanho="sm"
            >
              Cancelar
            </Botao>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <Linha rotulo="Plano" valor={aluno.tipo === "planilha" ? "Planilha" : "Consultoria"} />
          <Linha
            rotulo="Mensalidade"
            valor={aluno.mensalidade !== null ? emReais(aluno.mensalidade) : "não cadastrada"}
          />
          <Linha rotulo="Pago até" valor={curta(aluno.acesso_ate)} />
          <Linha rotulo="WhatsApp" valor={aluno.whatsapp || "não cadastrado"} />
          <Linha rotulo="E-mail" valor={aluno.email} />
        </div>
      )}
    </section>
  );
}
