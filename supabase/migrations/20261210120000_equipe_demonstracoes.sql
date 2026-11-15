-- Fase 9 · tarefa 9.20: andamento dos pedidos de demonstração. Só a equipe com
-- 2º fator muda situação, data e responsável, e só por esta função (a tabela
-- continua sem UPDATE direto). A auditoria guarda o código do pedido e a
-- situação nova, nunca nome, e-mail ou mensagem.
create or replace function public.equipe_atualizar_pedido(
  p_id uuid, p_situacao text, p_demo_em date, p_responsavel text
) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not (select app.eh_equipe()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  update public.pedidos_demonstracao
     set situacao = p_situacao, demo_em = p_demo_em, responsavel = nullif(trim(p_responsavel), ''),
         atualizado_em = now()
   where id = p_id;
  if not found then
    return false;
  end if;
  insert into public.auditoria (usuario_id, acao, alvo_tabela, alvo_id, depois)
  values (auth.uid(), 'equipe.pedido_atualizado', 'pedidos_demonstracao', p_id::text, jsonb_build_object('situacao', p_situacao));
  return true;
end $$;
revoke execute on function public.equipe_atualizar_pedido(uuid, text, date, text) from public, anon;
grant execute on function public.equipe_atualizar_pedido(uuid, text, date, text) to authenticated;
