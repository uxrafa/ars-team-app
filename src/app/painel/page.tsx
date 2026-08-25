import { criarClienteServidor } from "@/lib/supabase/server";
import {
  hojeSP,
  juntarAlunos,
  montarAtencao,
  resumo,
  type LinhaAnamnese,
  type LinhaPerfil,
  type LinhaProtocolo,
  type LinhaSessao,
} from "@/lib/painel";
import { VisaoDoPainel } from "./visao";

/** Esta pagina so busca. Quem desenha e a VisaoDoPainel. */
export default async function Painel() {
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
        .limit(60),
    ]);

  const alunos = juntarAlunos(
    (perfis ?? []) as LinhaPerfil[],
    (anamneses ?? []) as LinhaAnamnese[],
    (protocolos ?? []) as LinhaProtocolo[],
    (sessoes ?? []) as LinhaSessao[],
  );

  const horaSP = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );

  const checkinsRecentes = ((sessoes ?? []) as LinhaSessao[])
    .filter((s) => s.status === "concluida")
    .slice(0, 6)
    .map((s) => ({ sessao: s, aluno: alunos.find((a) => a.id === s.aluno_id) }));

  return (
    <VisaoDoPainel
      saudacao={horaSP < 12 ? "Bom dia" : horaSP < 18 ? "Boa tarde" : "Boa noite"}
      hoje={hoje}
      atencao={montarAtencao(alunos, hoje)}
      r={resumo(alunos, (sessoes ?? []) as LinhaSessao[], hoje)}
      alunos={alunos}
      checkinsRecentes={checkinsRecentes}
    />
  );
}
