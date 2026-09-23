import { Pilula, TituloDeCartao } from "@/components/ui";
import { alertasDeSaude, resumoDaAnamnese, type LinhaAnamneseFicha } from "@/lib/ficha";

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-linha py-2.5 first:border-t-0">
      <span className="text-sm text-nevoa">{rotulo}</span>
      <span className="text-right text-[15px] text-papel">{valor}</span>
    </div>
  );
}

/**
 * O que a anamnese conta para quem monta a ficha.
 *
 * Fica na lateral e não numa aba: o alerta de saúde precisa estar visível
 * ENQUANTO ele escolhe exercício, não a um clique de distância. Quem tem dor
 * lombar não recebe terra sumo, e isso só funciona se estiver na frente dele.
 */
export function Lateral({
  anamnese,
  alunoNome,
  fichaNoAr,
}: {
  anamnese: LinhaAnamneseFicha | null;
  alunoNome: string;
  /** Só o editor da ficha passa: sem ele, o cartão de publicação não aparece. */
  fichaNoAr?: boolean;
}) {
  const r = resumoDaAnamnese(anamnese);
  const alertas = alertasDeSaude(anamnese);
  const incompleta = anamnese?.status === "rascunho";

  return (
    <aside className="flex flex-col gap-5 xl:sticky xl:top-6">
      {alertas.length > 0 && (
        <section className="rounded-2xl border border-raio/45 bg-raio/[0.08] p-5">
          <TituloDeCartao tom="urgente">Atenção na saúde</TituloDeCartao>
          <ul className="mt-3 flex flex-col gap-2.5">
            {alertas.map((a, i) => (
              <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-papel">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-raio-forte" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
        <TituloDeCartao>Anamnese</TituloDeCartao>

        {!anamnese ? (
          <p className="mt-2.5 text-[15px] leading-relaxed text-nevoa">
            {alunoNome.split(" ")[0]} ainda não respondeu. Dá para montar assim mesmo, mas você
            monta sem saber lesão, objetivo e quantos dias ele treina.
          </p>
        ) : (
          <>
            {incompleta && (
              <p className="mt-2.5 text-[15px] leading-relaxed text-alerta">
                Respondida pela metade. O que estiver em branco abaixo é o que falta.
              </p>
            )}
            <div className="mt-3.5">
              <Linha rotulo="Objetivo" valor={r?.objetivo ?? null} />
              <Linha rotulo="Experiência" valor={r?.nivel ?? null} />
              <Linha rotulo="Onde treina" valor={r?.local ?? null} />
              <Linha rotulo="Horário" valor={r?.periodo ?? null} />
              <Linha
                rotulo="Dias por semana"
                valor={r?.dias.length ? `${r.dias.length} · ${r.dias.join(", ")}` : null}
              />
              <Linha rotulo="Peso" valor={r?.peso ? `${r.peso} kg` : null} />
              <Linha rotulo="Altura" valor={r?.altura ? `${r.altura} cm` : null} />
            </div>
          </>
        )}
      </section>

      {/* Só no editor da ficha: é lá que "publicar" é a decisão do momento.
          Duas linhas, o estado atual destacado, e nada de explicar como o
          sistema garante isso -- o Allisson precisa saber o quê, não o como
          (Rafael, 23/09). */}
      {fichaNoAr !== undefined && (
        <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
          <TituloDeCartao>Como o aluno vê</TituloDeCartao>
          <ul className="mt-3.5 flex flex-col gap-2">
            {[
              { atual: !fichaNoAr, pilula: <Pilula>Rascunho</Pilula>, texto: "Só você vê" },
              { atual: fichaNoAr, pilula: <Pilula tom="ok">No ar</Pilula>, texto: "Aparece no app do aluno" },
            ].map((l, k) => (
              <li
                key={k}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                  l.atual ? "bg-tinta-3 ring-1 ring-contorno" : "opacity-60"
                }`}
              >
                <span className="w-[92px] flex-none">{l.pilula}</span>
                <span className="text-[15px] text-papel">{l.texto}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
