-- 0007 acesso_ate_no_perfil
-- O painel do Allisson precisa saber ate quando o aluno pagou, para montar
-- a fila de "precisa da sua atencao". Isso e independente de gateway: hoje
-- o Allisson preenche na mao, e quando a 2B entrar o webhook passa a
-- escrever nesta mesma coluna, sem migration nova.
--
-- Divisao de papeis:
--   perfis.status     = pode entrar? (ativo | carencia | suspenso)
--   perfis.acesso_ate = ate quando esta pago
-- O status continua sendo a fonte da verdade do acesso. A data serve para
-- ordenar a cobranca e avisar antes de vencer.

alter table public.perfis
  add column if not exists acesso_ate date;

comment on column public.perfis.acesso_ate is
  'Ate quando o aluno esta pago. Preenchido a mao na 2A e pelo webhook na 2B.';

create index if not exists perfis_acesso_ate_idx
  on public.perfis (acesso_ate)
  where tipo <> 'admin';
