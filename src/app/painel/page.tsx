import { criarClienteServidor } from "@/lib/supabase/server";
import {
  emQuilos,
  haQuantoTempo,
  hojeSP,
  juntarAlunos,
  montarAtencao,
  resumo,
  type EventoDoDia,
  type LinhaAnamnese,
  type LinhaPerfil,
  type LinhaProtocolo,
  type LinhaSessao,
} from "@/lib/painel";
import { VisaoDoPainel } from "./visao";

type SessaoComBloco = LinhaSessao & { bloco_treino: { nome: string } | null };

/** Esta pagina so busca. Quem desenha e a VisaoDoPainel. */
export default async function Painel() {
  const supabase = await criarClienteServidor();
  const hoje = hojeSP();
  const agora = new Date();

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
        // O nome do treino entra junto: a linha do feed diz "TREINO B", e sem
        // isso ela viraria so peso e esforco soltos.
        .select("id, aluno_id, data, status, peso_kg, esforco, concluida_em, bloco_treino (nome)")
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
    }).format(agora),
  );

  const mes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    month: "long",
  })
    .format(agora)
    .toUpperCase();

  const nomeDoAluno = (id: string) => alunos.find((a) => a.id === id)?.nome ?? null;

  /**
   * O que aconteceu HOJE, em uma lista so.
   *
   * Sao dois tipos de acontecimento, e os dois interessam pelo mesmo motivo:
   * check-in e o aluno usando o que ele montou, e chegada e alguem novo
   * esperando ficha. No desenho aprovado eles aparecem juntos, e faz sentido:
   * e a linha do tempo do dia dele, nao um relatorio de treino.
   */
  const eventos: EventoDoDia[] = [];

  for (const s of ((sessoes ?? []) as unknown as SessaoComBloco[])) {
    if (s.status !== "concluida" || s.data !== hoje) continue;
    const nome = nomeDoAluno(s.aluno_id);
    if (!nome) continue;

    eventos.push({
      id: `sessao-${s.id}`,
      aluno: nome,
      detalhe:
        [
          s.bloco_treino?.nome ?? null,
          emQuilos(s.peso_kg),
          s.esforco ? `esforço ${s.esforco}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "treino concluído",
      quando: haQuantoTempo(s.concluida_em, agora),
      em: s.concluida_em ?? `${hoje}T00:00:00Z`,
      chegada: false,
    });
  }

  for (const a of alunos) {
    const enviouHoje = a.anamnese?.enviada_em?.slice(0, 10) === hoje;
    const chegouHoje = a.criado_em.slice(0, 10) === hoje;
    if (!enviouHoje && !chegouHoje) continue;

    eventos.push({
      id: `chegada-${a.id}`,
      aluno: a.nome,
      detalhe: [chegouHoje ? "primeiro acesso" : null, enviouHoje ? "anamnese enviada" : null]
        .filter(Boolean)
        .join(" · "),
      quando: haQuantoTempo(enviouHoje ? a.anamnese!.enviada_em : a.criado_em, agora),
      em: (enviouHoje ? a.anamnese!.enviada_em : a.criado_em) ?? `${hoje}T00:00:00Z`,
      chegada: true,
    });
  }

  // Mais recente primeiro, pelo carimbo e nao pelo texto ja formatado.
  eventos.sort((x, y) => Date.parse(y.em) - Date.parse(x.em));

  return (
    <VisaoDoPainel
      saudacao={horaSP < 12 ? "Bom dia" : horaSP < 18 ? "Boa tarde" : "Boa noite"}
      mes={mes}
      atencao={montarAtencao(alunos, hoje)}
      r={resumo(alunos, (sessoes ?? []) as LinhaSessao[], hoje)}
      alunos={alunos}
      eventos={eventos.slice(0, 6)}
    />
  );
}
