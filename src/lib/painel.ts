/**
 * Regras do painel do treinador.
 *
 * Sao funcoes puras de proposito: recebem as linhas do banco e devolvem o
 * que a tela mostra. Assim da para conferir a logica sem subir nada, e a
 * tela fica so com o desenho.
 */

export type LinhaPerfil = {
  id: string;
  nome: string;
  email: string;
  whatsapp: string | null;
  tipo: "admin" | "consultoria" | "planilha";
  status: "ativo" | "carencia" | "suspenso";
  acesso_ate: string | null;
  mensalidade: number | null;
  criado_em: string;
};

export type LinhaAnamnese = {
  aluno_id: string;
  status: "rascunho" | "enviada";
  dias_disponiveis: number[] | null;
  objetivo: string | null;
  enviada_em: string | null;
};

export type LinhaProtocolo = {
  id: string;
  aluno_id: string;
  nome: string;
  inicio: string;
  fim: string | null;
  status: "rascunho" | "ativo" | "encerrado";
};

export type LinhaSessao = {
  id: string;
  aluno_id: string;
  data: string;
  status: "em_andamento" | "concluida";
  peso_kg: number | null;
  esforco: number | null;
  concluida_em: string | null;
};

export type MotivoAtencao =
  | "pagamento"
  | "sem_ficha"
  | "ficha_vencendo"
  | "sumido";

export type ItemAtencao = {
  aluno: LinhaPerfil;
  motivo: MotivoAtencao;
  detalhe: string;
  /** Menor = mais urgente. So para ordenar. */
  peso: number;
};

export type Aluno = LinhaPerfil & {
  anamnese: LinhaAnamnese | null;
  protocolo: LinhaProtocolo | null;
  ultimoCheckin: LinhaSessao | null;
};

export const DIAS_PARA_SUMIR = 7;
export const DIAS_DE_AVISO_DE_FICHA = 7;

/** Data em ISO curto, no fuso de Sao Paulo, que e onde os alunos vivem. */
export function hojeSP(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

export function diaDaSemanaSP(): number {
  const nome = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  }).format(new Date());
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(nome);
}

