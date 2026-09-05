-- 0014 pagamento
--
-- ATE AQUI O BANCO NAO SABIA QUANTO ENTROU.
--
-- Existia so `perfis.acesso_ate`, que responde "esta pago ate quando" e nao
-- "quanto foi recebido e em que dia". Com isso o painel so conseguia somar as
-- mensalidades de quem esta em dia -- a carteira ativa -- e chamar aquilo de
-- faturamento faria o Allisson contar dinheiro que nao entrou no mes (a nota
-- longa em `resumo()`, em lib/painel.ts, explica o caso).
--
-- Uma linha aqui = um dinheiro que entrou. E o `acesso_ate` deixa de ser
-- digitacao solta: passa a ser consequencia do pagamento, calculada por
-- gatilho.
--
-- POR QUE GATILHO E NAO SERVER ACTION: a mesma regra precisa valer para o
-- webhook do gateway futuro, que escreve na tabela sem passar por tela
-- nenhuma. Trava em server action nao e trava, e regra em server action nao
-- e regra: quem garante e o banco.
--
-- DUAS DATAS QUE NAO SAO A MESMA COISA:
--   recebido_em     = quando o dinheiro entrou. E daqui que sai o faturamento
--                     do mes (regime de caixa, que e o que o Allisson enxerga).
--   competencia_de/ate = a janela de acesso que este pagamento comprou. Um pix
--                     de 3 meses entra inteiro em setembro e cobre ate dezembro.

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

-- `boleto` entra hoje sem ninguem usar de proposito: o dia em que um gateway
-- mandar boleto, o webhook grava sem `alter type` no meio de um recebimento.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'forma_pagamento') then
    create type public.forma_pagamento as enum
      ('pix', 'cartao', 'boleto', 'dinheiro', 'transferencia', 'outro');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'pagamento_origem') then
    create type public.pagamento_origem as enum ('manual', 'gateway');
  end if;
end
$$;

/* ------------------------------------------------------------------ */
/* A tabela                                                            */
/* ------------------------------------------------------------------ */

create table if not exists public.pagamento (
  id uuid primary key default gen_random_uuid(),

  -- `restrict` e nao `cascade`: apagar um aluno nao pode apagar o historico
  -- de dinheiro que ele pagou. Se um dia precisar sumir com o aluno, o
  -- pagamento tem que ser tratado na mao, com alguem olhando.
  aluno_id uuid not null references public.perfis (id) on delete restrict,

  valor numeric(10,2) not null,
  recebido_em date not null,

  -- Quantos meses de acesso este pagamento comprou. Mes, trimestre e
  -- semestre sao 1, 3 e 6; o campo aceita qualquer valor ate 24 para nao
  -- precisar de migracao no dia de uma promocao.
  meses smallint not null default 1,

  -- Preenchidos pelo gatilho, nunca por quem insere. Ver `aplicar_pagamento`.
  competencia_de date not null,
  competencia_ate date not null,

  -- O vencimento que o aluno tinha ANTES deste pagamento. Guardado para o
  -- estorno saber para onde voltar sem ter que adivinhar.
  acesso_anterior date,

  forma public.forma_pagamento not null,

  /* --- o que o webhook do gateway futuro vai precisar ---------------- */
  origem public.pagamento_origem not null default 'manual',
  -- Nome do gateway em texto livre, e nao enum: trocar de provedor nao pode
  -- pedir migracao. E o mesmo raciocinio de `exercicio.video_url`.
  gateway text,
  -- Id da cobranca no gateway. E a chave de idempotencia: webhook reentrega
  -- o mesmo evento, e o indice unico la embaixo recusa a segunda copia.
  gateway_id text,
  -- O corpo cru do evento. Quando a conciliacao nao bater, a resposta esta
  -- aqui e nao no log de alguem.
  gateway_evento jsonb,

  -- Estorno em vez de apagar: livro-caixa nao se corrige por baixo do pano.
  estornado_em timestamptz,
  estorno_motivo text,

  observacao text,

  -- Nulo quando quem escreveu foi o webhook, que nao e pessoa.
  registrado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),

  constraint pagamento_valor_valido
    check (valor > 0 and valor <= 100000),
  constraint pagamento_meses_valido
    check (meses >= 1 and meses <= 24),
  constraint pagamento_competencia_valida
    check (competencia_ate > competencia_de),
  -- Estorno sem motivo daqui a seis meses nao explica nada para ninguem.
  constraint pagamento_estorno_com_motivo
    check (estornado_em is null or btrim(coalesce(estorno_motivo, '')) <> ''),
  -- Um pagamento de gateway sem o id do gateway nao da para conciliar nem
  -- proteger de reentrega.
  constraint pagamento_gateway_identificado
    check (origem = 'manual' or (gateway is not null and gateway_id is not null))
);

