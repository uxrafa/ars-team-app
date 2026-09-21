-- 0018 orientacao_alimentar
--
-- A orientacao alimentar de cada aluno, montada pelo Allisson dentro do app.
-- E ORIENTACAO, nao dieta prescrita: quem monta e o personal (decisao do
-- Rafael em 21/09). O nome das tabelas segue isso de proposito.
--
-- Desenho, em uma frase: uma orientacao por aluno, com refeicoes de dia de
-- treino e de dia de descanso, e cada refeicao com alimentos da TACO em
-- gramas. O app sabe qual dos dois dias e hoje pela anamnese, entao o aluno
-- nunca escolhe qual metade olhar.
--
-- Os totais NAO moram no banco. Sao soma de macros vezes gramas, e guardar a
-- soma seria guardar a mesma verdade duas vezes -- a planilha do Allisson
-- chegou cheia de #DIV/0! justamente por formula desencontrada do dado.

/* ------------------------------------------------------------------ */
/* Sexo na anamnese                                                    */
/* ------------------------------------------------------------------ */

-- A TMB de Mifflin-St Jeor muda por sexo (+5 ou -161 kcal). Fica na anamnese,
-- e nao no editor da dieta, porque e dado do aluno, e o admin nao escreve na
-- anamnese de ninguem (0004).
--
-- Nullable e FORA de anamnese_minimo_para_enviar: quem ja enviou nao tem o
-- campo, e a constraint derrubaria qualquer update dessas linhas. A tela nova
-- exige a resposta; sem ela o editor so nao calcula a TMB e diz o que falta.
do $$ begin
  create type public.sexo_biologico as enum ('masculino', 'feminino');
exception when duplicate_object then null; end $$;

alter table public.anamnese add column if not exists sexo public.sexo_biologico;

comment on column public.anamnese.sexo is
  'Sexo biologico, so para a TMB (Mifflin-St Jeor). Nullable: anamneses enviadas antes de 21/09 nao tem.';

/* ------------------------------------------------------------------ */
/* Alimentos                                                           */
/* ------------------------------------------------------------------ */

-- TACO (4a edicao, NEPA/Unicamp) e cadastro proprio do Allisson na mesma
-- tabela: whey e suplemento nao existem na TACO, e o editor precisa achar os
-- dois na mesma busca.
--
-- So os macros, por 100 g. Kcal sai de 4/4/9 sobre eles, no app, para o total
-- e a distribuicao sempre fecharem -- a kcal medida da TACO difere um pouco
-- da soma e o Allisson veria dois numeros para a mesma coisa.
create table if not exists public.alimento (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  grupo         text,
  origem        text not null default 'proprio',
  taco_id       smallint unique,
  proteina_g    numeric(5,1) not null default 0,
  carboidrato_g numeric(5,1) not null default 0,
  gordura_g     numeric(5,1) not null default 0,
  fibra_g       numeric(5,1),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  constraint alimento_origem_valida check (origem in ('taco', 'proprio')),
  constraint alimento_taco_tem_id check ((origem = 'taco') = (taco_id is not null)),
  constraint alimento_nome_valido check (length(btrim(nome)) between 2 and 120),
  -- Por 100 g, nenhum macro passa de 100 g e a soma tambem nao.
  constraint alimento_macros_validos check (
    proteina_g between 0 and 100 and carboidrato_g between 0 and 100
    and gordura_g between 0 and 100
    and proteina_g + carboidrato_g + gordura_g <= 100.5
  )
);

comment on table public.alimento is
  'Base de alimentos: TACO 4a ed. (origem taco) e cadastro do Allisson (origem proprio). Macros por 100 g.';

alter table public.alimento enable row level security;

-- O aluno le para ver o nome do que come; e so a base publica, sem dado dele.
drop policy if exists alimento_leitura_logada on public.alimento;
create policy alimento_leitura_logada on public.alimento
  for select to authenticated using (true);
drop policy if exists alimento_admin_escreve on public.alimento;
create policy alimento_admin_escreve on public.alimento
  for all to authenticated using (privado.eh_admin()) with check (privado.eh_admin());

/* ------------------------------------------------------------------ */
/* A orientacao                                                        */
/* ------------------------------------------------------------------ */

