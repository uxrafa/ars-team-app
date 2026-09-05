import Link from "next/link";
import { notFound } from "next/navigation";
import { LinkIcone, Pilula } from "@/components/ui";
import { diasEntre, estadoDoPagamento, hojeSP, iniciais, linkWhatsapp } from "@/lib/painel";
import { AbasDoAluno } from "./abas";
import { carregarAluno } from "./carregar";

export type { PerfilDoAluno } from "./carregar";

/**
 * O cabeçalho de tudo que é daquele aluno.
 *
 * Antes cada tela repetia nome, plano e situação por conta própria, e a ficha
 * ainda tinha um "Ficha de Marcos" só dela. Aqui isso é dito uma vez, e as
 * abas trocam só o miolo.
 */
export default async function LayoutDoAluno({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const aluno = await carregarAluno(id);
  if (!aluno) notFound();

  const hoje = hojeSP();
  const pagamento = estadoDoPagamento({
    status: aluno.status,
    acesso_ate: aluno.acesso_ate,
    diasVencido: aluno.acesso_ate ? diasEntre(aluno.acesso_ate, hoje) : null,
  });

  const primeiroNome = aluno.nome.split(" ")[0];
  const zap = linkWhatsapp(aluno.whatsapp, `Oi ${primeiroNome}, tudo bem?`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/painel/alunos"
          className="inline-flex min-h-11 items-center text-[15px] text-nevoa underline underline-offset-4 transition-colors hover:text-papel"
        >
          Alunos
        </Link>
        <span aria-hidden="true" className="text-nevoa-fraca">
          /
        </span>
        <span className="text-[15px] text-papel">{aluno.nome}</span>
      </div>

      <header className="flex flex-wrap items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 flex-none items-center justify-center rounded-full border border-contorno bg-tinta-3 text-base font-bold"
        >
          {iniciais(aluno.nome)}
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl uppercase leading-none tracking-wide">
            {aluno.nome}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Pilula tom="neutro">
              {aluno.tipo === "planilha" ? "Planilha" : "Consultoria"}
            </Pilula>
            <Pilula tom={pagamento.tom}>{pagamento.texto}</Pilula>
          </div>
        </div>

        {zap && (
          <LinkIcone
            href={zap}
            target="_blank"
            rel="noreferrer"
            rotulo={`Abrir WhatsApp de ${aluno.nome}`}
            className="hover:border-ok/60 hover:text-ok"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.7 8.7 0 0 1-4-1L3 20l1.1-3.4a8.7 8.7 0 0 1-1-4A8.38 8.38 0 0 1 11.5 4a8.5 8.5 0 0 1 9.5 7.5z" />
            </svg>
          </LinkIcone>
        )}
      </header>

      <AbasDoAluno alunoId={aluno.id} />

      {children}
    </div>
  );
}
