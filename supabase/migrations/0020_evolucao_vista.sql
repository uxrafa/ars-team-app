-- 0020 evolucao_vista
--
-- O Allisson precisa saber quando um aluno manda foto nova ou atualiza as
-- medidas na Evolucao (Rafael, 06/10). E o que dispara a renovacao: o aluno
-- manda as fotos, ele olha, ajusta a ficha e confirma o pagamento.
--
-- "Novo" e relativo a quando ELE olhou pela ultima vez, entao precisa de um
-- carimbo por aluno: `evolucao_vista`. Uma linha por aluno, so admin le e
-- escreve. Tabela separada, e nao coluna em `perfis`, para nao abrir mais um
-- campo que o gatilho da 0009 teria de proteger do proprio aluno.
--
-- Foto e medida sao gravadas por upsert (uma por dia/angulo). Reenviar a foto
-- no mesmo dia atualiza a linha sem mudar `criado_em`, e o aviso nao
-- dispararia. Por isso as duas tabelas ganham `atualizado_em`, carimbado por
-- gatilho em todo update.
--
-- Medida de check-in (`origem = 'sessao'`) e da anamnese nao contam: a
-- primeira e o peso de todo treino, e encheria a fila; a segunda ja chega como
-- "anamnese enviada" no painel.

/* ------------------------------------------------------------------ */
/* atualizado_em em foto e medida                                      */
/* ------------------------------------------------------------------ */

-- Coluna nasce vazia e e preenchida com `criado_em`: com `default now()` direto
-- no add column, toda foto antiga ganharia o carimbo de hoje e viraria
-- "novidade" de uma vez.
alter table public.foto_evolucao   add column if not exists atualizado_em timestamptz;
alter table public.medida_corporal add column if not exists atualizado_em timestamptz;

update public.foto_evolucao   set atualizado_em = criado_em where atualizado_em is null;
update public.medida_corporal set atualizado_em = criado_em where atualizado_em is null;

alter table public.foto_evolucao
  alter column atualizado_em set default now(),
  alter column atualizado_em set not null;
alter table public.medida_corporal
  alter column atualizado_em set default now(),
  alter column atualizado_em set not null;

create or replace function privado.carimbar_atualizacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

revoke all on function privado.carimbar_atualizacao() from public, anon;

drop trigger if exists ao_atualizar_foto on public.foto_evolucao;
create trigger ao_atualizar_foto
  before update on public.foto_evolucao
  for each row execute function privado.carimbar_atualizacao();

drop trigger if exists ao_atualizar_medida on public.medida_corporal;
create trigger ao_atualizar_medida
  before update on public.medida_corporal
  for each row execute function privado.carimbar_atualizacao();

/* ------------------------------------------------------------------ */
/* Quando o treinador olhou                                            */
/* ------------------------------------------------------------------ */

create table if not exists public.evolucao_vista (
  aluno_id  uuid primary key references public.perfis(id) on delete cascade,
  vista_em  timestamptz not null default now(),
  vista_por uuid references public.perfis(id) on delete set null
);

comment on table public.evolucao_vista is
  'Ultima vez que o treinador marcou a Evolucao do aluno como vista. Foto ou medida depois disso e novidade.';

alter table public.evolucao_vista enable row level security;

drop policy if exists evolucao_vista_admin on public.evolucao_vista;
create policy evolucao_vista_admin on public.evolucao_vista
  for all to authenticated
  using (privado.eh_admin())
  with check (privado.eh_admin());

-- Ponto de partida. Sem isto, as fotos da anamnese de todo mundo (setembro)
-- apareceriam como novidade no primeiro dia. O corte e 01/10, quando comecou
-- a rodada de renovacao: o que chegou de outubro para ca aparece.
insert into public.evolucao_vista (aluno_id, vista_em)
select id, timestamptz '2026-10-01 00:00:00-03'
from public.perfis
where tipo <> 'admin'
on conflict (aluno_id) do nothing;

/* ------------------------------------------------------------------ */
/* O que chegou depois                                                 */
/* ------------------------------------------------------------------ */

-- security_invoker: a view respeita a RLS de quem pergunta. O admin ve todos;
-- um aluno veria so a propria linha, e sem `vista_em`, que e so do admin.
create or replace view public.evolucao_nova
with (security_invoker = true) as
select
  p.id                as aluno_id,
  v.vista_em,
  f.fotos_novas,
  f.ultima_foto_em,
  m.medidas_novas,
  m.ultima_medida_em
from public.perfis p
left join public.evolucao_vista v on v.aluno_id = p.id
cross join lateral (
  select count(*)::int as fotos_novas, max(fe.atualizado_em) as ultima_foto_em
  from public.foto_evolucao fe
  where fe.aluno_id = p.id
    and fe.atualizado_em > coalesce(v.vista_em, '-infinity'::timestamptz)
) f
cross join lateral (
  select count(*)::int as medidas_novas, max(mc.atualizado_em) as ultima_medida_em
  from public.medida_corporal mc
  where mc.aluno_id = p.id
    and mc.origem = 'manual'
    and mc.atualizado_em > coalesce(v.vista_em, '-infinity'::timestamptz)
) m
where p.tipo <> 'admin'
  and p.arquivado_em is null
  and (f.fotos_novas > 0 or m.medidas_novas > 0);

comment on view public.evolucao_nova is
  'Uma linha por aluno com foto ou medida manual depois da ultima vez que o treinador olhou.';

grant select on public.evolucao_nova to authenticated;
