-- 0010 convite_de_aluno
--
-- O Allisson tem de 23 a 26 alunos para migrar. Ate aqui a unica forma de
-- criar conta era pelo painel da Supabase, na mao, uma por uma, e sem plano,
-- mensalidade nem vencimento preenchidos. Esta migracao troca isso por um
-- convite com link.
--
-- Como funciona:
--   1. o Allisson preenche o cadastro do aluno no painel e gera um convite;
--   2. manda o link pelo WhatsApp;
--   3. o aluno abre, escolhe a senha e a conta nasce ja com plano,
--      mensalidade e vencimento que o Allisson preencheu.
--
-- SEGUNDA COISA QUE ESTA MIGRACAO FAZ, E QUE E DE SEGURANCA:
--
-- Ate hoje o cadastro so estava fechado na tela. O server action checava se
-- quem pedia era admin, mas /auth/v1/signup e endpoint publico do GoTrue:
-- qualquer pessoa com a chave publicavel (que esta no navegador, por
-- definicao) podia criar uma conta chamando a API direto, e o gatilho
-- criava o perfil sem perguntar nada. Nao dava acesso a dado de ninguem,
-- porque a RLS segura, mas enchia o painel do Allisson de gente estranha.
--
-- A partir daqui o gatilho `ao_criar_usuario` so cria perfil quando existe um
-- convite valido para aquele e-mail. Sem convite, o cadastro e recusado pelo
-- banco. A trava saiu da tela e foi para onde ela vale.
--
-- Escape hatch para criar conta na mao (recuperacao, conta do proprio
-- Allisson): criar antes a linha de convite, por SQL ou pelo painel, e so
-- depois criar o usuario. Ver o final deste arquivo.

/* ------------------------------------------------------------------ */
/* Tabela                                                              */
/* ------------------------------------------------------------------ */

create table if not exists public.convite (
  id uuid primary key default gen_random_uuid(),

  -- Segredo do link. Gerado no servidor com bytes aleatorios; e a unica
  -- coisa que autoriza o cadastro, entao tem piso de tamanho.
  token text not null unique,

  -- O cadastro que o Allisson preenche. Vira o perfil quando o aluno entra.
  nome text not null,
  email text not null,
  whatsapp text,
  tipo public.perfil_tipo not null default 'consultoria',
  mensalidade numeric(8,2),
  acesso_ate date,

  criado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '30 days',

  -- Estado. Os tres sao nulos enquanto o convite esta de pe.
  usado_em timestamptz,
  cancelado_em timestamptz,
  aluno_id uuid references public.perfis (id) on delete set null,

  constraint convite_token_tamanho check (char_length(token) >= 24),
  constraint convite_nome_preenchido check (btrim(nome) <> ''),
  constraint convite_email_minusculo check (email = lower(btrim(email))),
  constraint convite_email_parece_email check (email like '%_@_%.__%'),
  -- Convite e para aluno. Admin se promove por SQL, de proposito.
  constraint convite_nao_cria_admin check (tipo <> 'admin'),
  constraint convite_mensalidade_valida
    check (mensalidade is null or (mensalidade >= 0 and mensalidade <= 100000))
);

comment on table public.convite is
  'Convite de primeiro acesso do aluno. O token e o segredo do link que o Allisson manda no WhatsApp.';
comment on column public.convite.expira_em is
  'Link vencido nao cria conta. O painel mostra como vencido e deixa gerar outro.';

-- Um convite de pe por e-mail. Para reenviar, cancela o antigo e cria outro,
-- que e o que o server action faz.
create unique index if not exists convite_um_de_pe_por_email
  on public.convite (email)
  where usado_em is null and cancelado_em is null;

create index if not exists convite_por_estado
  on public.convite (usado_em, expira_em);

/* ------------------------------------------------------------------ */
/* RLS: convite e coisa do treinador                                   */
/* ------------------------------------------------------------------ */

alter table public.convite enable row level security;

drop policy if exists "somente admin le convite" on public.convite;
create policy "somente admin le convite"
  on public.convite for select to authenticated
  using (privado.eh_admin());

drop policy if exists "somente admin cria convite" on public.convite;
create policy "somente admin cria convite"
  on public.convite for insert to authenticated
  with check (privado.eh_admin());

drop policy if exists "somente admin altera convite" on public.convite;
create policy "somente admin altera convite"
  on public.convite for update to authenticated
  using (privado.eh_admin())
  with check (privado.eh_admin());

