-- Revisão de segurança da Fase 9 · exportação por URL assinada.
-- O pacote ZIP é gerado em bucket PRIVADO, em <prefeitura>/<arquivo>.zip, e o
-- administrador baixa por link assinado de 5 minutos. Só o administrador da
-- própria prefeitura (não a equipe LicCONT) lê, grava e apaga na sua pasta.
-- 50 MB por arquivo = teto do plano gratuito do Supabase; o servidor parte o
-- pacote em volumes que cabem nisso.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exportacoes', 'exportacoes', false, 52428800, array['application/zip'])
on conflict (id) do nothing;

create policy exportacoes_le on storage.objects for select to authenticated
  using (
    bucket_id = 'exportacoes'
    and (select app.eh_admin()) and not (select app.eh_equipe())
    and (storage.foldername(name))[1] = (select app.prefeitura_atual())::text
  );
create policy exportacoes_grava on storage.objects for insert to authenticated
  with check (
    bucket_id = 'exportacoes'
    and (select app.eh_admin()) and not (select app.eh_equipe())
    and (storage.foldername(name))[1] = (select app.prefeitura_atual())::text
  );
create policy exportacoes_apaga on storage.objects for delete to authenticated
  using (
    bucket_id = 'exportacoes'
    and (select app.eh_admin()) and not (select app.eh_equipe())
    and (storage.foldername(name))[1] = (select app.prefeitura_atual())::text
  );

-- Cron de limpeza: volumes com mais de 2 horas. Só o service_role executa.
create or replace function public.exportacoes_vencidas()
returns table (caminho text)
language sql stable security definer set search_path = '' as $$
  select o.name from storage.objects o
  where o.bucket_id = 'exportacoes' and o.created_at < now() - interval '2 hours';
$$;
revoke execute on function public.exportacoes_vencidas() from public, anon, authenticated;
grant execute on function public.exportacoes_vencidas() to service_role;
