-- 0013 ultimo_checkin_e_indice
--
-- ERRO DE DADO CORRIGIDO AQUI, e nao so lentidao.
--
-- O painel descobria "quando cada aluno treinou pela ultima vez" buscando as
-- 60 sessoes mais recentes DE TODOS OS ALUNOS JUNTOS e pegando a primeira de
-- cada um em JS (`juntarAlunos`, em lib/painel.ts). A lista de alunos fazia o
-- mesmo com 200.
--
-- Com os 25 alunos do Allisson treinando 4x por semana, 60 sessoes cobrem
-- QUATRO DIAS. Quem parou de treinar ha tres semanas simplesmente nao aparece
-- nessa janela: o painel mostrava "sem check-in", `diasSemTreino` virava nulo,
-- e o aluno sumido NAO entrava na fila de atencao.
--
-- Era o pior tipo de erro: silencioso, e escondendo exatamente a pessoa que a
-- tela existe para mostrar. Quanto mais aluno, mais gente sumia da conta.
--
-- A resposta certa e uma linha por aluno, vinda do banco. `distinct on` faz
-- isso em uma varredura de indice, sem trazer sessao nenhuma para o Node.

/* ------------------------------------------------------------------ */
/* Indice que a ordenacao pedia                                        */
/* ------------------------------------------------------------------ */

-- O indice de 0005 e (aluno_id, data desc). Metade das consultas ordena por
-- `concluida_em`, que e o instante real do check-in -- e caia em sort da
-- tabela inteira filtrada pela RLS.
create index if not exists sessao_aluno_concluida_idx
  on public.sessao_treino (aluno_id, concluida_em desc)
  where status = 'concluida';

/* ------------------------------------------------------------------ */
/* Uma linha por aluno                                                 */
/* ------------------------------------------------------------------ */

create or replace view public.ultimo_checkin
with (security_invoker = true) as
select distinct on (s.aluno_id)
  s.aluno_id,
  s.id   as sessao_id,
  s.data,
  s.concluida_em
from public.sessao_treino s
where s.status = 'concluida'
order by s.aluno_id, s.concluida_em desc nulls last;

-- `security_invoker = true` e o ponto que nao pode faltar: sem ele a view
-- rodaria com os direitos de quem a criou e passaria por cima da RLS,
-- entregando o check-in de todo mundo para qualquer aluno autenticado. Com
-- ele, a view enxerga exatamente o que o usuario da consulta enxergaria na
-- tabela -- aluno ve o proprio, admin ve todos.

comment on view public.ultimo_checkin is
  'Uma linha por aluno com o treino concluido mais recente. Existe para o painel nao precisar buscar N sessoes e adivinhar em JS.';

grant select on public.ultimo_checkin to authenticated;
