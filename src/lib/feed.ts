/**
 * Regras do feed de treinos do Allisson.
 *
 * O aluno fecha o treino e deixa peso, esforco e um recado. Ate aqui esse
 * recado era gravado em `sessao_treino.nota` e nao era lido em lugar nenhum:
 * o painel so contava check-ins. Este arquivo transforma as linhas cruas em
 * o que a tela mostra, e igual ao `painel.ts` e so funcao pura, para dar
 * para conferir sem subir o Supabase.
 */

/** Janela do feed. Duas semanas cobrem o ciclo de quem treina 3x por semana. */
export const DIAS_DO_FEED = 14;

/** Recado mais comprido que isto entra cortado no link do WhatsApp. */
export const LIMITE_DA_CITACAO = 280;

export type LinhaSessaoFeed = {
  id: string;
  aluno_id: string;
  data: string;
  peso_kg: number | null;
  esforco: number | null;
  nota: string | null;
  iniciada_em: string;
  concluida_em: string | null;
  bloco: { nome: string; foco: string | null } | null;
};

export type LinhaSerieFeed = {
  sessao_id: string;
  exercicio_id: string;
  numero: number;
  carga_kg: number | null;
  reps: number | null;
  exercicio: string;
};

export type ExercicioFeito = {
  exercicio_id: string;
  nome: string;
  /** Uma entrada por serie, na ordem em que foi feita. */
  series: { numero: number; carga_kg: number | null; reps: number | null }[];
};

export type TreinoNoFeed = {
  id: string;
  alunoId: string;
  aluno: string;
  /** "Consultoria" ou "Planilha". So para a linha de contexto. */
  plano: string;
  whatsapp: string | null;
  data: string;
  /** "19:42", no fuso de Sao Paulo. */
  hora: string;
  bloco: string;
  foco: string | null;
  /** Minutos entre abrir e fechar, ou null quando o numero nao e confiavel. */
  duracaoMin: number | null;
  peso_kg: number | null;
  esforco: number | null;
  nota: string | null;
  exercicios: ExercicioFeito[];
  totalSeries: number;
  /** Soma de carga x reps de todas as series. Zero quando ninguem anotou carga. */
  volumeKg: number;
};

export type DiaDoFeed = {
  data: string;
  /** "Hoje", "Ontem", "SEX, 27 AGO". */
  rotulo: string;
  treinos: TreinoNoFeed[];
};

/* ------------------------------------------------------------------ */
/* Tempo                                                               */
/* ------------------------------------------------------------------ */

/**
 * Quanto durou o treino.
 *
 * Devolve null acima de quatro horas: nesse caso o aluno abriu a sessao e
 * esqueceu o app aberto, e mostrar "5 h" seria mentir com cara de dado.
 */
export function duracaoEmMinutos(
  iniciada_em: string,
  concluida_em: string | null,
): number | null {
  if (!concluida_em) return null;
  const min = Math.round((Date.parse(concluida_em) - Date.parse(iniciada_em)) / 60000);
  if (!Number.isFinite(min) || min < 1 || min > 240) return null;
  return min;
}

