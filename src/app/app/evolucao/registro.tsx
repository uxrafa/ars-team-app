"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Aviso, Botao, CLASSE_CAMPO } from "@/components/ui";
import { paraCarga } from "@/lib/treino";
import { registrarMedida } from "./acoes";

/**
 * Registro rápido do peso.
 *
 * Um campo e um botão, na linha de baixo do gráfico, como no artboard. É o
 * gesto que a pessoa repete toda semana, e ele não merece um formulário.
 */
export function RegistroDePeso({ atual }: { atual: string }) {
  const router = useRouter();
  const [peso, setPeso] = useState(atual);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, agir] = useTransition();

  function gravar() {
    setErro(null);
    const valor = paraCarga(peso);
    if (valor === null || valor < 25 || valor > 400) {
      setErro("Confira o peso: use algo entre 25 e 400 kg.");
      return;
    }
    agir(async () => {
      const r = await registrarMedida({
        peso_kg: valor,
        cintura_cm: null,
        quadril_cm: null,
        braco_cm: null,
        coxa_cm: null,
      });
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2.5">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Seu peso de hoje em quilos</span>
          <input
            value={peso}
            onChange={(e) => {
              setPeso(e.target.value);
              setErro(null);
            }}
            inputMode="decimal"
            placeholder="78,4"
            className={`${CLASSE_CAMPO} pr-11`}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-nevoa">
            kg
          </span>
        </label>
        <Botao disabled={pendente} onClick={gravar}>
          {pendente ? "…" : "Registrar"}
        </Botao>
      </div>
      {erro && <Aviso>{erro}</Aviso>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Medidas                                                             */
/* ------------------------------------------------------------------ */

const CAMPOS = [
  ["cintura_cm", "Cintura"],
  ["quadril_cm", "Quadril"],
  ["braco_cm", "Braço"],
  ["coxa_cm", "Coxa"],
] as const;

type Chave = (typeof CAMPOS)[number][0];

export function RegistroDeMedidas({
  atuais,
}: {
  atuais: Partial<Record<Chave, number | null>>;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      CAMPOS.map(([chave]) => [
        chave,
        atuais[chave] !== null && atuais[chave] !== undefined
          ? String(atuais[chave]).replace(".", ",")
          : "",
      ]),
    ),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pendente, agir] = useTransition();

  function gravar() {
    setErro(null);
    setSalvo(false);
    const medidas = Object.fromEntries(
      CAMPOS.map(([chave]) => [chave, paraCarga(valores[chave] ?? "")]),
    ) as Record<Chave, number | null>;

    agir(async () => {
      const r = await registrarMedida({ peso_kg: null, ...medidas });
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setSalvo(true);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-linha bg-tinta-2 p-[18px]">
      <p className="text-[13.5px] leading-[1.5] text-nevoa">
        Meça sempre no mesmo horário e do mesmo jeito. O que ficar em branco não apaga o que já
        está guardado.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {CAMPOS.map(([chave, nome]) => (
          <label key={chave} className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-nevoa">{nome}</span>
            <span className="relative block">
              <input
                value={valores[chave] ?? ""}
                onChange={(e) => {
                  setValores((v) => ({ ...v, [chave]: e.target.value }));
                  setErro(null);
                  setSalvo(false);
                }}
                inputMode="decimal"
                className={`${CLASSE_CAMPO} pr-10`}
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-nevoa">
                cm
              </span>
            </span>
          </label>
        ))}
      </div>

      {erro && <Aviso>{erro}</Aviso>}
      {salvo && !erro && <Aviso tom="ok">Medidas de hoje guardadas.</Aviso>}

      <Botao largura="cheia" disabled={pendente} onClick={gravar}>
        {pendente ? "Gravando…" : "Gravar medidas de hoje"}
      </Botao>
    </section>
  );
}
