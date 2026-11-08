-- Segundo fator obrigatório vira uma chave do banco (decisão do responsável,
-- 2026-11-08): DESLIGADO enquanto só há dados fictícios. Religar antes do
-- piloto (item obrigatório da Fase 8):
--   update app.configuracao set segundo_fator_obrigatorio = true;
-- Com a chave ligada, tudo volta a ser como na tarefa 5 (aal2 de
-- administrador e equipe). Teste: supabase/tests/segundo_fator_opcional.test.sql.

create table app.configuracao (
  id boolean primary key default true check (id), -- uma linha só
  segundo_fator_obrigatorio boolean not null default true
);
alter table app.configuracao enable row level security;
revoke all on app.configuracao from public, anon, authenticated;

insert into app.configuracao (segundo_fator_obrigatorio) values (false);

-- Sem a linha (ou com erro), vale o mais seguro: obrigatório.
create or replace function app.segundo_fator_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    or not coalesce((select c.segundo_fator_obrigatorio from app.configuracao c), true)
$$;
revoke execute on function app.segundo_fator_ok() from public, anon;
grant execute on function app.segundo_fator_ok() to authenticated;

-- Para o app saber se pede o código (não é dado sensível).
create or replace function public.segundo_fator_obrigatorio()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select c.segundo_fator_obrigatorio from app.configuracao c), true)
$$;
revoke execute on function public.segundo_fator_obrigatorio() from public, anon;
grant execute on function public.segundo_fator_obrigatorio() to authenticated, service_role;

create or replace function app.prefeitura_atual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.prefeitura_id
  from public.usuarios u
  where u.id = auth.uid()
    and u.ativo
    and not u.troca_senha_obrigatoria
    and (not u.administrador or app.segundo_fator_ok())
    and app.sessao_valida()
$$;

create or replace function app.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.segundo_fator_ok()
    and exists (
      select 1 from public.usuarios u
      where u.id = auth.uid()
        and u.administrador
        and u.prefeitura_id = app.prefeitura_atual()
    )
$$;

create or replace function app.eh_equipe()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.segundo_fator_ok()
    and app.sessao_valida()
    and exists (select 1 from public.equipe_liccont e where e.usuario_id = auth.uid())
$$;
