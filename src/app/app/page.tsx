import { criarClienteServidor } from "@/lib/supabase/server";
import { haQuantoTempo, hojeSP } from "@/lib/painel";
import {
  concluidas,
  ehDiaDeTreino,
  faixaDaSemana,
  progresso,
  proximoBloco,
  sessaoAberta as acharSessaoAberta,
} from "@/lib/treino";
import {
  carregarFichaAtiva,
  carregarSeries,
  carregarSessoes,
  carregarUltimasCargas,
} from "./carregar";
import {
  AcessoSuspenso,
  EsperandoFicha,
  SemAnamnese,
  VisaoDaPlanilha,
  VisaoDeHoje,
} from "./visao";

type Perfil = {
  id: string;
  nome: string;
  email: string;
  tipo: "admin" | "consultoria" | "planilha";
  status: "ativo" | "carencia" | "suspenso";
  acesso_ate: string | null;
};

/** Esta página só busca. Quem desenha está em `visao.tsx`. */
export default async function Hoje({
  searchParams,
}: {
  searchParams: Promise<{ feito?: string }>;
}) {
  const { feito } = await searchParams;
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfis")
    .select("id, nome, email, tipo, status, acesso_ate")
    .eq("id", user?.id ?? "")
    .maybeSingle<Perfil>();

  const alunoId = perfil?.id ?? "";
  const primeiroNome = (perfil?.nome || user?.email || "atleta").split(" ")[0];

  // O acesso de verdade é a mensalidade. Nada é apagado, só fica em espera.
  if (perfil?.status === "suspenso") return <AcessoSuspenso nome={primeiroNome} />;

  // TRES PERGUNTAS INDEPENDENTES, DE UMA VEZ SO.
  //
  // A ficha, a anamnese e o historico de sessoes nao dependem um do outro --
  // so precisam do id do aluno. Em fila eram tres idas ao banco somadas, e
  // esta e a tela de abertura do app: e o primeiro carregamento que o aluno
  // sente, no 4G da academia. Buscar as tres juntas custa a mais lenta, e nao
  // a soma das tres.
  //
  // O preco e buscar sessoes que a tela vai descartar se ele ainda nao
  // respondeu a anamnese -- caso que acontece uma vez na vida de cada aluno.
  const [{ protocolo, blocos }, { data: anamnese }, sessoes] = await Promise.all([
    carregarFichaAtiva(supabase, alunoId),
    supabase
      .from("anamnese")
      .select("status, dias_disponiveis")
      .eq("aluno_id", alunoId)
      .maybeSingle<{ status: "rascunho" | "enviada"; dias_disponiveis: number[] | null }>(),
    carregarSessoes(supabase, alunoId),
  ]);

  if (perfil?.tipo === "planilha") {
    if (!protocolo) return <EsperandoFicha primeiroNome={primeiroNome} />;
    return (
      <VisaoDaPlanilha
        primeiroNome={primeiroNome}
        acessoAte={perfil.acesso_ate}
        protocolo={protocolo}
        blocos={blocos}
      />
    );
  }

  if (anamnese?.status !== "enviada") {
    return <SemAnamnese primeiroNome={primeiroNome} comecou={Boolean(anamnese)} />;
  }

  if (!protocolo) return <EsperandoFicha primeiroNome={primeiroNome} />;

  const hoje = hojeSP();
  const aberta = acharSessaoAberta(sessoes);
  const feitas = concluidas(sessoes);

  const sugerido = proximoBloco(blocos, sessoes);
  // So os exercicios que estao na ficha dele: e o unico historico que esta
  // tela vai mostrar.
  const exerciciosDaFicha = [
    ...new Set(blocos.flatMap((b) => b.itens.map((i) => i.exercicio_id))),
  ];

  const [series, ultimaCarga] = await Promise.all([
    aberta ? carregarSeries(supabase, aberta.id) : Promise.resolve([]),
    carregarUltimasCargas(supabase, exerciciosDaFicha),
  ]);

  const p = progresso(
    aberta ? (blocos.find((b) => b.id === aberta.bloco_id) ?? sugerido) : sugerido,
    series,
  );

  return (
    <VisaoDeHoje
      primeiroNome={primeiroNome}
      hoje={hoje}
      dias={faixaDaSemana(
        feitas.map((s) => s.data),
        anamnese.dias_disponiveis,
        hoje,
      )}
      diaDeTreino={ehDiaDeTreino(anamnese.dias_disponiveis, hoje)}
      treinouHoje={feitas.some((s) => s.data === hoje)}
      protocolo={protocolo}
      blocos={blocos}
      sugerido={sugerido?.id ?? ""}
      sessaoAberta={Boolean(aberta)}
      seriesFeitas={p.seriesFeitas}
      seriesPrescritas={p.seriesPrescritas}
      ultimaCarga={ultimaCarga}
      recadoQuando={haQuantoTempo(protocolo.atualizado_em)}
      acabouDeConcluir={feito === "1"}
    />
  );
}
