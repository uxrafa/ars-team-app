-- 0016 serie_de_aquecimento
--
-- A ficha passa a separar aquecimento de serie valida. Decisao do Rafael em
-- 20/09, depois da call em que o Allisson mostrou a treino.io: la so as
-- validas contam no volume, e sem essa separacao todo grafico de volume que a
-- gente desenhar vai somar aquecimento como se fosse trabalho.
--
-- Dois tipos, e nao os tres da treino.io (21/09): o Allisson usa aquecimento
-- e valida. Serie "de preparacao" vira uma ou outra, conforme ele montar.
--
-- `item_exercicio.series` CONTINUA SENDO O QUE ERA, e agora tem nome: e o
-- numero de series validas. Nenhum dado muda de significado, entao nenhuma
-- ficha existente precisa ser reescrita -- quem nao tinha aquecimento
-- continua sem, com zero na coluna nova.

alter table public.item_exercicio
  add column if not exists series_aquecimento smallint not null default 0;

alter table public.item_exercicio drop constraint if exists item_aquecimento_valido;
alter table public.item_exercicio add constraint item_aquecimento_valido
  check (series_aquecimento between 0 and 10);

comment on column public.item_exercicio.series is
  'Series VALIDAS. So elas contam no volume e no progresso do treino.';
comment on column public.item_exercicio.series_aquecimento is
  'Series de aquecimento, antes das validas. O aluno so marca como feita: sem carga, sem reps, fora do volume.';

/* ------------------------------------------------------------------ */
/* O "feito" do aquecimento mora em tabela propria                     */
/* ------------------------------------------------------------------ */

-- POR QUE NAO UMA COLUNA `tipo` EM serie_registrada: porque ai toda consulta
-- de volume, de carga e de historico -- feed, grafico de peso da semana,
-- "ultima vez", cargas que subiram, a contagem de series da tela de treinos --
-- teria que lembrar de filtrar `tipo = 'valida'`. Sao seis lugares hoje e
-- serao mais com os graficos. A que esquecesse somaria aquecimento no volume
-- sem erro nenhum, e ninguem perceberia.
--
-- Em tabela separada, serie_registrada continua sendo so trabalho de verdade,
-- por construcao. E aquecimento nao tem dado nenhum para guardar alem de
-- "feito": a decisao de 21/09 e que o aluno nao digita carga nem reps nele.
--
-- Guardar o feito, e nao deixar so na tela, e porque o aluno anda entre os
-- exercicios pelo proprio app: sem isto, voltar ao supino desmarcaria o
-- aquecimento que ele acabou de fazer.

create table if not exists public.aquecimento_feito (
  sessao_id    uuid not null references public.sessao_treino (id) on delete cascade,
  -- Mesma chave que serie_registrada usa, para a tela achar os dois do mesmo
  -- jeito. restrict porque exercicio nao se apaga, se desativa.
  exercicio_id uuid not null references public.exercicio (id) on delete restrict,
  numero       smallint not null,
  feito_em     timestamptz not null default now(),
  primary key (sessao_id, exercicio_id, numero),
  constraint aquecimento_numero_valido check (numero between 1 and 10)
);

comment on table public.aquecimento_feito is
  'Series de aquecimento marcadas como feitas numa sessao. Separada de serie_registrada de proposito: aquecimento nunca entra em volume.';

alter table public.aquecimento_feito enable row level security;

-- Mesmo desenho de serie_registrada (0005): o aluno faz tudo na propria
-- sessao, e o admin so le. `minha_sessao` ja existe e ja e security definer
-- no schema privado.
drop policy if exists aquecimento_aluno_tudo on public.aquecimento_feito;
create policy aquecimento_aluno_tudo on public.aquecimento_feito
  for all to authenticated
  using (privado.minha_sessao(sessao_id))
  with check (privado.minha_sessao(sessao_id));

drop policy if exists aquecimento_admin_le on public.aquecimento_feito;
create policy aquecimento_admin_le on public.aquecimento_feito
  for select to authenticated
  using (privado.eh_admin());

/* ------------------------------------------------------------------ */
/* salvar_ficha passa a gravar a coluna nova                           */
/* ------------------------------------------------------------------ */

-- SEM ISTO O AQUECIMENTO SUMIRIA A CADA GRAVACAO. A funcao lista as colunas
-- do item explicitamente; o Allisson poria "1" no campo, apertaria Salvar, e
-- o banco gravaria o default zero sem reclamar.
--
-- No update, chave ausente preserva o que ja estava. E para a janela do
-- deploy: o navegador de quem estiver com a tela velha aberta manda o item
-- sem `series_aquecimento`, e isso nao pode zerar o que a tela nova gravou.

