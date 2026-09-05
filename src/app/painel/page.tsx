import { criarClienteServidor } from "@/lib/supabase/server";
import {
  haQuantoTempo,
  hojeSP,
  juntarAlunos,
  montarAtencao,
  resumo,
  type EventoDoDia,
  type LinhaAnamnese,
  type LinhaPerfil,
  type LinhaProtocolo,
  type LinhaCheckin,
  type LinhaSessao,
} from "@/lib/painel";
import { VisaoDoPainel } from "./visao";

type SessaoComBloco = LinhaSessao & {
  nota: string | null;
  bloco_treino: { nome: string } | null;
};

/** Esta pagina so busca. Quem desenha e a VisaoDoPainel. */
export default async function Painel() {
  const supabase = await criarClienteServidor();
  const hoje = hojeSP();
  const agora = new Date();

  const [{ data: perfis }, { data: anamneses }, { data: protocolos }, { data: checkins }, { data: sessoesDeHoje }] =
    await Promise.all([
      supabase
        .from("perfis")
        .select("id, nome, email, whatsapp, tipo, status, acesso_ate, mensalidade, criado_em")
        .order("nome"),
      supabase.from("anamnese").select("aluno_id, status, dias_disponiveis, objetivo, enviada_em"),
      supabase
        .from("protocolo")
        .select("id, aluno_id, nome, inicio, fim, status")
        .eq("status", "ativo"),
      // DUAS PERGUNTAS DIFERENTES, DUAS CONSULTAS.
      //
      // Antes eram as 60 sessoes mais recentes de todo mundo, servindo tanto o
      // "quem sumiu" quanto o feed do dia. Com 25 alunos, 60 sessoes cobrem
      // quatro dias: quem parou de treinar ha tres semanas nao aparecia, e o
      // painel dizia "sem check-in" em vez de "sumido ha 21 dias".
      //
      // 1) uma linha por aluno, para saber quem sumiu
      supabase.from("ultimo_checkin").select("aluno_id, data"),
      // 2) so o que aconteceu hoje, para o feed -- filtrado no banco, e nao
      //    peneirado em JS depois de trazer as outras semanas junto.
      supabase
        .from("sessao_treino")
        // O nome do treino entra junto: a linha do feed diz "TREINO B", e sem
        // isso ela viraria so peso e esforco soltos.
        .select("id, aluno_id, data, status, nota, concluida_em, bloco_treino (nome)")
        .eq("data", hoje)
        .eq("status", "concluida")
        .order("concluida_em", { ascending: false, nullsFirst: false }),
    ]);

  const alunos = juntarAlunos(
    (perfis ?? []) as LinhaPerfil[],
    (anamneses ?? []) as LinhaAnamnese[],
    (protocolos ?? []) as LinhaProtocolo[],
    (checkins ?? []) as LinhaCheckin[],
  );

  const horaSP = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }).format(agora),
  );

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

  // Ja vem so o de hoje, e so o que foi concluido: quem filtra e o banco.
  for (const s of ((sessoesDeHoje ?? []) as unknown as SessaoComBloco[])) {
    const nome = nomeDoAluno(s.aluno_id);
    if (!nome) continue;

    eventos.push({
      id: `sessao-${s.id}`,
      aluno: nome,
      // Só o nome do bloco. Peso e esforço têm cartão inteiro na tela de
      // Treinos, com o recado junto; nesta coluna estreita eles roubavam a
      // atenção do que importa aqui, que é quem treinou e quem escreveu.
      detalhe: s.bloco_treino?.nome ?? "treino concluído",
      quando: haQuantoTempo(s.concluida_em, agora),
      em: s.concluida_em ?? `${hoje}T00:00:00Z`,
      chegada: false,
      // A linha nao cabe o recado inteiro, entao ela so avisa que existe um.
      // Quem le o texto e a tela de Treinos.
      recado: Boolean(s.nota?.trim()),
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
      atencao={montarAtencao(alunos, hoje)}
      r={resumo(alunos, (sessoesDeHoje ?? []).length, hoje)}
      alunos={alunos}
      eventos={eventos.slice(0, 6)}
    />
  );
}
