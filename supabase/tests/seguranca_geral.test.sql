-- Fase 8 · checklist de segurança: vale para TODAS as tabelas de public, as de
-- hoje e as futuras. Tabela nova sem RLS ou com privilégio para anon quebra aqui.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select is(
  (select coalesce(string_agg(c.relname, ', ' order by c.relname), '')
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  '', 'toda tabela de public tem RLS ligado');

select is(
  (select coalesce(string_agg(distinct table_name, ', ' order by table_name), '')
     from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'),
  '', 'nenhuma tabela de public dá privilégio a anon');

select is(
  (select coalesce(string_agg(distinct table_name, ', ' order by table_name), '')
     from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'service_role'
      and table_name not in ('prefeituras', 'secretarias', 'usuarios', 'vinculos', 'equipe_liccont', 'auditoria', 'descarte_itens', 'descartes', 'etiquetas', 'modelos_termo', 'tabela_temporalidade', 'tentativas_login')),
  '', 'service_role só tem privilégio nas tabelas de cadastro do servidor (as outras, só por função)');

select is(
  (select coalesce(string_agg(table_name || ':' || privilege_type, ', ' order by table_name), '')
     from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'authenticated' and privilege_type = 'DELETE'
      and table_name <> 'vinculos'),
  '', 'authenticated só apaga vínculos (nenhuma outra tabela tem DELETE)');

select * from finish();
rollback;
