-- 0017 · Plano planilha em espera
--
-- Ninguém usa o plano planilha ainda e o produto dele não está pensado
-- (Rafael, 21/09). O painel mostra a opção apagada, mas botão apagado não é
-- trava: a regra fica aqui, para nenhum caminho criar convite de planilha.
-- Na data da migração não havia nenhum convite nem aluno de planilha.
--
-- Para reativar: drop trigger convite_planilha_em_espera on public.convite;

create or replace function privado.barrar_convite_de_planilha()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tipo = 'planilha' then
    raise exception 'O plano planilha está em espera.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function privado.barrar_convite_de_planilha() from public, anon, authenticated;

create trigger convite_planilha_em_espera
  before insert or update of tipo on public.convite
  for each row execute function privado.barrar_convite_de_planilha();
