-- Aplicada em 24/08/2026 no projeto ars-team-app (ref orpgpvtuxnmkxykfdzrk).
-- Tipos de perfil e status, conforme a secao 02 do escopo da Fase 2.
create type public.perfil_tipo as enum ('admin', 'consultoria', 'planilha');
create type public.perfil_status as enum ('ativo', 'carencia', 'suspenso');

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  email text not null,
  whatsapp text,
  tipo public.perfil_tipo not null default 'consultoria',
  status public.perfil_status not null default 'ativo',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and tipo = 'admin'
  );
$$;

create policy "ler proprio perfil ou admin ve todos"
  on public.perfis for select to authenticated
  using (id = (select auth.uid()) or public.eh_admin());

create policy "atualizar proprio perfil ou admin atualiza todos"
  on public.perfis for update to authenticated
  using (id = (select auth.uid()) or public.eh_admin())
  with check (id = (select auth.uid()) or public.eh_admin());

create policy "somente admin insere perfil manualmente"
  on public.perfis for insert to authenticated
  with check (public.eh_admin());

create policy "somente admin remove perfil"
  on public.perfis for delete to authenticated
  using (public.eh_admin());

create or replace function public.criar_perfil_no_cadastro()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, email, nome)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'nome', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_no_cadastro();

create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql set search_path = public as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger ao_atualizar_perfil
  before update on public.perfis
  for each row execute function public.tocar_atualizado_em();