comment on table public.pagamento is
  'Uma linha por dinheiro recebido. Origem manual hoje; o webhook do gateway escreve aqui com origem = gateway, sem migracao nova.';
comment on column public.pagamento.recebido_em is
  'Quando o dinheiro entrou. E por esta data que o faturamento do mes e somado.';
comment on column public.pagamento.competencia_ate is
  'Ate quando este pagamento paga. Vira o novo perfis.acesso_ate.';
comment on column public.pagamento.gateway_id is
  'Id da cobranca no gateway. Chave de idempotencia do webhook.';

/* ------------------------------------------------------------------ */
/* Indices                                                             */
/* ------------------------------------------------------------------ */

-- A tela de financeiro le por mes, do mais novo para o mais velho.
create index if not exists pagamento_recebido_em_idx
  on public.pagamento (recebido_em desc);

-- A tela do aluno le o historico de um so.
create index if not exists pagamento_aluno_idx
  on public.pagamento (aluno_id, recebido_em desc);

-- Reentrega de webhook nao vira pagamento em dobro. Parcial porque o
-- registro manual nao tem id de gateway e nao deve competir por unicidade.
create unique index if not exists pagamento_gateway_unico_idx
  on public.pagamento (gateway, gateway_id)
  where gateway_id is not null;

/* ------------------------------------------------------------------ */
/* RLS                                                                 */
/* ------------------------------------------------------------------ */

alter table public.pagamento enable row level security;

-- SO ADMIN LE, INCLUSIVE O PROPRIO PAGAMENTO DO ALUNO.
--
-- Foi uma escolha, nao um esquecimento. `observacao` e `gateway_evento` sao
-- anotacao interna do negocio ("desconto porque treina com o irmao", dados do
-- pagador vindos do gateway), e a tela do aluno nao pede historico financeiro
-- para nada. No dia em que pedir, a policy ganha `aluno_id = auth.uid()` e as
-- colunas internas saem por uma view.
drop policy if exists "somente admin le pagamento" on public.pagamento;
create policy "somente admin le pagamento"
  on public.pagamento for select to authenticated
  using (privado.eh_admin());

drop policy if exists "somente admin registra pagamento" on public.pagamento;
create policy "somente admin registra pagamento"
  on public.pagamento for insert to authenticated
  with check (privado.eh_admin());

drop policy if exists "somente admin corrige pagamento" on public.pagamento;
create policy "somente admin corrige pagamento"
  on public.pagamento for update to authenticated
  using (privado.eh_admin())
  with check (privado.eh_admin());

-- Nao existe policy de DELETE, de proposito. Pagamento errado se estorna, e o
-- estorno devolve o vencimento. Apagar a linha deixaria o `acesso_ate` sem
-- explicacao de onde veio.

-- O webhook do gateway usa a chave service_role, que passa por cima da RLS.
-- Por isso ela nunca entra no repositorio, que e publico.

/* ------------------------------------------------------------------ */
/* O gatilho que faz o acesso_ate ser consequencia                     */
/* ------------------------------------------------------------------ */

-- REGRA DA EMENDA: quem paga adiantado nao perde dia.
--
-- Se o aluno ainda esta em dia, o mes novo comeca no vencimento atual. Se ja
-- venceu, comeca no dia em que o dinheiro entrou -- o buraco entre o
-- vencimento e o pagamento nao e cobrado nem devolvido.
create or replace function privado.aplicar_pagamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  vencimento date;
  base date;
