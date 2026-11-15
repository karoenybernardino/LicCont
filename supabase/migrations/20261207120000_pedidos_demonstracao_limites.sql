-- Revisão de segurança da Fase 9 · pedido de demonstração e aceites.
--  1. Limite por IP (hash HMAC, nunca o IP) e trava contra corrida na contagem.
--  2. Guarda de 12 meses: função só do service_role, chamada pelo cron de limpeza.
--  3. aceites.prefeitura_id passa a ter chave estrangeira.

alter table public.pedidos_demonstracao add column ip_hash text check (ip_hash is null or char_length(ip_hash) = 64);
create index pedidos_demonstracao_ip_idx on public.pedidos_demonstracao (ip_hash, criado_em) where ip_hash is not null;
create index pedidos_demonstracao_email_idx on public.pedidos_demonstracao (email_hash, criado_em);

drop function public.registrar_pedido_demonstracao(text, text, text, text, text, text, text);

-- Devolve 'ok' (gravou), 'descartado' (e-mail passou de 3 em 24 h ou IP passou de
-- 5 em 1 h: o servidor responde como se tivesse gravado) ou 'teto' (200 por dia
-- no total: o servidor responde erro genérico). Travas por transação deixam a
-- contagem e a gravação atômicas por e-mail e por IP.
create or replace function public.registrar_pedido_demonstracao(
  p_nome text, p_cargo text, p_orgao text, p_email text, p_email_hash text, p_ip_hash text,
  p_telefone text, p_mensagem text
) returns text
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext(p_email_hash));
  if p_ip_hash is not null then
    perform pg_advisory_xact_lock(hashtext('ip:' || p_ip_hash));
  end if;
  if (select count(*) from public.pedidos_demonstracao where criado_em > now() - interval '24 hours') >= 200 then
    return 'teto';
  end if;
  if (select count(*) from public.pedidos_demonstracao where email_hash = p_email_hash and criado_em > now() - interval '24 hours') >= 3
     or (p_ip_hash is not null
         and (select count(*) from public.pedidos_demonstracao where ip_hash = p_ip_hash and criado_em > now() - interval '1 hour') >= 5) then
    return 'descartado';
  end if;
  insert into public.pedidos_demonstracao (nome, cargo, orgao, email, email_hash, ip_hash, telefone, mensagem)
  values (p_nome, nullif(p_cargo, ''), p_orgao, p_email, p_email_hash, p_ip_hash, nullif(p_telefone, ''), nullif(p_mensagem, ''));
  return 'ok';
end $$;
revoke execute on function public.registrar_pedido_demonstracao(text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.registrar_pedido_demonstracao(text, text, text, text, text, text, text, text) to service_role;

-- Guarda: pedido de demonstração é apagado depois de 12 meses. Devolve quantos.
create or replace function public.limpar_pedidos_demonstracao()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_n integer;
begin
  delete from public.pedidos_demonstracao where criado_em < now() - interval '12 months';
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke execute on function public.limpar_pedidos_demonstracao() from public, anon, authenticated;
grant execute on function public.limpar_pedidos_demonstracao() to service_role;

-- aceites.prefeitura_id sem chave estrangeira: entra "not valid" (não trava a
-- migração por linha antiga) e valida em seguida.
alter table public.aceites
  add constraint aceites_prefeitura_id_fkey foreign key (prefeitura_id) references public.prefeituras (id) not valid;
alter table public.aceites validate constraint aceites_prefeitura_id_fkey;
