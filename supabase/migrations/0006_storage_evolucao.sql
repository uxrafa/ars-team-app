-- 0006 storage_evolucao
-- Bucket privado das fotos de evolucao. Foto de corpo e dado de saude:
-- nunca publico, sempre servido por link temporario.
-- Convencao de caminho: {aluno_id}/{aaaa-mm-dd}/{angulo}.jpg
-- A primeira pasta do caminho e o uuid do aluno, e e nela que a policy manda.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evolucao','evolucao', false,
  6291456,  -- 6 MB por arquivo; a tela ainda comprime antes de subir
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "evolucao aluno le" on storage.objects
  for select to authenticated
  using (bucket_id = 'evolucao' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "evolucao aluno envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evolucao' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "evolucao aluno troca" on storage.objects
  for update to authenticated
  using (bucket_id = 'evolucao' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'evolucao' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "evolucao aluno apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'evolucao' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- O Allisson le as fotos de todo mundo, mas nao escreve nem apaga.
create policy "evolucao admin le" on storage.objects
  for select to authenticated
  using (bucket_id = 'evolucao' and privado.eh_admin());
