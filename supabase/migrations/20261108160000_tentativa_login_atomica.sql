-- Fase 1 · Login (tarefa 4), achados da revisão de segurança:
-- 1. Conferir o bloqueio e gravar a tentativa num passo só, com trava por
--    conta: pedidos em paralelo não furam o limite e uma falha de gravação
--    não deixa o limite aberto (a tentativa nasce como falha antes da senha).
-- 2. Sem IP (fora da Vercel), não há regra por IP: um balde único de IP nulo
--    bloquearia todo mundo.
-- As funções antigas continuam (versão do app no ar). Teste:
-- supabase/tests/login_servidor.test.sql.

create or replace function public.login_bloqueado(p_email_hash text, p_ip inet)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.tentativas_login t
      where t.email_hash = p_email_hash and not t.sucesso
        and t.criado_em > now() - interval '15 minutes') >= 5
    or
    (p_ip is not null and (select count(*) from public.tentativas_login t
      where t.ip = p_ip and not t.sucesso
        and t.criado_em > now() - interval '15 minutes') >= 20)
$$;

-- Devolve o id da tentativa (gravada como falha) ou null se bloqueado.
create or replace function public.iniciar_tentativa_login(p_email_hash text, p_ip inet)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_email_hash, 0));
  if public.login_bloqueado(p_email_hash, p_ip) then
    return null;
  end if;
  delete from public.tentativas_login where criado_em < now() - interval '1 day';
  insert into public.tentativas_login (email_hash, ip, sucesso)
  values (p_email_hash, p_ip, false)
  returning id into v_id;
  return v_id;
end
$$;

create or replace function public.concluir_tentativa_login(p_id bigint)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.tentativas_login set sucesso = true where id = p_id
$$;

revoke execute on function public.iniciar_tentativa_login(text, inet),
  public.concluir_tentativa_login(bigint) from public, anon, authenticated;
grant execute on function public.iniciar_tentativa_login(text, inet),
  public.concluir_tentativa_login(bigint) to service_role;