/** Diferenca em dias entre duas datas ISO (aaaa-mm-dd). Positivo = a segunda e depois. */
export function diasEntre(de: string, ate: string): number {
  const a = Date.parse(de + "T00:00:00Z");
  const b = Date.parse(ate + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}

export function emReais(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: valor % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** "hoje", "ontem", "faz 4 dias", "nunca". */
export function quandoFoi(data: string | null, hoje: string): string {
  if (!data) return "nunca";
  const d = diasEntre(data, hoje);
  if (d <= 0) return "hoje";
  if (d === 1) return "ontem";
  return `faz ${d} dias`;
}

export function juntarAlunos(
  perfis: LinhaPerfil[],
  anamneses: LinhaAnamnese[],
  protocolos: LinhaProtocolo[],
  sessoes: LinhaSessao[],
): Aluno[] {
  const porAluno = <T extends { aluno_id: string }>(lista: T[]) => {
    const mapa = new Map<string, T>();
    for (const item of lista) if (!mapa.has(item.aluno_id)) mapa.set(item.aluno_id, item);
    return mapa;
  };

  const mapaAnamnese = porAluno(anamneses);
  const mapaProtocolo = porAluno(protocolos.filter((p) => p.status === "ativo"));
  // sessoes ja chegam da mais nova para a mais velha
  const mapaSessao = porAluno(sessoes.filter((s) => s.status === "concluida"));

  return perfis
    .filter((p) => p.tipo !== "admin")
    .map((p) => ({
      ...p,
      anamnese: mapaAnamnese.get(p.id) ?? null,
      protocolo: mapaProtocolo.get(p.id) ?? null,
      ultimoCheckin: mapaSessao.get(p.id) ?? null,
    }));
}

/**
 * A fila do dia. Um aluno pode ter mais de um problema; entra uma vez para
 * cada, porque cada um pede uma acao diferente do Allisson.
 */
export function montarAtencao(alunos: Aluno[], hoje: string): ItemAtencao[] {
  const itens: ItemAtencao[] = [];

  for (const aluno of alunos) {
    // 1. pagamento vencido
    if (aluno.acesso_ate && diasEntre(aluno.acesso_ate, hoje) > 0) {
      const dias = diasEntre(aluno.acesso_ate, hoje);
      itens.push({
        aluno,
        motivo: "pagamento",
        detalhe: `Venceu ${dias === 1 ? "ontem" : `faz ${dias} dias`}`,
        peso: 1000 - dias,
      });
    }

    // 2. respondeu a anamnese e continua sem ficha
    if (aluno.anamnese?.status === "enviada" && !aluno.protocolo) {
      const desde = aluno.anamnese.enviada_em?.slice(0, 10) ?? aluno.criado_em.slice(0, 10);
      const dias = diasEntre(desde, hoje);
      itens.push({
        aluno,
        motivo: "sem_ficha",
        detalhe:
          dias <= 0
            ? "Enviou a anamnese hoje"
            : `Esperando a ficha ${dias === 1 ? "desde ontem" : `faz ${dias} dias`}`,
        peso: 2000 - dias,
      });
    }

    // 3. ficha perto de vencer
    if (aluno.protocolo?.fim) {
      const faltam = diasEntre(hoje, aluno.protocolo.fim);
      if (faltam <= DIAS_DE_AVISO_DE_FICHA) {
        itens.push({
          aluno,
          motivo: "ficha_vencendo",
          detalhe:
            faltam < 0
              ? `Ficha venceu faz ${Math.abs(faltam)} dias`
              : faltam === 0
                ? "Ficha vence hoje"
                : `Ficha vence em ${faltam} ${faltam === 1 ? "dia" : "dias"}`,
          peso: 3000 + faltam,
        });
      }
    }

    // 4. sumiu: tem ficha para seguir e nao aparece
    if (aluno.protocolo) {
      const ultima = aluno.ultimoCheckin?.data ?? null;
      const dias = ultima ? diasEntre(ultima, hoje) : null;
      if (dias === null || dias >= DIAS_PARA_SUMIR) {
        itens.push({
          aluno,
          motivo: "sumido",
          detalhe: ultima ? `Sem treino faz ${dias} dias` : "Nunca fez um check-in",
          peso: 4000 - (dias ?? 999),
        });
      }
    }
  }

  return itens.sort((a, b) => a.peso - b.peso);
}

export type Resumo = ReturnType<typeof resumo>;

export function resumo(alunos: Aluno[], sessoes: LinhaSessao[], hoje: string) {
  const consultoria = alunos.filter((a) => a.tipo === "consultoria").length;
  const planilha = alunos.filter((a) => a.tipo === "planilha").length;

  const vencidos = alunos.filter(
    (a) => a.acesso_ate && diasEntre(a.acesso_ate, hoje) > 0,
  );
  const emAberto = vencidos.reduce((soma, a) => soma + (a.mensalidade ?? 0), 0);
  const semValor = vencidos.some((a) => a.mensalidade === null);

  const fichasVencendo = alunos.filter((a) => {
    if (!a.protocolo?.fim) return false;
    const faltam = diasEntre(hoje, a.protocolo.fim);
    return faltam <= DIAS_DE_AVISO_DE_FICHA;
  }).length;

  const dow = diaDaSemanaSP();
  const previstosHoje = alunos.filter(
    (a) => a.tipo === "consultoria" && (a.anamnese?.dias_disponiveis ?? []).includes(dow),
  ).length;

  const checkinsHoje = sessoes.filter(
    (s) => s.data === hoje && s.status === "concluida",
  ).length;

  const recebidoNoMes = alunos.reduce((soma, a) => {
    const emDia = !a.acesso_ate || diasEntre(a.acesso_ate, hoje) <= 0;
    return emDia ? soma + (a.mensalidade ?? 0) : soma;
  }, 0);

  return {
    total: alunos.length,
    consultoria,
    planilha,
    vencidos: vencidos.length,
    emAberto,
    semValor,
    fichasVencendo,
    previstosHoje,
    checkinsHoje,
    recebidoNoMes,
  };
}

export const ROTULO_MOTIVO: Record<MotivoAtencao, string> = {
  pagamento: "Pagamento",
  sem_ficha: "Sem ficha",
  ficha_vencendo: "Renovar",
  sumido: "Sumido",
};

/** Rotulo curto do botao. Cabe na linha e nao empurra a pilula para fora. */
export const ACAO_MOTIVO: Record<MotivoAtencao, string> = {
  pagamento: "Cobrar",
  sem_ficha: "Montar",
  ficha_vencendo: "Atualizar",
  sumido: "Mensagem",
};

/**
 * Quais motivos merecem botao vermelho cheio. Dinheiro parado e aluno sem
 * treino sao os dois que travam o negocio; renovar e sumido podem esperar o
 * fim do dia, entao sao contorno.
 */
export const URGENTE: Record<MotivoAtencao, boolean> = {
  pagamento: true,
  sem_ficha: true,
  ficha_vencendo: false,
  sumido: false,
};

/** Link de WhatsApp com a mensagem ja escrita. */
export function linkWhatsapp(numero: string | null, texto: string): string | null {
  if (!numero) return null;
  const so = numero.replace(/\D/g, "");
  if (so.length < 10) return null;
  const comPais = so.startsWith("55") ? so : `55${so}`;
  return `https://wa.me/${comPais}?text=${encodeURIComponent(texto)}`;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* O que o painel mostra do dia                                        */
/* ------------------------------------------------------------------ */

/**
 * "12 min", "2 h", "ontem". O painel mostra o que aconteceu HOJE, e "hoje"
 * repetido em seis linhas nao informa nada: o que o Allisson quer saber e se
 * o check-in foi agora ou de manha.
 */
export function haQuantoTempo(iso: string | null, agora: Date = new Date()): string {
  if (!iso) return "";
  const minutos = Math.max(0, Math.round((agora.getTime() - Date.parse(iso)) / 60000));
  if (minutos < 1) return "agora";
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "ontem" : `${dias} d`;
}

/** Quantas PESSOAS precisam de atencao, e nao quantos itens tem na fila. */
export function quantosAlunosNaFila(atencao: ItemAtencao[]): number {
  return new Set(atencao.map((i) => i.aluno.id)).size;
}

export type EventoDoDia = {
  id: string;
  aluno: string;
  /** Linha em caixa alta, no estilo "TREINO B · 82,1 KG · ESFORCO 8". */
  detalhe: string;
  /** Ja formatado: "12 min", "2 h". */
  quando: string;
  /** Carimbo cru, so para ordenar. A tela nao mostra. */
  em: string;
  chegada: boolean;
};

/** Peso com virgula, que e como se le em portugues. */
export function emQuilos(valor: number | null): string | null {
  if (valor === null || valor === undefined) return null;
  return `${String(valor).replace(".", ",")} kg`;
}