-- Uma por aluno, e nao com historico e vigencia como a ficha: o pedido e
-- "o aluno ve o que comer hoje". Historico entra quando alguem pedir.
create table if not exists public.orientacao_alimentar (
  id              uuid primary key default gen_random_uuid(),
  aluno_id        uuid not null unique references public.perfis (id) on delete cascade,
  -- Rascunho e invisivel para o aluno, na policy.
  publicada       boolean not null default false,
  agua_litros     numeric(3,1),
  -- Uma orientacao por linha, como a lista da planilha dele.
  orientacoes     text,
  -- Os parametros da meta. Guardados porque sao escolha do Allisson; a meta
  -- em si e recalculada com o peso de hoje.
  fator_atividade numeric(4,3),
  ajuste_pct      smallint,
  proteina_g_kg   numeric(3,1),
  gordura_g_kg    numeric(3,1),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint orientacao_agua_valida  check (agua_litros is null or agua_litros between 0.5 and 10),
  constraint orientacao_fator_valido check (fator_atividade is null or fator_atividade between 1.1 and 2.5),
  constraint orientacao_ajuste_valido check (ajuste_pct is null or ajuste_pct between -40 and 40),
  constraint orientacao_prot_valida  check (proteina_g_kg is null or proteina_g_kg between 0.5 and 4),
  constraint orientacao_gord_valida  check (gordura_g_kg is null or gordura_g_kg between 0.3 and 3)
);

create table if not exists public.refeicao_alimentar (
  id            uuid primary key default gen_random_uuid(),
  orientacao_id uuid not null references public.orientacao_alimentar (id) on delete cascade,
  dia           text not null,
  nome          text not null,
  horario       time,
  ordem         smallint not null,
  constraint refeicao_dia_valido check (dia in ('treino', 'descanso')),
  constraint refeicao_nome_valido check (length(btrim(nome)) between 1 and 60)
);
create index if not exists refeicao_orientacao_idx on public.refeicao_alimentar (orientacao_id, dia, ordem);

