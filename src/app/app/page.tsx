import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeSP } from "@/lib/painel";
import {
  concluidas,
  ehDiaDeTreino,
  proximoBloco,
  sequencia,
  sessaoAberta as acharSessaoAberta,
} from "@/lib/treino";
import { carregarFichaAtiva, carregarSeries, carregarSessoes } from "./carregar";
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
};

function saudacaoDaHora(): string {
  const hora = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  return hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
}

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
    .select("id, nome, email, tipo, status")
    .eq("id", user?.id ?? "")
    .maybeSingle<Perfil>();

  const primeiroNome = (perfil?.nome || user?.email || "atleta").split(" ")[0];

  // O acesso de verdade é a mensalidade. Nada é apagado, só fica em espera.
  if (perfil?.status === "suspenso") return <AcessoSuspenso nome={primeiroNome} />;

  const { protocolo, blocos } = await carregarFichaAtiva(supabase, perfil?.id ?? "");

  if (perfil?.tipo === "planilha") {
    if (!protocolo) return <EsperandoFicha primeiroNome={primeiroNome} />;
    return (
      <VisaoDaPlanilha primeiroNome={primeiroNome} protocolo={protocolo} blocos={blocos} />
    );
  }

  const { data: anamnese } = await supabase
    .from("anamnese")
    .select("status, dias_disponiveis")
    .eq("aluno_id", perfil?.id ?? "")
    .maybeSingle<{ status: "rascunho" | "enviada"; dias_disponiveis: number[] | null }>();

  if (anamnese?.status !== "enviada") {
    return <SemAnamnese primeiroNome={primeiroNome} comecou={Boolean(anamnese)} />;
  }

  if (!protocolo) return <EsperandoFicha primeiroNome={primeiroNome} />;

  const hoje = hojeSP();
  const sessoes = await carregarSessoes(supabase, perfil?.id ?? "");
  const aberta = acharSessaoAberta(sessoes);
  const feitas = concluidas(sessoes);

  const bloco = proximoBloco(blocos, sessoes);
  const series = aberta ? await carregarSeries(supabase, aberta.id) : [];

  return (
    <VisaoDeHoje
      saudacao={saudacaoDaHora()}
      primeiroNome={primeiroNome}
      hoje={hoje}
      sequenciaDeDias={sequencia(
        feitas.map((s) => s.data),
        anamnese.dias_disponiveis,
        hoje,
      )}
      diaDeTreino={ehDiaDeTreino(anamnese.dias_disponiveis, hoje)}
      treinouHoje={feitas.some((s) => s.data === hoje)}
      protocolo={protocolo}
      bloco={bloco}
      outros={blocos.filter((b) => b.id !== bloco?.id)}
      sessaoAberta={Boolean(aberta)}
      seriesFeitas={series}
      acabouDeConcluir={feito === "1"}
    />
  );
}
