-- 0005 execucao_e_evolucao
-- Sessao de treino (que e tambem o check-in), serie registrada, medidas e
-- fotos. O historico e imune a mexida na ficha: a serie guarda o exercicio
-- e nao so o item, entao apagar um item nao apaga o que foi treinado.

create type public.sessao_status as enum ('em_andamento','concluida');
create type public.origem_medida as enum ('anamnese','sessao','manual');
create type public.angulo_foto   as enum ('frente','lado','costas');

create table public.sessao_treino (
  id            uuid primary key default gen_random_uuid(),
  aluno_id      uuid not null references public.perfis(id) on delete cascade,
  bloco_id      uuid references public.bloco_treino(id) on delete set null,
  data          date not null default current_date,
  iniciada_em   timestamptz not null default now(),
  concluida_em  timestamptz,
  status        public.sessao_status not null default 'em_andamento',
  peso_kg       numeric(5,2),   -- campos do check-in
  esforco       smallint,
  nota          text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint sessao_esforco_valido check (esforco is null or esforco between 1 and 10),
  constraint sessao_peso_valido    check (peso_kg is null or peso_kg between 25 and 400),
  constraint sessao_concluida_tem_hora check (status = 'em_andamento' or concluida_em is not null)
);
create index sessao_aluno_idx on public.sessao_treino (aluno_id, data desc);
create index sessao_bloco_idx on public.sessao_treino (bloco_id);
create unique index sessao_uma_aberta_por_aluno on public.sessao_treino (aluno_id) where status = 'em_andamento';

create table public.serie_registrada (
  id           uuid primary key default gen_random_uuid(),
  sessao_id    uuid not null references public.sessao_treino(id) on delete cascade,
  -- referencia mole para a ficha: se o item sair, o historico fica de pe
  item_id      uuid references public.item_exercicio(id) on delete set null,
  -- referencia forte para o catalogo: e por aqui que se calcula progressao
  exercicio_id uuid not null references public.exercicio(id) on delete restrict,
  numero       smallint not null,
  carga_kg     numeric(6,2),
  reps         smallint,
  concluida_em timestamptz not null default now(),
  constraint serie_numero_valido check (numero between 1 and 20),
  constraint serie_carga_valida  check (carga_kg is null or carga_kg between 0 and 999),
  constraint serie_reps_validas  check (reps is null or reps between 0 and 500),
  constraint serie_unica unique (sessao_id, exercicio_id, numero)
);
create index serie_sessao_idx    on public.serie_registrada (sessao_id);
create index serie_exercicio_idx on public.serie_registrada (exercicio_id, concluida_em desc);

create table public.medida_corporal (
  id         uuid primary key default gen_random_uuid(),
  aluno_id   uuid not null references public.perfis(id) on delete cascade,
  data       date not null default current_date,
  peso_kg    numeric(5,2),
  cintura_cm numeric(5,2),
  quadril_cm numeric(5,2),
  braco_cm   numeric(5,2),
  coxa_cm    numeric(5,2),
  origem     public.origem_medida not null default 'manual',
  criado_em  timestamptz not null default now(),
  constraint medida_unica_por_dia unique (aluno_id, data),
  constraint medida_peso_valido check (peso_kg is null or peso_kg between 25 and 400),
  constraint medida_tem_algum_valor check (
    coalesce(peso_kg, cintura_cm, quadril_cm, braco_cm, coxa_cm) is not null
  )
);
create index medida_aluno_idx on public.medida_corporal (aluno_id, data desc);

-- O arquivo vive no bucket privado; aqui fica so o ponteiro.
create table public.foto_evolucao (
  id        uuid primary key default gen_random_uuid(),
  aluno_id  uuid not null references public.perfis(id) on delete cascade,
  data      date not null default current_date,
  angulo    public.angulo_foto not null,
  caminho   text not null,
  criado_em timestamptz not null default now(),
  constraint foto_unica_por_angulo unique (aluno_id, data, angulo),
  constraint foto_caminho_preenchido check (length(btrim(caminho)) > 0)
);
create index foto_aluno_idx on public.foto_evolucao (aluno_id, data desc);

-- A anamnese enviada vira o primeiro ponto do grafico de evolucao.
create or replace function privado.semear_medida_da_anamnese()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'enviada'
     and (tg_op = 'INSERT' or old.status is distinct from 'enviada')
  then
    insert into public.medida_corporal
      (aluno_id, data, peso_kg, cintura_cm, quadril_cm, braco_cm, coxa_cm, origem)
    values
      (new.aluno_id, coalesce(new.enviada_em::date, current_date),
       new.peso_kg, new.cintura_cm, new.quadril_cm, new.braco_cm, new.coxa_cm, 'anamnese')
    on conflict (aluno_id, data) do nothing;
  end if;
  return new;
end;
$$;

create trigger ao_enviar_anamnese
  after insert or update on public.anamnese
  for each row execute function privado.semear_medida_da_anamnese();

create or replace function privado.minha_sessao(p_sessao_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sessao_treino s
    where s.id = p_sessao_id and s.aluno_id = (select auth.uid())
  );
$$;
revoke all on function privado.minha_sessao(uuid) from public, anon;
grant execute on function privado.minha_sessao(uuid) to authenticated;

alter table public.sessao_treino    enable row level security;
alter table public.serie_registrada enable row level security;
alter table public.medida_corporal  enable row level security;
alter table public.foto_evolucao    enable row level security;

create policy sessao_aluno_tudo on public.sessao_treino
  for all to authenticated
  using (aluno_id = (select auth.uid()))
  with check (
    aluno_id = (select auth.uid())
    and (bloco_id is null or privado.meu_bloco(bloco_id))
  );
create policy sessao_admin_le on public.sessao_treino
  for select to authenticated using (privado.eh_admin());

create policy serie_aluno_tudo on public.serie_registrada
  for all to authenticated
  using (privado.minha_sessao(sessao_id))
  with check (privado.minha_sessao(sessao_id));
create policy serie_admin_le on public.serie_registrada
  for select to authenticated using (privado.eh_admin());

create policy medida_aluno_tudo on public.medida_corporal
  for all to authenticated
  using (aluno_id = (select auth.uid()))
  with check (aluno_id = (select auth.uid()));
create policy medida_admin_le on public.medida_corporal
  for select to authenticated using (privado.eh_admin());

create policy foto_aluno_tudo on public.foto_evolucao
  for all to authenticated
  using (aluno_id = (select auth.uid()))
  with check (aluno_id = (select auth.uid()));
create policy foto_admin_le on public.foto_evolucao
  for select to authenticated using (privado.eh_admin());

create trigger ao_atualizar_sessao before update on public.sessao_treino
  for each row execute function privado.tocar_atualizado_em();