drop policy if exists "somente admin apaga convite" on public.convite;
create policy "somente admin apaga convite"
  on public.convite for delete to authenticated
  using (privado.eh_admin());

/* ------------------------------------------------------------------ */
/* Leitura do convite por quem ainda nao tem conta                     */
/* ------------------------------------------------------------------ */

-- O aluno abre o link antes de existir no sistema, entao chega como `anon`.
-- A policy acima nao deixa ele ler a tabela, e esta e a excecao estreita:
-- devolve apenas nome, e-mail e plano, e SO para quem apresenta o token
-- inteiro. Sem token nao ha consulta possivel.
--
-- Esta funcao mora em `public` de proposito, ao contrario das de gatilho:
-- ela PRECISA ser chamavel como /rest/v1/rpc, que e o caminho do site.
-- Ver a armadilha registrada na 0002: la o erro seria expor; aqui expor e
-- o objetivo, e o que protege e o segredo do token.

create or replace function public.convite_por_token(p_token text)
returns table (
  nome text,
  email text,
  tipo public.perfil_tipo,
  situacao text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.nome,
    c.email,
    c.tipo,
    case
      when c.usado_em is not null then 'usado'
      when c.cancelado_em is not null then 'cancelado'
      when c.expira_em <= now() then 'expirado'
      else 'valido'
    end
  from public.convite c
  where c.token = p_token
  limit 1;
$$;

revoke all on function public.convite_por_token(text) from public;
grant execute on function public.convite_por_token(text) to anon, authenticated;

-- ATENCAO PARA SESSOES FUTURAS: o advisor de seguranca da Supabase vai apontar
-- esta funcao em dois lints (anon_security_definer_function_executable e
-- authenticated_security_definer_function_executable). E esperado e proposital.
-- NAO revogar o EXECUTE: revogar quebra a tela de convite, que e justamente a
-- unica porta de entrada de aluno novo. Mesmo padrao de armadilha da 0002, so
-- que ao contrario: la a correcao era tirar de public, aqui public e o lugar.

/* ------------------------------------------------------------------ */
/* Conta so nasce por convite                                          */
/* ------------------------------------------------------------------ */

create or replace function privado.criar_perfil_no_cadastro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'convite', '')), '');
  v_nome  text := btrim(coalesce(new.raw_user_meta_data ->> 'nome', ''));
  c public.convite%rowtype;
begin
  if v_token is not null then
    select * into c
    from public.convite
    where token = v_token
      and usado_em is null
      and cancelado_em is null
      and expira_em > now()
    for update;
  end if;

  if c.id is null then
    -- Banco vazio: a primeira conta nasce sem convite, senao nao haveria
    -- como criar o primeiro admin. Depois disso, ninguem entra sem convite.
    if exists (select 1 from public.perfis) then
      raise exception
        'Cadastro so por convite do treinador.'
        using errcode = '42501';
    end if;

    insert into public.perfis (id, email, nome)
    values (new.id, new.email, v_nome)
    on conflict (id) do nothing;
    return new;
  end if;

  -- O token e de uma pessoa so. Sem isto, um link vazado viraria conta em
  -- qualquer e-mail, com o plano e o vencimento que o Allisson preencheu.
  if lower(new.email) is distinct from c.email then
    raise exception
      'Este convite foi feito para outro e-mail.'
      using errcode = '42501';
  end if;

  insert into public.perfis (
    id, email, nome, whatsapp, tipo, status, acesso_ate, mensalidade
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(v_nome, ''), c.nome),
    c.whatsapp,
    c.tipo,
    'ativo',
    c.acesso_ate,
    c.mensalidade
  )
  on conflict (id) do nothing;

  update public.convite
  set usado_em = now(), aluno_id = new.id
  where id = c.id;

  return new;
end;
$$;

revoke all on function privado.criar_perfil_no_cadastro() from public, anon, authenticated;

-- Para criar uma conta na mao depois desta migracao (a do proprio Allisson,
-- ou recuperar alguem), gerar o convite antes:
--
--   insert into public.convite (token, nome, email, tipo)
--   values (encode(gen_random_bytes(24), 'base64'), 'Nome', 'email@exemplo.com', 'consultoria');
--
-- e usar o token no metadata do cadastro. Pelo painel e mais rapido.
