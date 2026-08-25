import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  DIAS_DE_AVISO_DE_FICHA,
  diasEntre,
  hojeSP,
  juntarAlunos,
  type LinhaAnamnese,
  type LinhaPerfil,
  type LinhaProtocolo,
  type LinhaSessao,
} from "@/lib/painel";
import { LinhaAluno, type AlunoNaTela } from "./linha";

export const metadata = { title: "Alunos · ARS Team" };

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano.slice(2)}`;
}

export default async function Alunos() {
  const supabase = await criarClienteServidor();
  const hoje = hojeSP();

  const [{ data: perfis }, { data: anamneses }, { data: protocolos }, { data: sessoes }] =
    await Promise.all([
      supabase
        .from("perfis")
        .select("id, nome, email, whatsapp, tipo, status, acesso_ate, mensalidade, criado_em")
        .order("nome"),
      supabase.from("anamnese").select("aluno_id, status, dias_disponiveis, objetivo, enviada_em"),
      supabase.from("protocolo").select("id, aluno_id, nome, inicio, fim, status"),
      supabase
        .from("sessao_treino")
        .select("id, aluno_id, data, status, peso_kg, esforco, concluida_em")
        .order("concluida_em", { ascending: false, nullsFirst: false })
        .limit(200),
    ]);

  const alunos = juntarAlunos(
    (perfis ?? []) as LinhaPerfil[],
    (anamneses ?? []) as LinhaAnamnese[],
    (protocolos ?? []) as LinhaProtocolo[],
    (sessoes ?? []) as LinhaSessao[],
  );

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
          <p className="mt-2 text-[13.5px] text-nevoa">
            {naTela.length === 0
              ? "Ninguém cadastrado ainda."
              : `${naTela.length} ${naTela.length === 1 ? "aluno" : "alunos"} · ${consultoria} na consultoria, ${planilha} com planilha`}
          </p>
        </div>
        <Link
          href="/painel"
          className="ml-auto rounded-lg border border-linha bg-tinta-2 px-5 py-2.5 text-[13.5px] font-semibold transition hover:border-raio"
        >
          Voltar ao painel
        </Link>
      </div>

      {semDados > 0 && (
        <p className="rounded-xl border border-[#f2b330]/35 bg-[#f2b330]/[0.07] px-4 py-3 text-[13px] leading-relaxed text-[#f2b330]">
          {semDados === 1
            ? "1 aluno está sem data de vencimento ou mensalidade."
            : `${semDados} alunos estão sem data de vencimento ou mensalidade.`}{" "}
          <span className="text-nevoa">
            Toque em Editar para preencher. É isso que faz a fila de cobrança do painel funcionar.
          </span>
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-linha bg-tinta-2">
        <div className="hidden grid-cols-[1.7fr_0.8fr_1fr_1.3fr_0.9fr_auto] gap-4 bg-tinta-3 px-5 py-3 lg:grid">
          {["Aluno", "Plano", "Pagamento", "Ficha atual", "Check-in", ""].map((t, i) => (
            <span
              key={i}
              className="font-mono text-[10px] uppercase tracking-[0.1em] text-nevoa"
            >
              {t}
            </span>
          ))}
        </div>

        {naTela.length === 0 ? (
          <p className="px-6 py-16 text-center text-[13.5px] leading-relaxed text-nevoa">
            Nenhum aluno ainda. Enquanto a tela de convite não existe, criar conta é pelo
            painel da Supabase, e depois o aluno aparece aqui sozinho.
          </p>
        ) : (
          <ul>
            {naTela.map((a) => (
              <LinhaAluno key={a.id} aluno={a} hoje={hoje} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
