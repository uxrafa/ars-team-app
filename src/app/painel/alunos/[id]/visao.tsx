import { BotaoLink } from "@/components/ui";
import { quandoFoi } from "@/lib/painel";
import type { LinhaAnamneseFicha } from "@/lib/ficha";
import { Arquivar } from "./arquivar";
import { Cobranca } from "./cobranca";
import { Lateral } from "./lateral";

export type FichaNoResumo = {
  nome: string;
  inicio: string;
  fim: string | null;
  /** Dias que faltam para vencer. Negativo quer dizer que já venceu. */
  faltam: number | null;
};

export type DadosDoResumo = {
  alunoId: string;
  alunoNome: string;
  hoje: string;
  ficha: FichaNoResumo | null;
  ultimoTreino: string | null;
  anamnese: LinhaAnamneseFicha | null;
  arquivadoEm: string | null;
  arquivadoMotivo: string | null;
  cobranca: {
    id: string;
    email: string;
    whatsapp: string | null;
    tipo: "consultoria" | "planilha";
    status: "ativo" | "carencia" | "suspenso";
    acesso_ate: string | null;
    mensalidade: number | null;
  };
};

function curta(iso: string | null): string | null {
  if (!iso) return null;
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano.slice(2)}`;
}

/**
 * O resumo do aluno: o estado dele em uma olhada.
 *
 * As duas perguntas que o Allisson faz antes de qualquer coisa são "ele tem
 * ficha?" e "ele está treinando?". Elas ficam em cima, em número grande, e o
 * resto é consulta.
 */
export function VisaoDoResumo({
  alunoId,
  alunoNome,
  hoje,
  ficha,
  ultimoTreino,
  anamnese,
  arquivadoEm,
  arquivadoMotivo,
  cobranca,
}: DadosDoResumo) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <div className="flex flex-col gap-5">
        {/* Em cima, e não só no cartão lá embaixo: sem isto o Allisson abriria
            um aluno arquivado, veria ficha e treinos normais, e acharia que
            ele continua na ativa. */}
        {arquivadoEm && (
          <p className="rounded-xl border border-contorno bg-tinta-3/40 px-4 py-3.5 text-[15px] leading-relaxed text-nevoa">
            Este aluno está arquivado. Ele não aparece nas listas nem entra no app, e nada do que
            está aqui foi apagado.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.07em] text-nevoa">
              Ficha no ar
            </p>
            {ficha ? (
              <>
                <p className="mt-3 text-lg font-semibold">{ficha.nome}</p>
                <p className="mt-1.5 font-mono text-[13px] uppercase tabular text-nevoa">
                  {curta(ficha.inicio)}
                  {ficha.fim ? ` até ${curta(ficha.fim)}` : ""}
                </p>
                {ficha.faltam !== null && ficha.faltam <= 7 && (
                  <p className="mt-2 text-sm text-alerta">
                    {ficha.faltam < 0
                      ? `Venceu faz ${Math.abs(ficha.faltam)} dias`
                      : ficha.faltam === 0
                        ? "Vence hoje"
                        : `Vence em ${ficha.faltam} ${ficha.faltam === 1 ? "dia" : "dias"}`}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-[15px] leading-relaxed text-nevoa">
                Nenhuma ficha publicada. O aluno abre o app e não vê treino nenhum.
              </p>
            )}
            <div className="mt-4">
              <BotaoLink
                href={`/painel/alunos/${alunoId}/ficha`}
                aparencia={ficha ? "secundario" : "primario"}
                tamanho="sm"
              >
                {ficha ? "Abrir a ficha" : "Montar a ficha"}
              </BotaoLink>
            </div>
          </section>

          <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.07em] text-nevoa">
              Último treino
            </p>
            <p className="mt-3 font-display text-[34px] uppercase leading-none tracking-wide">
              {quandoFoi(ultimoTreino, hoje)}
            </p>
            {ultimoTreino && (
              <p className="mt-2 font-mono text-[13px] uppercase tabular text-nevoa">
                {curta(ultimoTreino)}
              </p>
            )}
            <div className="mt-4">
              <BotaoLink
                href={`/painel/alunos/${alunoId}/treinos`}
                aparencia="secundario"
                tamanho="sm"
              >
                Ver os treinos
              </BotaoLink>
            </div>
          </section>
        </div>

        <Cobranca aluno={cobranca} />

        <Arquivar
          alunoId={alunoId}
          alunoNome={alunoNome}
          arquivadoEm={arquivadoEm}
          arquivadoMotivo={arquivadoMotivo}
        />
      </div>

      <Lateral anamnese={anamnese} alunoNome={alunoNome} />
    </div>
  );
}
