-- Fase 3 · Storage: buckets do acervo (PDF) e das miniaturas, com políticas.
-- Plano: docs/fases/fase-3.md. Testes: supabase/tests/storage_acervo.test.sql.
--
-- O caminho do objeto é <prefeitura>/<secretaria>/<arquivo>.pdf (e .webp nas
-- miniaturas) e é gerado pelo banco na linha de public.arquivos. Gravar só
-- com essa linha em "enviando" criada pela própria pessoa; nunca sobrescrever
-- (sem política de UPDATE); apagar só o envio recusado ou abandonado.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('acervo', 'acervo', false, 52428800, array['application/pdf']),
  ('miniaturas', 'miniaturas', false, 307200, array['image/webp', 'image/png'])
on conflict (id) do nothing;

-- Pastas do caminho: 1ª = prefeitura, 2ª = secretaria, nome = <arquivo>.<ext>.
create policy acervo_le on storage.objects for select to authenticated
  using (
    bucket_id in ('acervo', 'miniaturas')
    and (storage.foldername(name))[1] = (select app.prefeitura_atual())::text
    and (storage.foldername(name))[2] in (select (app.secretarias_permitidas())::text)
  );

create policy acervo_grava on storage.objects for insert to authenticated
  with check (
    bucket_id = 'acervo'
    and exists (
      select 1 from public.arquivos a
      where a.caminho = name
        and a.situacao = 'enviando'
        and a.enviado_por = (select auth.uid())
        and a.prefeitura_id = (select app.prefeitura_atual())
        and app.pode_cadastrar(a.secretaria_id)
    )
  );

create policy miniaturas_grava on storage.objects for insert to authenticated
  with check (
    bucket_id = 'miniaturas'
    and exists (
      select 1 from public.arquivos a
      where a.prefeitura_id::text || '/' || a.secretaria_id::text || '/' || a.id::text
              = (storage.foldername(name))[1] || '/' || (storage.foldername(name))[2] || '/'
                || split_part(storage.filename(name), '.', 1)
        and a.situacao in ('enviando', 'conferindo')
        and a.enviado_por = (select auth.uid())
        and a.prefeitura_id = (select app.prefeitura_atual())
        and app.pode_cadastrar(a.secretaria_id)
    )
  );

create policy acervo_apaga on storage.objects for delete to authenticated
  using (
    bucket_id in ('acervo', 'miniaturas')
    and exists (
      select 1 from public.arquivos a
      where a.prefeitura_id::text || '/' || a.secretaria_id::text || '/' || a.id::text
              = (storage.foldername(name))[1] || '/' || (storage.foldername(name))[2] || '/'
                || split_part(storage.filename(name), '.', 1)
        and a.situacao in ('enviando', 'recusado')
        and a.enviado_por = (select auth.uid())
        and a.prefeitura_id = (select app.prefeitura_atual())
    )
  );