create or replace function public.salvar_ficha(
  p_protocolo_id uuid,
  p_nome text,
  p_inicio date,
  p_fim date,
  p_observacoes text,
  p_blocos jsonb
)
returns void
language plpgsql
set search_path = public
as $$
declare
  b jsonb;
  i jsonb;
  v_bloco_id uuid;
  v_item_id uuid;
  v_ids_blocos uuid[] := '{}';
  v_ids_itens uuid[] := '{}';
begin
  update public.protocolo
  set nome = coalesce(nullif(btrim(p_nome), ''), 'Ficha de treino'),
      inicio = coalesce(p_inicio, current_date),
      fim = p_fim,
      observacoes = nullif(btrim(coalesce(p_observacoes, '')), '')
  where id = p_protocolo_id;

  if not found then
    raise exception 'Ficha nao encontrada, ou sem permissao para editar.'
      using errcode = '42501';
  end if;

  for b in select * from jsonb_array_elements(coalesce(p_blocos, '[]'::jsonb))
  loop
    v_bloco_id := nullif(b ->> 'id', '')::uuid;

    if v_bloco_id is null then
      insert into public.bloco_treino (protocolo_id, nome, foco, ordem)
      values (
        p_protocolo_id,
        coalesce(nullif(btrim(b ->> 'nome'), ''), 'Treino'),
        nullif(btrim(coalesce(b ->> 'foco', '')), ''),
        (b ->> 'ordem')::smallint
      )
      returning id into v_bloco_id;
    else
      update public.bloco_treino
      set nome = coalesce(nullif(btrim(b ->> 'nome'), ''), 'Treino'),
          foco = nullif(btrim(coalesce(b ->> 'foco', '')), ''),
          ordem = (b ->> 'ordem')::smallint
      where id = v_bloco_id and protocolo_id = p_protocolo_id;
    end if;

    v_ids_blocos := v_ids_blocos || v_bloco_id;

    for i in select * from jsonb_array_elements(coalesce(b -> 'itens', '[]'::jsonb))
    loop
      if nullif(i ->> 'id', '') is null then
        insert into public.item_exercicio
          (bloco_id, exercicio_id, ordem, series, series_aquecimento, reps, descanso_seg, metodo, observacao)
        values (
          v_bloco_id,
          (i ->> 'exercicio_id')::uuid,
          (i ->> 'ordem')::smallint,
          (i ->> 'series')::smallint,
          coalesce((i ->> 'series_aquecimento')::smallint, 0),
          coalesce(nullif(btrim(i ->> 'reps'), ''), '10-12'),
          (i ->> 'descanso_seg')::smallint,
          (i ->> 'metodo')::public.metodo_serie,
          nullif(btrim(coalesce(i ->> 'observacao', '')), '')
        )
        returning id into v_item_id;
        v_ids_itens := v_ids_itens || v_item_id;
      else
        update public.item_exercicio
        set bloco_id = v_bloco_id,
            exercicio_id = (i ->> 'exercicio_id')::uuid,
            ordem = (i ->> 'ordem')::smallint,
            series = (i ->> 'series')::smallint,
            series_aquecimento = coalesce((i ->> 'series_aquecimento')::smallint, series_aquecimento),
            reps = coalesce(nullif(btrim(i ->> 'reps'), ''), '10-12'),
            descanso_seg = (i ->> 'descanso_seg')::smallint,
            metodo = (i ->> 'metodo')::public.metodo_serie,
            observacao = nullif(btrim(coalesce(i ->> 'observacao', '')), '')
        where id = (i ->> 'id')::uuid;
        v_ids_itens := v_ids_itens || (i ->> 'id')::uuid;
      end if;
    end loop;
  end loop;

  delete from public.item_exercicio
  where bloco_id in (
      select id from public.bloco_treino where protocolo_id = p_protocolo_id
    )
    and not (id = any (v_ids_itens));

  delete from public.bloco_treino
  where protocolo_id = p_protocolo_id
    and not (id = any (v_ids_blocos));
end;
$$;

revoke all on function public.salvar_ficha(uuid, text, date, date, text, jsonb) from public, anon;
grant execute on function public.salvar_ficha(uuid, text, date, date, text, jsonb) to authenticated;
