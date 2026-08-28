"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Aviso, Botao, CLASSE_CAMPO, Rotulo } from "@/components/ui";
import { paraCarga } from "@/lib/treino";
import { registrarMedida } from "./acoes";

const CAMPOS = [
  ["peso_kg", "Peso", "kg"],
  ["cintura_cm", "Cintura", "cm"],
  ["quadril_cm", "Quadril", "cm"],
  ["braco_cm", "Braço", "cm"],
  ["coxa_cm", "Coxa", "cm"],
] as const;

type Chave = (typeof CAMPOS)[number][0];

/**
 * O registro do dia.
 *
 * Começa fechado com um botão só. Cinco campos abertos na cara de quem entrou
 * para ver o gráfico é formulário pedindo trabalho antes de dar resultado.
 */
export function RegistroDoDia({ jaRegistrou }: { jaRegistrou: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, agir] = useTransition();

  function gravar() {
    setErro(null);
    const medidas = Object.fromEntries(
      CAMPOS.map(([chave]) => [chave, paraCarga(valores[chave] ?? "")]),
    ) as Record<Chave, number | null>;

    agir(async () => {
      const r = await registrarMedida(medidas);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setAberto(false);
      setValores({});
      router.refresh();
    });
  }

  if (!aberto) {
    return (
      <Botao aparencia="secundario" largura="cheia" onClick={() => setAberto(true)}>
        {jaRegistrou ? "Corrigir o registro de hoje" : "Registrar peso e medidas de hoje"}
      </Botao>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-linha bg-tinta-2 p-5">
      <Rotulo>Registro de hoje</Rotulo>

      <div className="grid grid-cols-2 gap-3">
        {CAMPOS.map(([chave, nome, unidade]) => (
          <label key={chave} className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-nevoa">{nome}</span>
            <span className="relative block">
              <input
                value={valores[chave] ?? ""}
                onChange={(e) => {
                  setValores((v) => ({ ...v, [chave]: e.target.value }));
                  setErro(null);
                }}
                inputMode="decimal"
                className={`${CLASSE_CAMPO} pr-11`}
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-nevoa">
                {unidade}
              </span>
            </span>
          </label>
        ))}
      </div>

      <p className="text-sm text-nevoa">
        Preencha só o que quiser. O que ficar em branco não entra no lugar do que já existe.
      </p>

      {erro && <Aviso>{erro}</Aviso>}

      <div className="flex flex-col gap-2">
        <Botao largura="cheia" disabled={pendente} onClick={gravar}>
          {pendente ? "Gravando…" : "Gravar"}
        </Botao>
        <Botao
          aparencia="fantasma"
          largura="cheia"
          disabled={pendente}
          onClick={() => setAberto(false)}
        >
          Agora não
        </Botao>
      </div>
    </section>
  );
}
