-- Aplicada em 24/08/2026.
-- Motivo: o linter de seguranca da Supabase aponta funcoes SECURITY DEFINER que
-- ficam expostas como endpoint /rest/v1/rpc. Revogar a execucao quebra a RLS,
-- porque a politica precisa chamar eh_admin() a cada consulta. A saida e tirar as
-- funcoes do schema public, que e o unico exposto pela API.

create schema if not exists privado;
grant usage on schema privado to authenticated, service_role;

create or replace function privado.eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and tipo = 'admin'
  );
$$;

create or replace function privado.criar_perfil_no_cadastro()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, email, nome)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'nome', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function privado.tocar_atualizado_em()
returns trigger language plpgsql set search_path = public as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function privado.criar_perfil_no_cadastro();

drop trigger if exists ao_atualizar_perfil on public.perfis;
create trigger ao_atualizar_perfil
  before update on public.perfis
  for each row execute function privado.tocar_atualizado_em();

drop policy if exists "ler proprio perfil ou admin ve todos" on public.perfis;
drop policy if exists "atualizar proprio perfil ou admin atualiza todos" on public.perfis;
drop policy if exists "somente admin insere perfil manualmente" on public.perfis;
drop policy if exists "somente admin remove perfil" on public.perfis;

create policy "ler proprio perfil ou admin ve todos"
  on public.perfis for select to authenticated
  using (id = (select auth.uid()) or privado.eh_admin());

create policy "atualizar proprio perfil ou admin atualiza todos"
  on public.perfis for update to authenticated
  using (id = (select auth.uid()) or privado.eh_admin())
  with check (id = (select auth.uid()) or privado.eh_admin());

create policy "somente admin insere perfil manualmente"
  on public.perfis for insert to authenticated
  with check (privado.eh_admin());

create policy "somente admin remove perfil"
  on public.perfis for delete to authenticated
  using (privado.eh_admin());

drop function if exists public.eh_admin();
drop function if exists public.criar_perfil_no_cadastro();
drop function if exists public.tocar_atualizado_em();

revoke execute on function privado.eh_admin() from public;
grant execute on function privado.eh_admin() to authenticated;
revoke execute on function privado.criar_perfil_no_cadastro() from public;
revoke execute on function privado.tocar_atualizado_em() from public;
