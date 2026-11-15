-- Limpeza automática de PDF abandonado: marca como recusado todo envio parado há
-- mais de 1 hora (enviando/conferindo) e devolve os caminhos para o servidor
-- apagar os objetos do Storage. Chamada só pelo servidor (service_role), por uma
-- rotina agendada. Não toca em arquivo pronto nem em documento.
create or replace function public.limpar_envios_todos()
returns table (caminho text, miniatura text)
language sql
security definer
set search_path = ''
as $$
  update public.arquivos a
  set situacao = 'recusado', motivo_recusa = 'incompleto', conferido_em = now()
  where a.situacao in ('enviando', 'conferindo')
    and a.enviado_em < now() - interval '1 hour'
  returning a.caminho, replace(a.caminho, '.pdf', '.webp');
$$;
revoke execute on function public.limpar_envios_todos() from public, anon, authenticated;
grant execute on function public.limpar_envios_todos() to service_role;
