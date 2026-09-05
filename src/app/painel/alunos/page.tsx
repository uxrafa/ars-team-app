import { criarClienteServidor } from "@/lib/supabase/server";
import {
  DIAS_DE_AVISO_DE_FICHA,
  diasEntre,
  hojeSP,
  iniciais,
  juntarAlunos,
  naAtiva,
  type LinhaAnamnese,
  type LinhaPerfil,
  type LinhaProtocolo,
  type LinhaCheckin,
} from "@/lib/painel";
import Link from "next/link";
import { BotaoLink } from "@/components/ui";
import { LinhaAluno, type AlunoNaTela } from "./linha";

export const metadata = { title: "Alunos · ARS Team" };

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano.slice(2)}`;
}

export default async function Alunos() {
  const supabase = await criarClienteServidor();
  const hoje = hojeSP();

  const [{ data: perfis }, { data: anamneses }, { data: protocolos }, { data: checkins }] =
    await Promise.all([
      supabase
        .from("perfis")
        // Traz arquivado junto: esta e a unica tela onde ele ainda aparece,
        // numa lista propria no rodape. Em todas as outras ele nao existe.
        .select(
          "id, nome, email, whatsapp, tipo, status, acesso_ate, mensalidade, criado_em, arquivado_em, arquivado_motivo",
        )
        .order("nome"),
      supabase.from("anamnese").select("aluno_id, status, dias_disponiveis, objetivo, enviada_em"),
      // So a ficha ativa: as encerradas e os rascunhos eram descartados em JS,
      // e cada aluno acumula uma ficha nova a cada poucas semanas.
      supabase
        .from("protocolo")
        .select("id, aluno_id, nome, inicio, fim, status")
        .eq("status", "ativo"),
      // Uma linha por aluno, do banco. Antes eram as 200 sessoes mais recentes
      // de todo mundo, e quem tinha parado de treinar caia fora da janela --
      // aparecia como "sem check-in" em vez de aparecer como sumido.
      supabase.from("ultimo_checkin").select("aluno_id, data"),
    ]);

  const todos = juntarAlunos(
    (perfis ?? []) as LinhaPerfil[],
    (anamneses ?? []) as LinhaAnamnese[],
    (protocolos ?? []) as LinhaProtocolo[],
    (checkins ?? []) as LinhaCheckin[],
  );

  const alunos = naAtiva(todos);
  const arquivados = todos.filter((a) => a.arquivado_em !== null);

  const naTela: AlunoNaTela[] = alunos.map((a) => {
    const diasVencido = a.acesso_ate ? diasEntre(a.acesso_ate, hoje) : null;
    const faltamNaFicha = a.protocolo?.fim ? diasEntre(hoje, a.protocolo.fim) : null;

    return {
      id: a.id,
      nome: a.nome,
      email: a.email,
      whatsapp: a.whatsapp,
      tipo: a.tipo === "planilha" ? "planilha" : "consultoria",
      status: a.status,
      acesso_ate: a.acesso_ate,
      mensalidade: a.mensalidade,
      diasVencido,
      ficha: a.protocolo?.nome ?? null,
      fichaDetalhe: a.protocolo?.fim
        ? faltamNaFicha !== null && faltamNaFicha < 0
          ? `venceu em ${formatarData(a.protocolo.fim)}`
          : `até ${formatarData(a.protocolo.fim)}`
        : a.anamnese?.status === "enviada"
          ? "anamnese respondida"
          : a.anamnese?.status === "rascunho"
            ? "anamnese pela metade"
            : "sem anamnese",
      fichaAlerta:
        faltamNaFicha !== null && faltamNaFicha <= DIAS_DE_AVISO_DE_FICHA,
      ultimoCheckin: a.ultimoCheckin?.data ?? null,
      diasSemTreino: a.ultimoCheckin ? diasEntre(a.ultimoCheckin.data, hoje) : null,
      anamnese: a.anamnese ? a.anamnese.status : "nenhuma",
    };
  });

  const consultoria = naTela.filter((a) => a.tipo === "consultoria").length;
  const planilha = naTela.length - consultoria;
  const semDados = naTela.filter((a) => a.acesso_ate === null || a.mensalidade === null).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase leading-none tracking-wide">Alunos</h1>
          <p className="mt-2.5 text-[15px] text-nevoa">
            {naTela.length === 0
              ? "Ninguém cadastrado ainda."
              : `${naTela.length} ${naTela.length === 1 ? "aluno" : "alunos"} · ${consultoria} na consultoria, ${planilha} com planilha`}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2.5">
          <BotaoLink href="/painel" aparencia="secundario">
            Voltar ao painel
          </BotaoLink>
          <BotaoLink href="/painel/convites">Convidar aluno</BotaoLink>
        </div>
      </div>

      {semDados > 0 && (
        <p className="rounded-xl border border-alerta/40 bg-alerta/[0.08] px-5 py-4 text-[15px] leading-relaxed text-alerta">
          {semDados === 1
            ? "1 aluno sem vencimento ou mensalidade."
            : `${semDados} alunos sem vencimento ou mensalidade.`}{" "}
          {/* Sai o "toque em Editar", que é instrução de primeira vez e está
              na mesma linha do problema. Fica o porquê, que não é óbvio. */}
          <span className="text-nevoa">
            Abra o aluno para preencher. Sem isso a fila de cobrança fica vazia.
          </span>
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-linha bg-tinta-2">
        <div className="hidden grid-cols-[1.7fr_0.8fr_1fr_1.3fr_0.9fr_auto] gap-4 bg-tinta-3 px-5 py-3 lg:grid">
          {/* "Mensal" no cabeçalho, e não "/mês" repetido em cada linha:
              unidade se declara uma vez. */}
          {["Aluno", "Plano", "Pagamento · mensal", "Ficha atual", "Check-in", ""].map((t, i) => (
            <span
              key={i}
              className="text-xs font-semibold uppercase tracking-[0.07em] text-nevoa"
            >
              {t}
            </span>
          ))}
        </div>

        {naTela.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-[15px] leading-relaxed text-nevoa">
              Nenhum aluno ainda. Cadastre em Convites e mande o link pelo WhatsApp: quando o
              aluno escolher a senha, ele aparece aqui sozinho, já com plano e vencimento.
            </p>
            <div className="mt-5 flex justify-center">
              <BotaoLink href="/painel/convites">Convidar o primeiro aluno</BotaoLink>
            </div>
          </div>
        ) : (
          <ul>
            {naTela.map((a) => (
              <LinhaAluno key={a.id} aluno={a} hoje={hoje} />
            ))}
          </ul>
        )}
      </section>

      {/* Os arquivados ficam no rodape, e nao atras de um filtro: sao poucos,
          e esconder num controle faria o Allisson esquecer que existem --
          justo quando alguem some da lista e ele vem procurar por que. */}
      {arquivados.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-linha bg-tinta-2/50">
          <div className="border-b border-linha px-5 py-4">
            <h2 className="text-lg font-bold text-nevoa">
              Arquivados · {arquivados.length}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-nevoa">
              Fora das listas e das contas. Nada foi apagado, e dá para reativar na tela de cada
              um.
            </p>
          </div>
          <ul>
            {arquivados.map((a) => (
              <li key={a.id} className="border-t border-linha first:border-t-0">
                <Link
                  href={`/painel/alunos/${a.id}`}
                  className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-tinta-3/40"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-linha bg-tinta-3 text-sm font-bold text-nevoa"
                  >
                    {iniciais(a.nome)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-nevoa">{a.nome}</p>
                    <p className="mt-1 truncate font-mono text-[13px] uppercase text-nevoa-fraca">
                      desde {formatarData(a.arquivado_em!.slice(0, 10))}
                      {a.arquivado_motivo ? ` · ${a.arquivado_motivo}` : ""}
                    </p>
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
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
