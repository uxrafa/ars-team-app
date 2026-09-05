-- 0015 arquivar_aluno
--
-- O Allisson precisa tirar aluno da lista. Aluno que parou, que virou aluno de
-- outro professor, que sumiu de vez: com 25 na tela, tres desses ja poluem a
-- fila de atencao todo dia e cada um vira uma tarefa falsa.
--
-- ISTO NAO E EXCLUSAO, E E PROPOSITAL. Nao existe backup automatico neste
-- projeto (plano Pro adiado em 30/08). Apagar o perfil derruba em cascata a
-- anamnese, a ficha, TODAS as sessoes de treino com as series, as medidas e as
-- fotos -- e as fotos ainda ficariam orfas no bucket, porque a linha some e o
-- arquivo nao. Um clique errado custaria um ano de treino de alguem, sem
-- volta. Arquivar e reversivel, e cobre o caso real.
--
-- A exclusao de verdade (LGPD, "apaga tudo o que voce tem sobre mim") fica
-- para uma migracao propria, com as decisoes ja tomadas em 05/09: o pagamento
-- sobrevive sem dono, com o nome congelado, porque livro-caixa nao se
-- reescreve; e a conta de login e apagada junto, para o e-mail voltar a ficar
-- livre para um convite novo.

alter table public.perfis
  add column if not exists arquivado_em timestamptz,
  add column if not exists arquivado_motivo text,
  add column if not exists arquivado_por uuid references public.perfis (id) on delete set null;

comment on column public.perfis.arquivado_em is
  'Quando o treinador tirou o aluno de circulacao. Nulo = aluno na ativa. Nao apaga nada.';

-- Admin nao se arquiva. Sem isto, o Allisson consegue se tirar do proprio
-- painel e nao existe tela para desfazer -- ele ficaria de fora do sistema
-- que so ele administra.
alter table public.perfis drop constraint if exists perfis_admin_nao_arquiva;
alter table public.perfis add constraint perfis_admin_nao_arquiva
  check (arquivado_em is null or tipo <> 'admin');

-- Motivo em branco daqui a um ano nao explica nada. Nao e obrigatorio como no
-- estorno (arquivar e reversivel, estornar mexe em dinheiro), mas se vier tem
-- que vir com conteudo.
alter table public.perfis drop constraint if exists perfis_arquivo_sem_motivo_vazio;
alter table public.perfis add constraint perfis_arquivo_sem_motivo_vazio
  check (arquivado_motivo is null or btrim(arquivado_motivo) <> '');

-- Quase toda consulta do painel quer "os que nao estao arquivados, por nome".
create index if not exists perfis_na_ativa_idx
  on public.perfis (nome)
  where arquivado_em is null and tipo <> 'admin';

/* ------------------------------------------------------------------ */
/* O aluno nao se arquiva nem se desarquiva                            */
/* ------------------------------------------------------------------ */

-- Mesma falha da 0009, campos novos: a policy de UPDATE deixa o dono editar a
-- propria linha, e sem isto o aluno arquivado rodaria
--
--     update perfis set arquivado_em = null where id = <o proprio id>;
--
-- direto na API e voltaria para a lista do Allisson sozinho. RLS decide quais
-- LINHAS, nao quais COLUNAS -- quem separa coluna e o gatilho.
create or replace function privado.proteger_campos_do_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if privado.eh_admin() then
    return new;
  end if;

  -- Sem usuario no contexto = gatilho do banco, migracao ou service_role.
  if (select auth.uid()) is null then
    return new;
  end if;

  if new.id            is distinct from old.id
     or new.email      is distinct from old.email
     or new.tipo       is distinct from old.tipo
     or new.status     is distinct from old.status
     or new.acesso_ate is distinct from old.acesso_ate
     or new.mensalidade is distinct from old.mensalidade
     or new.criado_em  is distinct from old.criado_em
     or new.arquivado_em is distinct from old.arquivado_em
     or new.arquivado_motivo is distinct from old.arquivado_motivo
     or new.arquivado_por is distinct from old.arquivado_por
  then
    raise exception
      'Plano, status, vencimento, mensalidade e arquivamento so o treinador altera.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function privado.proteger_campos_do_perfil() from public, anon;

drop trigger if exists ao_proteger_perfil on public.perfis;
create trigger ao_proteger_perfil
  before update on public.perfis
  for each row execute function privado.proteger_campos_do_perfil();
