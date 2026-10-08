-- 0021 pago_ate_unico
--
-- "Pago ate" vira UMA data, e nao duas que podem discordar (Rafael, 08/10).
--
-- O que aconteceu: os alunos antigos entraram com um vencimento digitado no
-- convite (01/12, 07/12) que nao tinha sido pago. Quando o primeiro pagamento
-- de verdade chegou, a regra da emenda tratou esse vencimento como pago e
-- somou a partir dele: "1 mes ate 07/01/27". O Allisson corrigiu o "Pago ate"
-- do aluno para 07/12, e o pagamento continuou dizendo 07/01. Duas datas para
-- a mesma pergunta, e nenhum jeito de corrigir a segunda: pagamento so se
-- estorna, e registrar de novo emendaria no 07/12 outra vez.
--
-- Tres mudancas, todas pequenas:
--
-- 1. REGISTRO MANUAL PODE DIZER ATE QUANDO. Se o pagamento manual chega com
--    `competencia_ate`, essa data vale; a conta da emenda vira so a sugestao
--    que a tela mostra. Webhook de gateway continua sempre calculado.
--
-- 2. PAGAMENTO MANUAL MOVE O VENCIMENTO MESMO PARA TRAS. A data que o
--    Allisson viu na tela ao registrar e a que ele quer. "Nunca anda para
--    tras" continua valendo para o gateway, onde um evento atrasado nao pode
--    encurtar acesso pago.
--
-- 3. CORRIGIR O "PAGO ATE" DO ALUNO CORRIGE O ULTIMO PAGAMENTO. Gatilho em
--    `perfis`: quando o vencimento e gravado direto (tela do aluno), o
--    pagamento valido mais recente passa a valer ate a mesma data. Os
--    anteriores sao historia e nao mudam.
--
-- `pagamento` continua travado para quem chama pela API: valor, data de
-- entrada e meses nao mudam, e a janela so muda pelo gatilho do item 3.

/* ------------------------------------------------------------------ */
/* 1. A janela do pagamento                                            */
/* ------------------------------------------------------------------ */

create or replace function privado.aplicar_pagamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  vencimento date;
  base date;
begin
  if new.recebido_em > (current_date + 1) then
    raise exception 'Pagamento com data no futuro.'
      using errcode = '22007';
  end if;

  select p.acesso_ate into vencimento
    from public.perfis p
    where p.id = new.aluno_id
    for update;

  if not found then
    raise exception 'Aluno nao encontrado para o pagamento.'
      using errcode = '23503';
  end if;

  new.acesso_anterior := vencimento;
  base := greatest(coalesce(vencimento, new.recebido_em), new.recebido_em);

  if new.origem = 'manual' and new.competencia_ate is not null then
    -- O Allisson disse ate quando. Pagamento que termina antes de o dinheiro
    -- entrar nao e periodo, e digitacao errada.
    if new.competencia_ate <= new.recebido_em then
      raise exception 'O pago ate precisa ser depois do dia do pagamento.'
        using errcode = '22007';
    end if;
    -- Se a data escolhida fica antes da emenda, e porque o vencimento atual
    -- estava errado: o periodo comeca no dia do dinheiro.
    new.competencia_de := case
      when new.competencia_ate > base then base
      else new.recebido_em
    end;
  else
    new.competencia_de  := base;
    new.competencia_ate := (base + make_interval(months => new.meses))::date;
  end if;

  return new;
end;
$$;

revoke all on function privado.aplicar_pagamento() from public, anon;

/* ------------------------------------------------------------------ */
/* 2. O vencimento segue o pagamento manual                            */
/* ------------------------------------------------------------------ */

create or replace function privado.avancar_acesso_do_aluno()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estornado_em is not null then
    return new;
  end if;

  update public.perfis
     set acesso_ate = new.competencia_ate
   where id = new.aluno_id
     and (
       -- Manual: a data foi vista e confirmada na tela, vale como esta.
       new.origem = 'manual'
       -- Gateway: nunca anda para tras. Evento antigo reentregue depois de
       -- um recente nao pode encurtar o acesso de quem esta em dia.
       or acesso_ate is null
       or acesso_ate < new.competencia_ate
     );

  return new;
end;
$$;

revoke all on function privado.avancar_acesso_do_aluno() from public, anon;

/* ------------------------------------------------------------------ */
/* 3. Corrigir o vencimento corrige o ultimo pagamento                 */
/* ------------------------------------------------------------------ */

-- A trava continua igual, com uma porta: a janela (`competencia_de/ate`) pode
-- mudar quando quem muda e o gatilho de `perfis` abaixo. `pg_trigger_depth()`
-- e 1 quando o update vem da API e 2 quando vem de dentro de outro gatilho --
-- e a API nao tem como chamar gatilho por conta propria.
create or replace function privado.travar_pagamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.aluno_id       is distinct from old.aluno_id
     or new.valor       is distinct from old.valor
     or new.recebido_em is distinct from old.recebido_em
     or new.meses       is distinct from old.meses
     or new.acesso_anterior is distinct from old.acesso_anterior
     or new.criado_em   is distinct from old.criado_em
     or (
       pg_trigger_depth() < 2
       and (new.competencia_de  is distinct from old.competencia_de
            or new.competencia_ate is distinct from old.competencia_ate)
     )
  then
    raise exception
      'Pagamento nao se corrige: estorna e registra de novo.'
      using errcode = '42501';
  end if;

  if old.estornado_em is not null and new.estornado_em is null then
    raise exception 'Estorno nao se desfaz.'
      using errcode = '42501';
  end if;

  if old.estornado_em is null and new.estornado_em is not null then
    update public.perfis
       set acesso_ate = new.acesso_anterior
     where id = new.aluno_id
       and acesso_ate = new.competencia_ate;
  end if;

  return new;
end;
$$;

revoke all on function privado.travar_pagamento() from public, anon;

create or replace function privado.alinhar_ultimo_pagamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- So quando o vencimento foi gravado direto. Se quem mexeu foi o gatilho
  -- de pagamento (registro ou estorno), a janela ja esta certa.
  if pg_trigger_depth() > 1 or new.acesso_ate is null then
    return null;
  end if;

  update public.pagamento g
     set competencia_ate = new.acesso_ate,
         -- Data antes do comeco da janela: o comeco vira o dia do dinheiro,
         -- como no registro com data escolhida.
         competencia_de = case
           when new.acesso_ate > g.competencia_de then g.competencia_de
           else g.recebido_em
         end
   where g.id = (
           select u.id from public.pagamento u
            where u.aluno_id = new.id
              and u.estornado_em is null
            order by u.recebido_em desc, u.criado_em desc
            limit 1
         )
     and g.competencia_ate is distinct from new.acesso_ate
     -- Vencimento antes do dia em que o dinheiro entrou nao descreve aquele
     -- pagamento; ele fica como estava.
     and new.acesso_ate > g.recebido_em;

  return null;
end;
$$;

revoke all on function privado.alinhar_ultimo_pagamento() from public, anon;

-- `of acesso_ate`: so dispara quando o update menciona a coluna. A tela do
-- aluno sempre manda, entao salvar de novo sem mudar a data tambem alinha --
-- e e assim que os pagamentos ja gravados entram em acordo.
drop trigger if exists ao_corrigir_vencimento on public.perfis;
create trigger ao_corrigir_vencimento
  after update of acesso_ate on public.perfis
  for each row execute function privado.alinhar_ultimo_pagamento();
