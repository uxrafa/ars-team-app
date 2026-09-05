import { emReais } from "@/lib/painel";
import {
  nomeDoMes,
  siglaDoMes,
  variacao,
  type BarraDoMes,
  type PagamentoNaTela,
  type ResumoDoMes,
} from "@/lib/pagamento";
import { LinhaPagamentoNaLista } from "./linha";
import { Registrar, type AlunoParaCobrar } from "./registrar";

/**
 * Cartão de número. Mesma peça do painel, e pelo mesmo motivo: `detalhe` só
 * existe quando diz o que o número não diz, e `quieto` faz cartão de
 * pendência zerado recuar em vez de gritar junto com os outros.
 */
function Cartao({
  rotulo,
  valor,
  detalhe,
  tom = "normal",
  quieto = false,
}: {
  rotulo: string;
  valor: React.ReactNode;
  detalhe?: string | null;
  tom?: "normal" | "urgente" | "aviso";
  quieto?: boolean;
}) {
  const moldura =
    tom === "urgente"
      ? "border-raio/40 bg-gradient-to-br from-raio/[0.12] to-raio/[0.03]"
      : tom === "aviso"
        ? "border-alerta/40 bg-alerta/[0.07]"
        : "border-linha bg-tinta-2";
  const cor = quieto
    ? "text-nevoa-fraca"
    : tom === "urgente"
      ? "text-raio-forte"
      : tom === "aviso"
        ? "text-alerta"
        : "text-papel";

  return (
    <div className={`rounded-2xl border p-5 ${moldura}`}>
      <p
        className={`text-xs font-semibold uppercase tracking-[0.07em] ${
          tom === "normal" ? "text-nevoa" : cor
        }`}
      >
        {rotulo}
      </p>
      <p className={`mt-3 font-display text-[34px] leading-none tabular ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-2 text-sm leading-snug text-nevoa">{detalhe}</p>}
    </div>
  );
}

/**
 * As barras dos últimos seis meses.
 *
 * É CSS puro, sem biblioteca: seis retângulos e seis rótulos não justificam
 * mandar um pacote de gráfico para o navegador do Allisson.
 */
function Barras({ barras }: { barras: BarraDoMes[] }) {
  const teto = Math.max(...barras.map((b) => b.total), 1);

  return (
    <div className="flex items-end gap-3 sm:gap-5">
      {barras.map((b, i) => {
        const atual = i === barras.length - 1;
        const altura = Math.round((b.total / teto) * 100);
        return (
          <div key={b.mes} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span
              className={`font-mono text-[13px] tabular ${
                b.total > 0 ? "text-nevoa" : "text-nevoa-fraca"
              }`}
            >
              {b.total > 0 ? emReais(b.total) : "—"}
            </span>
            <div className="flex h-32 w-full items-end">
              <div
                // Piso de 2px para o mês zerado continuar existindo na régua:
                // barra de altura zero some e o mês parece não ter acontecido.
                style={{ height: `${Math.max(altura, 2)}%` }}
                className={`w-full rounded-lg ${atual ? "bg-raio-solido" : "bg-tinta-3 border border-contorno"}`}
              />
            </div>
            <span
              className={`font-mono text-[13px] uppercase tracking-wide ${
                atual ? "text-papel" : "text-nevoa"
              }`}
            >
              {siglaDoMes(b.mes)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export type DadosFinanceiro = {
  hoje: string;
  mes: ResumoDoMes;
  mesAnterior: ResumoDoMes;
  barras: BarraDoMes[];
  pagamentos: PagamentoNaTela[];
  alunos: AlunoParaCobrar[];
  aReceber: { quantos: number; valor: number };
  emAberto: { quantos: number; valor: number; semValor: boolean };
  alunoNaUrl: string | null;
};

export function VisaoFinanceiro({
  hoje,
  mes,
  mesAnterior,
  barras,
  pagamentos,
  alunos,
  aReceber,
  emAberto,
  alunoNaUrl,
}: DadosFinanceiro) {
  const variou = variacao(mes.total, mesAnterior.total);
  const doMes = pagamentos.filter((p) => p.recebido_em.slice(0, 7) === mes.mes);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl uppercase leading-none tracking-wide">Financeiro</h1>
        <p className="mt-2.5 text-[15px] text-nevoa">
          {/* Não é a mesma coisa que "mensalidades em dia", que era o que o
              painel conseguia dizer antes desta tabela existir. */}
          Uma linha por dinheiro que entrou. O vencimento do aluno anda sozinho a partir daqui.
        </p>
      </div>

      <Registrar
        alunos={alunos}
        hoje={hoje}
        abertoDeInicio={Boolean(alunoNaUrl)}
        alunoDeInicio={alunoNaUrl}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Cartao
          rotulo={`Recebido em ${nomeDoMes(mes.mes, false)}`}
          valor={emReais(mes.total)}
          detalhe={
            variou === null
              ? null
              : variou === 0
                ? "igual ao mês passado"
                : `${variou > 0 ? "+" : ""}${variou}% sobre ${nomeDoMes(mesAnterior.mes, false)}`
          }
        />
        <Cartao
          rotulo="Alunos que pagaram"
          valor={mes.alunos}
          // Só interessa quando alguém pagou duas vezes no mesmo mês, senão é
          // o mesmo número dito de outro jeito.
          detalhe={
            mes.quantidade > mes.alunos ? `${mes.quantidade} pagamentos no total` : null
          }
        />
        <Cartao
          rotulo="A receber em 7 dias"
          valor={emReais(aReceber.valor)}
          quieto={aReceber.quantos === 0}
          detalhe={
            aReceber.quantos > 0
              ? `${aReceber.quantos} ${aReceber.quantos === 1 ? "vencimento" : "vencimentos"} chegando`
              : null
          }
        />
        <Cartao
          rotulo="Em aberto"
          valor={emReais(emAberto.valor)}
          tom={emAberto.quantos > 0 ? "urgente" : "normal"}
          quieto={emAberto.quantos === 0}
          detalhe={
            emAberto.quantos === 0
              ? null
              : `${emAberto.quantos} ${emAberto.quantos === 1 ? "aluno vencido" : "alunos vencidos"}${
                  emAberto.semValor ? ", e falta a mensalidade de alguém" : ""
                }`
          }
        />
      </div>

      <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
        <h2 className="text-lg font-bold">Últimos seis meses</h2>
        <div className="mt-5">
          <Barras barras={barras} />
        </div>
      </section>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-linha bg-tinta-2">
        <div className="flex items-center gap-3 border-b border-linha px-5 py-4">
          <h2 className="text-lg font-bold">Pagamentos de {nomeDoMes(mes.mes)}</h2>
          {mes.estornados > 0 && (
            <span className="rounded-full border border-contorno px-3 py-1 text-[13px] font-semibold text-nevoa">
              {mes.estornados} {mes.estornados === 1 ? "estornado" : "estornados"}
            </span>
          )}
        </div>

        {doMes.length === 0 ? (
          // Estado vazio sem frase faz parecer que a tela quebrou.
          <p className="px-5 py-12 text-center text-[15px] leading-relaxed text-nevoa">
            {alunos.length === 0
              ? "Nenhum aluno cadastrado ainda. O primeiro pagamento aparece aqui assim que houver de quem receber."
              : `Nada recebido em ${nomeDoMes(mes.mes, false)} até agora.`}
          </p>
        ) : (
          <ul>
            {doMes.map((p) => (
              <LinhaPagamentoNaLista key={p.id} p={p} />
            ))}
          </ul>
        )}
      </section>

      {pagamentos.length > doMes.length && (
        <section className="flex flex-col overflow-hidden rounded-2xl border border-linha bg-tinta-2">
          <div className="border-b border-linha px-5 py-4">
            <h2 className="text-lg font-bold">Meses anteriores</h2>
          </div>
          <ul>
            {pagamentos
              .filter((p) => p.recebido_em.slice(0, 7) !== mes.mes)
              .map((p) => (
                <LinhaPagamentoNaLista key={p.id} p={p} />
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
