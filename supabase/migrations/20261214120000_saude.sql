-- Rota de saúde (/api/saude): o servidor confere que o banco responde.
-- Só o service_role executa; não lê tabela nenhuma.
create function public.saude()
returns boolean
language sql
stable
set search_path = ''
as $$
  select true
$$;
revoke execute on function public.saude() from public, anon, authenticated;
grant execute on function public.saude() to service_role;
