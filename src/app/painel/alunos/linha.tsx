import Link from "next/link";
import { emReais, estadoDoPagamento, iniciais, quandoFoi } from "@/lib/painel";
import { Pilula } from "@/components/ui";

export type AlunoNaTela = {
  id: string;
  nome: string;
  email: string;
  whatsapp: string | null;
  tipo: "consultoria" | "planilha";
  status: "ativo" | "carencia" | "suspenso";
  acesso_ate: string | null;
  mensalidade: number | null;
  /** já calculado no servidor, para a tela não repetir conta */
  diasVencido: number | null;
  ficha: string | null;
  fichaDetalhe: string | null;
  fichaAlerta: boolean;
  ultimoCheckin: string | null;
  diasSemTreino: number | null;
  anamnese: "nenhuma" | "rascunho" | "enviada";
};

/**
 * Uma linha da lista de alunos.
 *
 * Deixou de ser client component: a edição de plano e cobrança saiu daqui e
 * foi para a tela do aluno. Espremer cinco campos dentro de uma linha de
 * tabela era o que obrigava esta lista a carregar formulário, estado e ação
 * para os 25 alunos de uma vez.
 *
 * Agora a linha inteira é o alvo, com a altura toda: não tem link dentro de
 * link, e ninguém precisa acertar um botão pequeno no fim da linha.
 */
export function LinhaAluno({ aluno, hoje }: { aluno: AlunoNaTela; hoje: string }) {
  const pagamento = estadoDoPagamento(aluno);

  return (
    <li className="border-t border-linha first:border-t-0">
      <Link
        href={`/painel/alunos/${aluno.id}`}
        className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-4 transition-colors hover:bg-tinta-3/40 lg:grid-cols-[1.7fr_0.8fr_1fr_1.3fr_0.9fr_auto] lg:gap-4"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-contorno bg-tinta-3 text-sm font-bold"
          >
            {iniciais(aluno.nome)}
          </span>
          <p className="truncate text-base font-semibold">{aluno.nome}</p>
        </div>

        <div className="hidden text-[15px] text-nevoa lg:block">
          {aluno.tipo === "consultoria" ? "Consultoria" : "Planilha"}
        </div>

        <div className="hidden lg:block">
          <Pilula tom={pagamento.tom}>{pagamento.texto}</Pilula>
          {aluno.mensalidade !== null && (
            <p className="mt-1.5 font-mono text-[13px] text-nevoa">{emReais(aluno.mensalidade)}</p>
          )}
        </div>

        <div className="hidden lg:block">
          <p className={`text-[15px] ${aluno.ficha ? "" : "text-nevoa"}`}>
            {aluno.ficha ?? "Sem ficha"}
          </p>
          {aluno.fichaDetalhe && (
            <p
              className={`mt-1 font-mono text-[13px] uppercase ${
                aluno.fichaAlerta ? "text-alerta" : "text-nevoa"
              }`}
            >
              {aluno.fichaDetalhe}
            </p>
          )}
        </div>

        <div
          className={`hidden text-[15px] lg:block ${
            aluno.diasSemTreino !== null && aluno.diasSemTreino >= 7
              ? "text-raio-forte"
              : "text-nevoa"
          }`}
        >
          {quandoFoi(aluno.ultimoCheckin, hoje)}
        </div>

        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5 flex-none text-nevoa"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}
