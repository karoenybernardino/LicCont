-- Convenção do LicCONT para todas as tabelas futuras:
--   1. Nada novo em public fica acessível pela Data API sem GRANT explícito.
--   2. Políticas de RLS leem o vínculo do usuário só por funções do esquema app.
-- Modelo de uso: supabase/tests/convencao_isolamento.test.sql.

-- 1. Sem privilégio automático para anon/authenticated em objetos novos de public.
--    (Reforça "expor novas tabelas automaticamente = desligado" do projeto.)
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- 2. Esquema das funções de vínculo. Não é exposto pela Data API.
create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated;

-- Prefeitura do usuário logado, lida de app_metadata (o usuário não altera).
-- Provisório: na Fase 1 a origem pode mudar (tabela de vínculos + hook de
-- token); as políticas continuam chamando só esta função.
create or replace function app.prefeitura_atual()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'prefeitura_id', '')::uuid
$$;

revoke execute on function app.prefeitura_atual() from public, anon;
grant execute on function app.prefeitura_atual() to authenticated;
