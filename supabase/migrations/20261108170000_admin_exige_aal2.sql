-- Fase 1 · Dois fatores (tarefa 5), achado da revisão de segurança:
-- administrador sem o segundo fator (aal1) não tem vínculo nenhum no banco,
-- nem o de usuário comum. Antes, com um token aal1 tirado direto da API de
-- login, ele ainda lia secretarias e vínculos da própria prefeitura.
-- Compatível com a versão no ar (o app já manda o administrador ao segundo
-- fator antes de qualquer consulta). Teste: supabase/tests/dois_fatores.test.sql.
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
    and (not u.administrador or coalesce(auth.jwt() ->> 'aal', '') = 'aal2')
    and app.sessao_valida()
$$;