-- Um item e alimento com gramas (entra na conta) ou so texto ("salada verde
-- a vontade"), que aparece para o aluno e nao soma nada.
create table if not exists public.item_alimentar (
  id          uuid primary key default gen_random_uuid(),
  refeicao_id uuid not null references public.refeicao_alimentar (id) on delete cascade,
  -- restrict: alimento nao se apaga, se desativa, como exercicio.
  alimento_id uuid references public.alimento (id) on delete restrict,
  gramas      numeric(6,1),
  -- Medida caseira ao lado das gramas ("2 fatias"), ou o texto livre.
  descricao   text,
  ordem       smallint not null,
  constraint item_alimentar_tem_o_que_mostrar check (
    (alimento_id is not null and gramas is not null and gramas > 0 and gramas <= 5000)
    or (alimento_id is null and gramas is null and length(btrim(coalesce(descricao, ''))) > 0)
  )
);
create index if not exists item_alimentar_refeicao_idx on public.item_alimentar (refeicao_id, ordem);
create index if not exists item_alimentar_alimento_idx on public.item_alimentar (alimento_id);

create or replace trigger ao_atualizar_orientacao before update on public.orientacao_alimentar
  for each row execute function privado.tocar_atualizado_em();

/* ------------------------------------------------------------------ */
/* RLS                                                                 */
/* ------------------------------------------------------------------ */

-- Security definer para a policy da refeicao nao depender da policy da
-- orientacao em cascata, igual a minha_sessao (0005).
create or replace function privado.minha_orientacao(p_orientacao_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orientacao_alimentar o
    where o.id = p_orientacao_id and o.aluno_id = (select auth.uid()) and o.publicada
  );
$$;
revoke all on function privado.minha_orientacao(uuid) from public, anon;
grant execute on function privado.minha_orientacao(uuid) to authenticated;

create or replace function privado.minha_refeicao(p_refeicao_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.refeicao_alimentar r
    join public.orientacao_alimentar o on o.id = r.orientacao_id
    where r.id = p_refeicao_id and o.aluno_id = (select auth.uid()) and o.publicada
  );
$$;
revoke all on function privado.minha_refeicao(uuid) from public, anon;
grant execute on function privado.minha_refeicao(uuid) to authenticated;

alter table public.orientacao_alimentar enable row level security;
alter table public.refeicao_alimentar   enable row level security;
alter table public.item_alimentar       enable row level security;

-- O aluno so le, e so depois de publicada. Quem monta e o Allisson.
drop policy if exists orientacao_aluno_le on public.orientacao_alimentar;
create policy orientacao_aluno_le on public.orientacao_alimentar
  for select to authenticated using (aluno_id = (select auth.uid()) and publicada);
drop policy if exists orientacao_admin_tudo on public.orientacao_alimentar;
create policy orientacao_admin_tudo on public.orientacao_alimentar
  for all to authenticated using (privado.eh_admin()) with check (privado.eh_admin());

drop policy if exists refeicao_aluno_le on public.refeicao_alimentar;
create policy refeicao_aluno_le on public.refeicao_alimentar
  for select to authenticated using (privado.minha_orientacao(orientacao_id));
drop policy if exists refeicao_admin_tudo on public.refeicao_alimentar;
create policy refeicao_admin_tudo on public.refeicao_alimentar
  for all to authenticated using (privado.eh_admin()) with check (privado.eh_admin());

drop policy if exists item_alimentar_aluno_le on public.item_alimentar;
create policy item_alimentar_aluno_le on public.item_alimentar
  for select to authenticated using (privado.minha_refeicao(refeicao_id));
drop policy if exists item_alimentar_admin_tudo on public.item_alimentar;
create policy item_alimentar_admin_tudo on public.item_alimentar
  for all to authenticated using (privado.eh_admin()) with check (privado.eh_admin());

/* ------------------------------------------------------------------ */
/* Gravar tudo numa transacao                                          */
/* ------------------------------------------------------------------ */

-- Apaga e recria as refeicoes, ao contrario de salvar_ficha (0012), que
-- preserva ids. La o id do item e referenciado pelo que o aluno treinou;
-- aqui nada aponta para refeicao nem item, entao recriar e mais simples e
-- nao perde nada.
--
-- Security invoker: quem barra quem nao e admin e a RLS acima.
create or replace function public.salvar_orientacao(
  p_aluno_id uuid,
  p_publicada boolean,
  p_agua_litros numeric,
  p_orientacoes text,
  p_fator_atividade numeric,
  p_ajuste_pct smallint,
  p_proteina_g_kg numeric,
  p_gordura_g_kg numeric,
  p_refeicoes jsonb
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  r jsonb;
  i jsonb;
  v_ref uuid;
begin
  insert into public.orientacao_alimentar as o
    (aluno_id, publicada, agua_litros, orientacoes, fator_atividade, ajuste_pct, proteina_g_kg, gordura_g_kg)
  values (
    p_aluno_id, coalesce(p_publicada, false), p_agua_litros,
    nullif(btrim(coalesce(p_orientacoes, '')), ''),
    p_fator_atividade, p_ajuste_pct, p_proteina_g_kg, p_gordura_g_kg
  )
  on conflict (aluno_id) do update
    set publicada = excluded.publicada,
        agua_litros = excluded.agua_litros,
        orientacoes = excluded.orientacoes,
        fator_atividade = excluded.fator_atividade,
        ajuste_pct = excluded.ajuste_pct,
        proteina_g_kg = excluded.proteina_g_kg,
        gordura_g_kg = excluded.gordura_g_kg
  returning id into v_id;

  delete from public.refeicao_alimentar where orientacao_id = v_id;

  for r in select * from jsonb_array_elements(coalesce(p_refeicoes, '[]'::jsonb))
  loop
    insert into public.refeicao_alimentar (orientacao_id, dia, nome, horario, ordem)
    values (
      v_id,
      r ->> 'dia',
      coalesce(nullif(btrim(r ->> 'nome'), ''), 'Refeicao'),
      nullif(r ->> 'horario', '')::time,
      (r ->> 'ordem')::smallint
    )
    returning id into v_ref;

    for i in select * from jsonb_array_elements(coalesce(r -> 'itens', '[]'::jsonb))
    loop
      insert into public.item_alimentar (refeicao_id, alimento_id, gramas, descricao, ordem)
      values (
        v_ref,
        nullif(i ->> 'alimento_id', '')::uuid,
        nullif(i ->> 'gramas', '')::numeric,
        nullif(btrim(coalesce(i ->> 'descricao', '')), ''),
        (i ->> 'ordem')::smallint
      );
    end loop;
  end loop;
end;
$$;

revoke all on function public.salvar_orientacao(uuid, boolean, numeric, text, numeric, smallint, numeric, numeric, jsonb) from public, anon;
grant execute on function public.salvar_orientacao(uuid, boolean, numeric, text, numeric, smallint, numeric, numeric, jsonb) to authenticated;
