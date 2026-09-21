"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Aviso, Botao, CLASSE_CAMPO } from "@/components/ui";
import { paraCarga } from "@/lib/treino";
import { registrarMedida } from "./acoes";

/*
 * OS CAMPOS SÓ APARECEM QUANDO O ALUNO PEDE.
 *
 * Até 21/09 o formulário ficava aberto o tempo todo embaixo do cartão, e o
 * Rafael apontou o problema: campo vazio à vista parece pendência, e o aluno
 * acha que está "faltando" preencher alguma coisa. Agora a tela mostra o que
 * ele já tem, e um botão para registrar de novo. Gravou, fecha.
 *
 * Os campos abrem VAZIOS, com o último valor no placeholder. Pré-preencher com
 * o valor antigo fazia o aluno gravar o mesmo número sem perceber.
 */

/* ------------------------------------------------------------------ */
/* Peso                                                                */
/* ------------------------------------------------------------------ */

export function RegistroDePeso({ atual }: { atual: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [peso, setPeso] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, agir] = useTransition();

  function fechar() {
    setAberto(false);
    setPeso("");
    setErro(null);
  }

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
      fechar();
      router.refresh();
    });
  }

  if (!aberto) {
    return (
      <Botao aparencia="secundario" largura="cheia" onClick={() => setAberto(true)}>
        Registrar peso
      </Botao>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <label className="relative block">
        <span className="sr-only">Seu peso de hoje em quilos</span>
        <input
          value={peso}
          onChange={(e) => {
            setPeso(e.target.value);
            setErro(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && gravar()}
          inputMode="decimal"
          placeholder={atual || "78,4"}
          autoFocus
          className={`${CLASSE_CAMPO} pr-11`}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-nevoa">
          kg
        </span>
      </label>
      {erro && <Aviso>{erro}</Aviso>}
      <div className="grid grid-cols-2 gap-2.5">
        <Botao aparencia="fantasma" onClick={fechar} disabled={pendente}>
          Cancelar
        </Botao>
        <Botao onClick={gravar} disabled={pendente}>
          {pendente ? "Gravando…" : "Gravar"}
        </Botao>
      </div>
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

const VAZIO = Object.fromEntries(CAMPOS.map(([c]) => [c, ""])) as Record<Chave, string>;

export function RegistroDeMedidas({
  atuais,
}: {
  atuais: Partial<Record<Chave, number | null>>;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [valores, setValores] = useState<Record<Chave, string>>(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, agir] = useTransition();

  function fechar() {
    setAberto(false);
    setValores(VAZIO);
    setErro(null);
  }

  function gravar() {
    setErro(null);
    const medidas = Object.fromEntries(
      CAMPOS.map(([chave]) => [chave, paraCarga(valores[chave] ?? "")]),
    ) as Record<Chave, number | null>;

    if (Object.values(medidas).every((v) => v === null)) {
      setErro("Preencha pelo menos uma medida.");
      return;
    }

    agir(async () => {
      const r = await registrarMedida({ peso_kg: null, ...medidas });
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      // Sem aviso de "guardado": o número novo aparecendo no cartão de cima
      // já é a confirmação.
      fechar();
      router.refresh();
    });
  }

  if (!aberto) {
    return (
      <Botao aparencia="secundario" largura="cheia" onClick={() => setAberto(true)}>
        Registrar medidas
      </Botao>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-linha bg-tinta-2 p-[18px]">
      {/* Uma frase só, e é a que responde a dúvida real de quem mede uma
          coisa e não as outras. */}
      <p className="text-sm leading-relaxed text-nevoa">O que ficar em branco continua como está.</p>

      <div className="grid grid-cols-2 gap-3">
        {CAMPOS.map(([chave, nome], i) => (
          <label key={chave} className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-nevoa">{nome}</span>
            <span className="relative block">
              <input
                value={valores[chave]}
                onChange={(e) => {
                  setValores((v) => ({ ...v, [chave]: e.target.value }));
                  setErro(null);
                }}
                inputMode="decimal"
                placeholder={
                  atuais[chave] !== null && atuais[chave] !== undefined
                    ? String(atuais[chave]).replace(".", ",")
                    : ""
                }
                autoFocus={i === 0}
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

      <div className="grid grid-cols-2 gap-2.5">
        <Botao aparencia="fantasma" onClick={fechar} disabled={pendente}>
          Cancelar
        </Botao>
        <Botao onClick={gravar} disabled={pendente}>
          {pendente ? "Gravando…" : "Gravar"}
        </Botao>
      </div>
    </section>
  );
}
