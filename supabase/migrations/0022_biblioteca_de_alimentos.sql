-- 0022 biblioteca_de_alimentos
--
-- O alimento proprio ganhou um lugar para ser cadastrado, editado e tirado de
-- circulacao: a aba Alimentos da Biblioteca (Rafael, 08/10). Antes so nascia
-- dentro do editor de dieta de um aluno, e o Allisson nao achou.
--
-- A policy da 0018 era `for all` para o admin: ele podia editar e ate apagar
-- QUALQUER alimento, inclusive os 597 da TACO. A tela nao oferece isso, mas
-- trava de tela nao e trava. Agora a RLS diz:
--
--   - admin cadastra so alimento proprio;
--   - admin corrige so alimento proprio, e nao consegue transforma-lo em TACO;
--   - ninguem apaga. Alimento sai de circulacao (`ativo = false`), como
--     exercicio: `item_alimentar` aponta para ele, e apagar quebraria a dieta
--     de quem ja usa.
--
-- A TACO continua entrando por migracao (0019), que nao passa por RLS.

drop policy if exists alimento_admin_escreve on public.alimento;

drop policy if exists alimento_admin_cadastra on public.alimento;
create policy alimento_admin_cadastra on public.alimento
  for insert to authenticated
  with check (privado.eh_admin() and origem = 'proprio');

drop policy if exists alimento_admin_corrige on public.alimento;
create policy alimento_admin_corrige on public.alimento
  for update to authenticated
  using (privado.eh_admin() and origem = 'proprio')
  with check (privado.eh_admin() and origem = 'proprio');

-- Sem policy de DELETE, de proposito.

-- Dois "Whey isolado" na busca do editor e ele nao saberia qual escolher. So
-- entre os proprios: a TACO tem nomes que se repetem com detalhe diferente, e
-- um alimento dele pode ter o mesmo nome de um da TACO.
create unique index if not exists alimento_proprio_nome_unico
  on public.alimento (lower(btrim(nome)))
  where origem = 'proprio';
