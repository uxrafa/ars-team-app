-- 0008 mensalidade_no_perfil
-- O painel precisa dizer quanto esta em aberto, nao so quantos estao devendo.
-- Sem um valor por aluno isso nao fecha.
--
-- Continua independente de gateway, igual ao acesso_ate: hoje o Allisson
-- preenche na mao. Na 2B, quando existir produto e pedido, este campo vira o
-- valor vigente do contrato e o webhook cuida do resto.

alter table public.perfis
  add column if not exists mensalidade numeric(8,2);

comment on column public.perfis.mensalidade is
  'Quanto o aluno paga por mes. Preenchido a mao na 2A; na 2B vem do pedido.';

alter table public.perfis drop constraint if exists perfis_mensalidade_valida;
alter table public.perfis add constraint perfis_mensalidade_valida
  check (mensalidade is null or (mensalidade >= 0 and mensalidade <= 100000));
