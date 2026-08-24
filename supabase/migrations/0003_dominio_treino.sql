-- 0003 dominio_treino
-- Biblioteca de exercicios + ficha do aluno (protocolo > bloco > item).

create type public.grupo_muscular as enum (
  'peito','costas','pernas','ombro','biceps','triceps',
  'abdomen','cardio','mobilidade','outros'
);
create type public.metodo_serie as enum (
  'normal','drop_set','bi_set','tri_set','piramide','isometria','ate_a_falha'
);
create type public.protocolo_status as enum ('rascunho','ativo','encerrado');

create table public.exercicio (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  grupo         public.grupo_muscular not null,
  equipamento   text,
  -- URL generica de video. Hoje YouTube nao listado; trocar de provedor
  -- nao pede migration.
  video_url     text,
  instrucoes    text,
  ativo         boolean not null default true,
  criado_por    uuid references public.perfis(id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint exercicio_nome_preenchido check (length(btrim(nome)) > 0)
);
create unique index exercicio_nome_unico on public.exercicio (lower(btrim(nome)));
create index exercicio_grupo_idx on public.exercicio (grupo) where ativo;
create index exercicio_sem_video_idx on public.exercicio (grupo) where ativo and video_url is null;

create table public.protocolo (
  id            uuid primary key default gen_random_uuid(),
  aluno_id      uuid not null references public.perfis(id) on delete cascade,
  nome          text not null default 'Ficha de treino',
  inicio        date not null default current_date,
  fim           date,
  status        public.protocolo_status not null default 'rascunho',
  observacoes   text,
  criado_por    uuid references public.perfis(id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint protocolo_periodo_valido check (fim is null or fim >= inicio)
);
create index protocolo_aluno_idx on public.protocolo (aluno_id, status);
create index protocolo_fim_idx on public.protocolo (fim) where status = 'ativo';
create unique index protocolo_um_ativo_por_aluno on public.protocolo (aluno_id) where status = 'ativo';

create table public.bloco_treino (
  id            uuid primary key default gen_random_uuid(),
  protocolo_id  uuid not null references public.protocolo(id) on delete cascade,
  nome          text not null,
  foco          text,
  ordem         smallint not null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  -- deferrable porque reordenar troca duas ordens na mesma transacao
  constraint bloco_ordem_unica unique (protocolo_id, ordem) deferrable initially deferred,
  constraint bloco_ordem_positiva check (ordem >= 0)
);
create index bloco_protocolo_idx on public.bloco_treino (protocolo_id, ordem);

create table public.item_exercicio (
  id            uuid primary key default gen_random_uuid(),
  bloco_id      uuid not null references public.bloco_treino(id) on delete cascade,
  -- restrict: exercicio em uso nao some do catalogo por acidente.
  -- Para tirar de circulacao usa-se exercicio.ativo = false.
  exercicio_id  uuid not null references public.exercicio(id) on delete restrict,
  ordem         smallint not null,
  series        smallint not null default 3,
  reps          text not null default '10-12',  -- texto: cabe faixa e tempo
  descanso_seg  smallint not null default 60,
  metodo        public.metodo_serie not null default 'normal',
  observacao    text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint item_ordem_unica unique (bloco_id, ordem) deferrable initially deferred,
  constraint item_ordem_positiva check (ordem >= 0),
  constraint item_series_valida check (series between 1 and 20),
  constraint item_descanso_valido check (descanso_seg between 0 and 900),
  constraint item_reps_preenchida check (length(btrim(reps)) > 0)
);
create index item_bloco_idx on public.item_exercicio (bloco_id, ordem);
create index item_exercicio_idx on public.item_exercicio (exercicio_id);

-- Protocolo em rascunho e invisivel para o aluno.
create or replace function privado.meu_protocolo(p_protocolo_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.protocolo p
    where p.id = p_protocolo_id
      and p.aluno_id = (select auth.uid())
      and p.status <> 'rascunho'
  );
$$;

create or replace function privado.meu_bloco(p_bloco_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bloco_treino b
    join public.protocolo p on p.id = b.protocolo_id
    where b.id = p_bloco_id
      and p.aluno_id = (select auth.uid())
      and p.status <> 'rascunho'
  );
$$;

revoke all on function privado.meu_protocolo(uuid) from public, anon;
revoke all on function privado.meu_bloco(uuid) from public, anon;
grant execute on function privado.meu_protocolo(uuid) to authenticated;
grant execute on function privado.meu_bloco(uuid) to authenticated;

alter table public.exercicio      enable row level security;
alter table public.protocolo      enable row level security;
alter table public.bloco_treino   enable row level security;
alter table public.item_exercicio enable row level security;

create policy exercicio_leitura_logada on public.exercicio
  for select to authenticated using (true);
create policy exercicio_admin_escreve on public.exercicio
  for all to authenticated using (privado.eh_admin()) with check (privado.eh_admin());

create policy protocolo_aluno_le on public.protocolo
  for select to authenticated
  using (aluno_id = (select auth.uid()) and status <> 'rascunho');
create policy protocolo_admin_tudo on public.protocolo
  for all to authenticated using (privado.eh_admin()) with check (privado.eh_admin());

create policy bloco_aluno_le on public.bloco_treino
  for select to authenticated using (privado.meu_protocolo(protocolo_id));
create policy bloco_admin_tudo on public.bloco_treino
  for all to authenticated using (privado.eh_admin()) with check (privado.eh_admin());

create policy item_aluno_le on public.item_exercicio
  for select to authenticated using (privado.meu_bloco(bloco_id));
create policy item_admin_tudo on public.item_exercicio
  for all to authenticated using (privado.eh_admin()) with check (privado.eh_admin());

create trigger ao_atualizar_exercicio before update on public.exercicio
  for each row execute function privado.tocar_atualizado_em();
create trigger ao_atualizar_protocolo before update on public.protocolo
  for each row execute function privado.tocar_atualizado_em();
create trigger ao_atualizar_bloco before update on public.bloco_treino
  for each row execute function privado.tocar_atualizado_em();
create trigger ao_atualizar_item before update on public.item_exercicio
  for each row execute function privado.tocar_atualizado_em();
