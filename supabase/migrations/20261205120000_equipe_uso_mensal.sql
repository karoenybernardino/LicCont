-- Fase 8 · tarefa 5: relatório mensal de uso da equipe. Só um número agregado
-- (tentativas de login recusadas no mês, de todas as prefeituras); o resto vem
-- de equipe_uso_prefeituras(). Nada de e-mail, IP ou conteúdo.
create or replace function public.equipe_recusados_mes()
returns integer language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select app.eh_equipe()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return (select count(*)::int from public.tentativas_login
           where not sucesso and criado_em >= date_trunc('month', now()));
end $$;
revoke execute on function public.equipe_recusados_mes() from public, anon;
grant execute on function public.equipe_recusados_mes() to authenticated;
