-- 0012 salvar_ficha
--
-- O editor de ficha manda a ficha inteira de uma vez: os blocos (Treino A, B,
-- C) e os itens de cada bloco, na ordem em que estao na tela. Fazer isso pelo
-- cliente daria uma sequencia de delete, update e insert sem transacao, e um
-- erro no meio deixaria a ficha do aluno pela metade. Se ele estiver editando
-- uma ficha ATIVA, isso e o aluno abrir o app e nao encontrar o treino.
--
-- Entao o rewrite acontece aqui dentro, numa transacao so.
--
-- DUAS DECISOES QUE VALEM LEMBRAR:
--
-- 1. `security invoker` (o padrao), NAO `security definer`. Quem chama e o
--    Allisson logado, e as policies da 0003 ja dizem que so admin escreve em
--    protocolo, bloco e item. Com invoker a RLS continua valendo dentro da
--    funcao: um aluno que chamar isto na API nao consegue escrever nada. Nao
--    precisa de checagem de admin no corpo, e nao entra na lista de
--    `security definer` exposto do advisor.
--
-- 2. Os ids dos itens sao PRESERVADOS quando ja existem, em vez de apagar tudo
--    e recriar. `serie_registrada.item_id` aponta para o item com `on delete
--    set null`: apagar e recriar a cada gravacao cortaria o vinculo entre o
--    que o aluno treinou e a linha da ficha, toda vez que o Allisson mexesse
--    numa virgula. O historico de carga continuaria de pe pelo `exercicio_id`,
--    mas a ligacao fina se perderia sem necessidade.

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

  -- Primeiro passo: gravar blocos e itens, guardando os ids que sobrevivem.
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
          (bloco_id, exercicio_id, ordem, series, reps, descanso_seg, metodo, observacao)
        values (
          v_bloco_id,
          (i ->> 'exercicio_id')::uuid,
          (i ->> 'ordem')::smallint,
          (i ->> 'series')::smallint,
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
            reps = coalesce(nullif(btrim(i ->> 'reps'), ''), '10-12'),
            descanso_seg = (i ->> 'descanso_seg')::smallint,
            metodo = (i ->> 'metodo')::public.metodo_serie,
            observacao = nullif(btrim(coalesce(i ->> 'observacao', '')), '')
        where id = (i ->> 'id')::uuid;
        v_ids_itens := v_ids_itens || (i ->> 'id')::uuid;
      end if;
    end loop;
  end loop;

  -- Segundo passo: o que sumiu da tela sai do banco. Bloco apagado leva os
  -- itens junto pelo `on delete cascade`.
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

comment on function public.salvar_ficha(uuid, text, date, date, text, jsonb) is
  'Regrava blocos e itens de um protocolo numa transacao so. Security invoker: a RLS decide quem pode.';