begin
  -- Dinheiro que ainda nao entrou nao e pagamento. A folga de um dia cobre o
  -- fuso: o servidor esta em UTC e Sao Paulo ainda e ontem por tres horas.
  if new.recebido_em > (current_date + 1) then
    raise exception 'Pagamento com data no futuro.'
      using errcode = '22007';
  end if;

  -- `for update` porque dois pagamentos do mesmo aluno na mesma hora leriam o
  -- mesmo vencimento e um sobrescreveria o outro.
  select p.acesso_ate into vencimento
    from public.perfis p
    where p.id = new.aluno_id
    for update;

  if not found then
    raise exception 'Aluno nao encontrado para o pagamento.'
      using errcode = '23503';
  end if;

  new.acesso_anterior := vencimento;
  base := greatest(coalesce(vencimento, new.recebido_em), new.recebido_em);

  -- Sobrescreve o que veio de fora: a janela e calculada aqui, senao ela
  -- voltaria a ser digitacao solta -- so que agora com um nome mais bonito.
  new.competencia_de  := base;
  new.competencia_ate := (base + make_interval(months => new.meses))::date;

  return new;
end;
$$;

revoke all on function privado.aplicar_pagamento() from public, anon;

drop trigger if exists ao_registrar_pagamento on public.pagamento;
create trigger ao_registrar_pagamento
  before insert on public.pagamento
  for each row execute function privado.aplicar_pagamento();

create or replace function privado.avancar_acesso_do_aluno()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Pagamento que ja nasce estornado (conciliacao de historico) nao da acesso.
  if new.estornado_em is not null then
    return new;
  end if;

  update public.perfis
     set acesso_ate = new.competencia_ate
   where id = new.aluno_id
     -- Nunca anda para tras. Um lancamento antigo chegando depois de um
     -- recente nao pode encurtar o acesso de quem esta em dia.
     and (acesso_ate is null or acesso_ate < new.competencia_ate);

  return new;
end;
$$;

revoke all on function privado.avancar_acesso_do_aluno() from public, anon;

drop trigger if exists ao_avancar_acesso on public.pagamento;
create trigger ao_avancar_acesso
  after insert on public.pagamento
  for each row execute function privado.avancar_acesso_do_aluno();

/* ------------------------------------------------------------------ */
/* Correcao: estorna, nao reescreve                                    */
/* ------------------------------------------------------------------ */

create or replace function privado.travar_pagamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.aluno_id       is distinct from old.aluno_id
     or new.valor       is distinct from old.valor
     or new.recebido_em is distinct from old.recebido_em
     or new.meses       is distinct from old.meses
     or new.competencia_de  is distinct from old.competencia_de
     or new.competencia_ate is distinct from old.competencia_ate
     or new.acesso_anterior is distinct from old.acesso_anterior
     or new.criado_em   is distinct from old.criado_em
  then
    raise exception
      'Pagamento nao se corrige: estorna e registra de novo.'
      using errcode = '42501';
  end if;

  -- Estorno e caminho de ida. Desestornar mexeria de novo no vencimento e
  -- ninguem saberia dizer qual pagamento pagou o que.
  if old.estornado_em is not null and new.estornado_em is null then
    raise exception 'Estorno nao se desfaz.'
      using errcode = '42501';
  end if;

  -- Devolve o vencimento, mas so se ninguem tiver passado por cima. Se um
  -- pagamento mais novo ja empurrou o acesso para frente, mexer aqui tiraria
  -- acesso pago de verdade -- entao a linha fica estornada e o vencimento
  -- atual continua valendo, visivel na lista.
  if old.estornado_em is null and new.estornado_em is not null then
    update public.perfis
       set acesso_ate = new.acesso_anterior
     where id = new.aluno_id
       and acesso_ate = new.competencia_ate;
  end if;

  return new;
end;
$$;

revoke all on function privado.travar_pagamento() from public, anon;

drop trigger if exists ao_corrigir_pagamento on public.pagamento;
create trigger ao_corrigir_pagamento
  before update on public.pagamento
  for each row execute function privado.travar_pagamento();
