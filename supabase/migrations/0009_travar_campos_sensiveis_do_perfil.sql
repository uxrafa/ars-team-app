-- 0009 travar_campos_sensiveis_do_perfil
--
-- FALHA DE SEGURANCA CORRIGIDA AQUI.
--
-- A policy de UPDATE em perfis (migracao 0001) permite que o dono atualize a
-- propria linha. Isso e certo para nome e whatsapp, mas a policy vale para a
-- linha inteira, entao o aluno podia rodar
--
--     update perfis set tipo = 'admin' where id = <o proprio id>;
--
-- direto na API e virar treinador. Testado e confirmado em 25/08/2026.
--
-- RLS decide QUAIS LINHAS, nao QUAIS COLUNAS. Como aluno e admin sao os dois o
-- mesmo papel do Postgres (`authenticated`), grant por coluna tambem nao
-- separa. A saida e um gatilho que compara old e new.
--
-- O que o aluno pode mudar na propria linha: nome e whatsapp. Mais nada.

create or replace function privado.proteger_campos_do_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admin manda em tudo.
  if privado.eh_admin() then
    return new;
  end if;

  -- Sem usuario no contexto = gatilho do banco, migracao ou service_role.
  -- Nao e caminho de aluno, entao passa.
  if (select auth.uid()) is null then
    return new;
  end if;

  if new.id           is distinct from old.id
     or new.email     is distinct from old.email
     or new.tipo      is distinct from old.tipo
     or new.status    is distinct from old.status
     or new.acesso_ate is distinct from old.acesso_ate
     or new.mensalidade is distinct from old.mensalidade
     or new.criado_em is distinct from old.criado_em
  then
    raise exception
      'Plano, status, vencimento e mensalidade so o treinador altera.'
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
