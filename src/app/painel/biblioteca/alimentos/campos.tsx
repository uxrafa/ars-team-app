"use client";

import { CLASSE_CAMPO, Rotulo } from "@/components/ui";
import { kcal, milhar, paraNumero } from "@/lib/dieta";
import type { DadosAlimento } from "./acoes";

/**
 * Os campos do alimento, iguais no cadastro (modal) e na edição (no lugar).
 *
 * Os três números são os do rótulo, por 100 g. As calorias não se digitam:
 * saem de 4/4/9 sobre eles, a mesma conta das dietas, para o número que ele
 * vê aqui ser o mesmo que o aluno vê lá.
 */
export function CamposDoAlimento({
  form,
  aoMudar,
  grupos,
  focarNome = false,
}: {
  form: DadosAlimento;
  aoMudar: (f: DadosAlimento) => void;
  grupos: string[];
  focarNome?: boolean;
}) {
  const calorias = kcal({
    proteina: paraNumero(form.proteina) ?? 0,
    carboidrato: paraNumero(form.carboidrato) ?? 0,
    gordura: paraNumero(form.gordura) ?? 0,
  });

  // O grupo de um alimento antigo pode não estar na lista; ele continua
  // aparecendo como opção para não sumir ao abrir a edição.
  const opcoes = form.grupo && !grupos.includes(form.grupo) ? [form.grupo, ...grupos] : grupos;

  return (
    <div className="flex flex-col gap-4">
      {/* Um embaixo do outro: no modal estreito o grupo lado a lado cortava
          "Suplementos" no meio. */}
      <div className="grid gap-4">
        <label className="flex flex-col gap-2">
          <Rotulo>Nome</Rotulo>
          <input
            value={form.nome}
            onChange={(e) => aoMudar({ ...form, nome: e.target.value })}
            autoFocus={focarNome}
            placeholder="Whey isolado"
            className={CLASSE_CAMPO}
          />
        </label>

        <label className="flex flex-col gap-2">
          <Rotulo>Grupo</Rotulo>
          <select
            value={form.grupo}
            onChange={(e) => aoMudar({ ...form, grupo: e.target.value })}
            className={CLASSE_CAMPO}
          >
            {opcoes.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <Rotulo>Do rótulo, por 100 g</Rotulo>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(
            [
              ["Proteína", "proteina"],
              ["Carboidrato", "carboidrato"],
              ["Gordura", "gordura"],
            ] as const
          ).map(([rotulo, chave]) => (
            <label key={chave} className="flex flex-col gap-1.5">
              <span className="text-sm text-nevoa">{rotulo}</span>
              <span className="relative block">
                <input
                  inputMode="decimal"
                  value={form[chave]}
                  onChange={(e) => aoMudar({ ...form, [chave]: e.target.value })}
                  placeholder="0"
                  className={`${CLASSE_CAMPO} pr-8 font-mono`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-nevoa">
                  g
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-nevoa">
          <span className="font-mono text-papel">{milhar(calorias)} kcal</span> em 100 g
        </p>
      </div>
    </div>
  );
}
