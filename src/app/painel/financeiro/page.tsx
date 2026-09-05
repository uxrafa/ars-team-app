import { criarClienteServidor } from "@/lib/supabase/server";
import { diasEntre, hojeSP } from "@/lib/painel";
import {
  faturamentoPorMes,
  mesDe,
  mesesAte,
  resumoDoMes,
  type LinhaPagamento,
  type PagamentoNaTela,
} from "@/lib/pagamento";
import { VisaoFinanceiro } from "./visao";

export const metadata = { title: "Financeiro · ARS Team" };

/** Quantos meses o gráfico mostra. Seis cabem na largura sem virar tabela. */
const JANELA = 6;

type LinhaAluno = {
  id: string;
  nome: string;
  tipo: "admin" | "consultoria" | "planilha";
  acesso_ate: string | null;
  mensalidade: number | null;
};

/** Esta página só busca. Quem desenha é a VisaoFinanceiro. */
export default async function Financeiro({
  searchParams,
}: {
  searchParams: Promise<{ aluno?: string }>;
}) {
  const supabase = await criarClienteServidor();
  const { aluno: alunoNaUrl } = await searchParams;

  const hoje = hojeSP();
  const meses = mesesAte(mesDe(hoje), JANELA);

  const [{ data: perfis }, { data: pagos }] = await Promise.all([
    supabase
      .from("perfis")
      .select("id, nome, tipo, acesso_ate, mensalidade")
      .neq("tipo", "admin")
      .order("nome"),
    // Só a janela do gráfico. Trazer o histórico inteiro para somar seis
    // meses seria pedir ao banco tudo para usar um pedaço.
    supabase
      .from("pagamento")
      .select(
        "id, aluno_id, valor, recebido_em, meses, competencia_de, competencia_ate, forma, origem, estornado_em, estorno_motivo, observacao",
      )
      .gte("recebido_em", `${meses[0]}-01`)
      .order("recebido_em", { ascending: false })
      .order("criado_em", { ascending: false }),
  ]);

  const alunos = (perfis ?? []) as LinhaAluno[];
  const nomes = new Map(alunos.map((a) => [a.id, a.nome]));

  // `numeric` volta do PostgREST como texto em alguns casos. Somar texto daria
  // "250250" em vez de 500, e o erro passaria despercebido num mês calmo.
  const pagamentos: LinhaPagamento[] = ((pagos ?? []) as LinhaPagamento[]).map((p) => ({
    ...p,
    valor: Number(p.valor),
  }));

  const naTela: PagamentoNaTela[] = pagamentos.map((p) => ({
    ...p,
    aluno: nomes.get(p.aluno_id) ?? "aluno removido",
  }));

  const mesAtual = meses[meses.length - 1];
  const mesPassado = meses[meses.length - 2];

  const vencidos = alunos.filter((a) => a.acesso_ate && diasEntre(a.acesso_ate, hoje) > 0);
  const vencendo = alunos.filter((a) => {
    if (!a.acesso_ate) return false;
    const faltam = diasEntre(hoje, a.acesso_ate);
    return faltam >= 0 && faltam <= 7;
  });
  const somaMensalidade = (lista: LinhaAluno[]) =>
    lista.reduce((soma, a) => soma + Number(a.mensalidade ?? 0), 0);

  return (
    <VisaoFinanceiro
      hoje={hoje}
      mes={resumoDoMes(pagamentos, mesAtual)}
      mesAnterior={resumoDoMes(pagamentos, mesPassado)}
      barras={faturamentoPorMes(pagamentos, meses)}
      pagamentos={naTela}
      alunos={alunos.map((a) => ({
        id: a.id,
        nome: a.nome,
        acesso_ate: a.acesso_ate,
        mensalidade: a.mensalidade === null ? null : Number(a.mensalidade),
      }))}
      aReceber={{ quantos: vencendo.length, valor: somaMensalidade(vencendo) }}
      emAberto={{
        quantos: vencidos.length,
        valor: somaMensalidade(vencidos),
        semValor: vencidos.some((a) => a.mensalidade === null),
      }}
      alunoNaUrl={alunoNaUrl ?? null}
    />
  );
}
