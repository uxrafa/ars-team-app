-- 0004 anamnese
-- Ficha inicial do aluno em 3 etapas. Dado de saude sob a LGPD: so o
-- proprio aluno escreve, o admin so le, e o consentimento explicito e
-- condicao para enviar, garantida por constraint e nao so pela tela.

create type public.objetivo_treino as enum (
  'emagrecimento','hipertrofia','condicionamento','saude_geral'
);
create type public.local_treino      as enum ('academia','casa','ambos');
create type public.nivel_experiencia as enum ('iniciante','intermediario','avancado');
create type public.periodo_treino    as enum ('manha','tarde','noite');
create type public.anamnese_status   as enum ('rascunho','enviada');

create table public.anamnese (
  id        uuid primary key default gen_random_uuid(),
  aluno_id  uuid not null unique references public.perfis(id) on delete cascade,

  -- etapa 1: perfil e rotina
  peso_kg          numeric(5,2),
  altura_cm        smallint,
  nascimento       date,
  objetivo         public.objetivo_treino,
  local_treino     public.local_treino,
  nivel            public.nivel_experiencia,
  dias_disponiveis smallint[] not null default '{}',  -- 0 = domingo ... 6 = sabado

  -- etapa 2: saude (triagem tipo PAR-Q)
  coracao                    boolean,
  coracao_detalhe            text,
  dor_peito                  boolean,
  dor_peito_detalhe          text,
  pressao_alta               boolean,
  pressao_alta_detalhe       text,
  cirurgia_12m               boolean,
  cirurgia_12m_detalhe       text,
  medicacao_continua         boolean,
  medicacao_continua_detalhe text,
  lesoes                     text,

  consentimento_saude_em     timestamptz,
  consentimento_saude_versao text,

  -- etapa 3: ponto de partida
  cintura_cm     numeric(5,2),
  quadril_cm     numeric(5,2),
  braco_cm       numeric(5,2),
  coxa_cm        numeric(5,2),
  periodo_treino public.periodo_treino,

  status        public.anamnese_status not null default 'rascunho',
  enviada_em    timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint anamnese_peso_valido       check (peso_kg   is null or peso_kg   between 25 and 400),
  constraint anamnese_altura_valida     check (altura_cm is null or altura_cm between 100 and 250),
  constraint anamnese_nascimento_valido check (nascimento is null or nascimento > date '1900-01-01'),
  constraint anamnese_dias_validos      check (dias_disponiveis <@ array[0,1,2,3,4,5,6]::smallint[]),
  constraint anamnese_medidas_validas check (
    (cintura_cm is null or cintura_cm between 30 and 250) and
    (quadril_cm is null or quadril_cm between 30 and 250) and
    (braco_cm   is null or braco_cm   between 10 and 100) and
    (coxa_cm    is null or coxa_cm    between 20 and 150)
  ),

  -- LGPD no banco: sem consentimento registrado nao envia. Tela nenhuma burla.
  constraint anamnese_consentimento_obrigatorio check (
    status = 'rascunho'
    or (consentimento_saude_em is not null and enviada_em is not null)
  ),

  -- Enviada exige o minimo que o Allisson precisa para montar a ficha.
  constraint anamnese_minimo_para_enviar check (
    status = 'rascunho'
    or (peso_kg is not null and altura_cm is not null and objetivo is not null
        and local_treino is not null and nivel is not null
        and array_length(dias_disponiveis, 1) >= 1
        and coracao is not null and dor_peito is not null and pressao_alta is not null
        and cirurgia_12m is not null and medicacao_continua is not null)
  )
);

create index anamnese_status_idx on public.anamnese (status, enviada_em desc);

alter table public.anamnese enable row level security;

create policy anamnese_aluno_le on public.anamnese
  for select to authenticated using (aluno_id = (select auth.uid()));
create policy anamnese_aluno_cria on public.anamnese
  for insert to authenticated with check (aluno_id = (select auth.uid()));
create policy anamnese_aluno_edita on public.anamnese
  for update to authenticated
  using (aluno_id = (select auth.uid()))
  with check (aluno_id = (select auth.uid()));

-- O admin le para montar a ficha, mas nao escreve no dado de saude de ninguem.
create policy anamnese_admin_le on public.anamnese
  for select to authenticated using (privado.eh_admin());

create trigger ao_atualizar_anamnese before update on public.anamnese
  for each row execute function privado.tocar_atualizado_em();