/** "48 min", "1 h 12". */
export function emTempo(minutos: number | null): string | null {
  if (minutos === null) return null;
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

/** Hora do relogio no fuso de Sao Paulo, que e onde o treino aconteceu. */
export function horaSP(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

const DIAS_DA_SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
const MESES = [
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
  "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
];

/**
 * Cabecalho do grupo. "Hoje" e "Ontem" por extenso, o resto com dia da
 * semana, que e como se lembra de treino ("na terca ele veio").
 *
 * A data vem em aaaa-mm-dd e e lida como UTC de proposito: e um dia de
 * calendario, nao um instante, e passar pelo fuso local do servidor jogaria
 * para o dia anterior.
 */
export function rotuloDoDia(data: string, hoje: string): string {
  const dif = Math.round(
    (Date.parse(hoje + "T00:00:00Z") - Date.parse(data + "T00:00:00Z")) / 86400000,
  );
  if (dif === 0) return "Hoje";
  if (dif === 1) return "Ontem";
  const d = new Date(data + "T00:00:00Z");
  return `${DIAS_DA_SEMANA[d.getUTCDay()]}, ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}

/* ------------------------------------------------------------------ */
/* Montagem                                                            */
/* ------------------------------------------------------------------ */

/**
 * Agrupa as series por exercicio, na ordem em que o aluno fez.
 *
 * A ordem vem da primeira serie de cada exercicio, e nao do nome: a ficha tem
 * ordem, e ver o treino fora de ordem faz o Allisson procurar duas vezes.
 */
export function juntarSeries(series: LinhaSerieFeed[]): ExercicioFeito[] {
  const mapa = new Map<string, ExercicioFeito>();

  for (const s of series) {
    let atual = mapa.get(s.exercicio_id);
    if (!atual) {
      atual = { exercicio_id: s.exercicio_id, nome: s.exercicio, series: [] };
      mapa.set(s.exercicio_id, atual);
    }
    atual.series.push({ numero: s.numero, carga_kg: s.carga_kg, reps: s.reps });
  }

  for (const e of mapa.values()) e.series.sort((a, b) => a.numero - b.numero);
  return [...mapa.values()];
}

/** Carga x reps somado. E o numero que o Allisson pediu para acompanhar. */
export function volumeDeSeries(series: LinhaSerieFeed[]): number {
  return series.reduce(
    (soma, s) => soma + (s.carga_kg ?? 0) * (s.reps ?? 0),
    0,
  );
}

export type DadosDoAluno = {
  id: string;
  nome: string;
  tipo: string;
  whatsapp: string | null;
};

export function montarFeed(
  sessoes: LinhaSessaoFeed[],
  series: LinhaSerieFeed[],
  alunos: DadosDoAluno[],
  hoje: string,
): DiaDoFeed[] {
  const porAluno = new Map(alunos.map((a) => [a.id, a]));

  const seriesDaSessao = new Map<string, LinhaSerieFeed[]>();
  for (const s of series) {
    const lista = seriesDaSessao.get(s.sessao_id);
    if (lista) lista.push(s);
    else seriesDaSessao.set(s.sessao_id, [s]);
  }

  const treinos: TreinoNoFeed[] = [];

  for (const s of sessoes) {
    const aluno = porAluno.get(s.aluno_id);
    // Sem perfil nao ha o que mostrar. Acontece se o aluno foi apagado.
    if (!aluno) continue;

    const minhas = seriesDaSessao.get(s.id) ?? [];

    treinos.push({
      id: s.id,
      alunoId: aluno.id,
      aluno: aluno.nome,
      plano: aluno.tipo === "planilha" ? "Planilha" : "Consultoria",
      whatsapp: aluno.whatsapp,
      data: s.data,
      hora: horaSP(s.concluida_em),
      // Bloco apagado da ficha depois do treino vira null no banco, e o
      // historico continua valendo. Melhor "Treino" do que linha em branco.
      bloco: s.bloco?.nome ?? "Treino",
      foco: s.bloco?.foco ?? null,
      duracaoMin: duracaoEmMinutos(s.iniciada_em, s.concluida_em),
      peso_kg: s.peso_kg,
      esforco: s.esforco,
      nota: s.nota?.trim() || null,
      exercicios: juntarSeries(minhas),
      totalSeries: minhas.length,
      volumeKg: Math.round(volumeDeSeries(minhas)),
    });
  }

  // Mais recente primeiro, pelo carimbo e nao pelo texto formatado.
  treinos.sort((a, b) => (a.data === b.data ? b.hora.localeCompare(a.hora) : b.data.localeCompare(a.data)));

  const dias: DiaDoFeed[] = [];
  for (const t of treinos) {
    const ultimo = dias[dias.length - 1];
    if (ultimo && ultimo.data === t.data) ultimo.treinos.push(t);
    else dias.push({ data: t.data, rotulo: rotuloDoDia(t.data, hoje), treinos: [t] });
  }

  return dias;
}

export function contarRecados(dias: DiaDoFeed[]): number {
  return dias.reduce((soma, d) => soma + d.treinos.filter((t) => t.nota).length, 0);
}

export function contarTreinos(dias: DiaDoFeed[]): number {
  return dias.reduce((soma, d) => soma + d.treinos.length, 0);
}

/** So os dias que sobraram depois de tirar quem nao deixou recado. */
export function somenteComRecado(dias: DiaDoFeed[]): DiaDoFeed[] {
  return dias
    .map((d) => ({ ...d, treinos: d.treinos.filter((t) => t.nota) }))
    .filter((d) => d.treinos.length > 0);
}

/* ------------------------------------------------------------------ */
/* Resposta pelo WhatsApp                                              */
/* ------------------------------------------------------------------ */

/**
 * A mensagem que abre no WhatsApp.
 *
 * Cita o recado do aluno de volta e para por ali, de proposito. Quem responde
 * e o Allisson, e mensagem pronta demais faz a consultoria soar automatica,
 * que e exatamente o contrario do que ela vende. A citacao serve para o aluno
 * saber na hora de qual treino ele esta falando.
 */
export function mensagemDeResposta(treino: TreinoNoFeed, hoje: string): string {
  const primeiroNome = treino.aluno.trim().split(/\s+/)[0] || "tudo bem";
  const quando =
    treino.data === hoje ? "de hoje" : `de ${rotuloDoDia(treino.data, hoje).toLowerCase()}`;
  const abertura = `Oi ${primeiroNome}, tudo bem? Vi aqui o seu ${treino.bloco} ${quando}.`;

  if (!treino.nota) return abertura;

  const recado =
    treino.nota.length > LIMITE_DA_CITACAO
      ? `${treino.nota.slice(0, LIMITE_DA_CITACAO).trimEnd()}…`
      : treino.nota;

  return `${abertura} Você anotou: “${recado}”`;
}

/** Uma linha com o que da para dizer em numeros. Vazia vira "treino concluído". */
export function resumoEmNumeros(treino: TreinoNoFeed): string {
  const partes = [
    treino.totalSeries > 0
      ? `${treino.totalSeries} ${treino.totalSeries === 1 ? "série" : "séries"}`
      : null,
    treino.exercicios.length > 0
      ? `${treino.exercicios.length} ${treino.exercicios.length === 1 ? "exercício" : "exercícios"}`
      : null,
    treino.volumeKg > 0 ? `${treino.volumeKg.toLocaleString("pt-BR")} kg de volume` : null,
    emTempo(treino.duracaoMin),
  ].filter(Boolean);

  return partes.length > 0 ? partes.join(" · ") : "treino concluído";
}

/** "3 × 12 · 40 kg", ou "12 rep" quando ninguem anotou carga. */
export function linhaDaSerie(serie: {
  carga_kg: number | null;
  reps: number | null;
}): string {
  const reps = serie.reps === null ? "—" : `${serie.reps}`;
  if (serie.carga_kg === null) return `${reps} rep`;
  return `${reps} × ${String(serie.carga_kg).replace(".", ",")} kg`;
}
