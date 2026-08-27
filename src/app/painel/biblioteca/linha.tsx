"use client";

import { useState, useTransition } from "react";
import { Aviso, Botao, BotaoLink, CLASSE_CAMPO, Pilula, Rotulo } from "@/components/ui";
import { GRUPOS, type Grupo, type LinhaExercicio } from "@/lib/biblioteca";
import { alternarAtivo, salvarExercicio, type DadosExercicio } from "./acoes";

function Play() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

export function Linha({ e }: { e: LinhaExercicio }) {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  const [form, setForm] = useState<DadosExercicio>({
    id: e.id,
    nome: e.nome,
    grupo: e.grupo,
    equipamento: e.equipamento ?? "",
    video_url: e.video_url ?? "",
  });

  function salvar() {
    setErro(null);
    comecar(async () => {
      const r = await salvarExercicio(form);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setEditando(false);
    });
  }

  function mudarAtivo(ativo: boolean) {
    setErro(null);
    comecar(async () => {
      const r = await alternarAtivo(e.id, ativo);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setEditando(false);
    });
  }

  function cancelar() {
    setForm({
      id: e.id,
      nome: e.nome,
      grupo: e.grupo,
      equipamento: e.equipamento ?? "",
      video_url: e.video_url ?? "",
    });
    setErro(null);
    setEditando(false);
  }

  if (editando) {
    return (
      <li className="border-t border-linha bg-tinta-3/40 px-5 py-4 first:border-t-0 lg:col-span-2 lg:[&:nth-child(2)]:border-t-0">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
          <label className="flex flex-col gap-2">
            <Rotulo>Nome</Rotulo>
            <input
              value={form.nome}
              onChange={(ev) => setForm({ ...form, nome: ev.target.value })}
              className={CLASSE_CAMPO}
            />
          </label>

          <label className="flex flex-col gap-2">
            <Rotulo>Grupo</Rotulo>
            <select
              value={form.grupo}
              onChange={(ev) => setForm({ ...form, grupo: ev.target.value as Grupo })}
              className={CLASSE_CAMPO}
            >
              {GRUPOS.map((g) => (
                <option key={g.valor} value={g.valor}>
                  {g.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <Rotulo>Equipamento</Rotulo>
            <input
              value={form.equipamento}
              onChange={(ev) => setForm({ ...form, equipamento: ev.target.value })}
              placeholder="Máquina, Polia, Halter..."
              className={CLASSE_CAMPO}
            />
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-2">
          <Rotulo>Link do vídeo</Rotulo>
          <input
            value={form.video_url}
            onChange={(ev) => setForm({ ...form, video_url: ev.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
            inputMode="url"
            className={CLASSE_CAMPO}
          />
          <span className="text-sm text-nevoa">
            Cole o endereço do YouTube não listado. Deixe vazio enquanto o vídeo não existe.
          </span>
        </label>

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
            onClick={cancelar}
            disabled={pendente}
            aparencia="secundario"
            tamanho="sm"
          >
            Cancelar
          </Botao>
          <Botao
            type="button"
            onClick={() => mudarAtivo(!e.ativo)}
            disabled={pendente}
            aparencia="fantasma"
            tamanho="sm"
            className="sm:ml-auto"
          >
            {e.ativo ? "Tirar de circulação" : "Voltar a usar"}
          </Botao>
        </div>
      </li>
    );
  }

  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-linha px-5 py-3.5 transition-colors first:border-t-0 hover:bg-tinta-3/40 lg:odd:border-r lg:[&:nth-child(2)]:border-t-0 ${
        e.ativo ? "" : "opacity-55"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-papel">{e.nome}</span>
        <span className="mt-0.5 block text-sm text-nevoa">
          {e.equipamento ?? "sem equipamento"}
          {!e.ativo && " · fora de circulação"}
        </span>
      </span>

      {e.video_url ? (
        <BotaoLink
          href={e.video_url}
          target="_blank"
          rel="noopener noreferrer"
          aparencia="secundario"
          tamanho="sm"
        >
          <Play />
          Vídeo
        </BotaoLink>
      ) : (
        <Pilula tom="aviso">Sem vídeo</Pilula>
      )}

      <Botao type="button" onClick={() => setEditando(true)} aparencia="secundario" tamanho="sm">
        Editar
      </Botao>

      {erro && (
        <div className="w-full">
          <Aviso>{erro}</Aviso>
        </div>
      )}
    </li>
  );
}
