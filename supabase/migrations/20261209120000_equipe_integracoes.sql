-- Fase 9 · tarefa 9.19: Integrações da equipe. Só números, datas e situação:
-- nunca nome de arquivo, objeto, CNPJ ou nome de pessoa. Só a equipe com 2º fator.

-- Lotes de importação de todas as prefeituras (mais novos primeiro).
create or replace function public.equipe_lotes(p_limite integer default 50)
returns table (
  id uuid, prefeitura_id uuid, prefeitura_nome text, linhas_total integer, gravados integer,
  pulados integer, situacao text, criado_em timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select app.eh_equipe()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return query
  select l.id, l.prefeitura_id, p.nome, l.linhas_total, l.gravados, l.pulados, l.situacao, l.criado_em
  from public.lotes_importacao l
  join public.prefeituras p on p.id = l.prefeitura_id
  order by l.criado_em desc
  limit least(greatest(coalesce(p_limite, 50), 1), 500);
end $$;
revoke execute on function public.equipe_lotes(integer) from public, anon;
grant execute on function public.equipe_lotes(integer) to authenticated;

-- Histórico das rodadas do TCE (para o CSV da equipe).
create or replace function public.equipe_importacoes_tce(p_limite integer default 500)
returns table (
  prefeitura_id uuid, prefeitura_nome text, origem text, situacao text, novos integer,
  duplicados integer, ja_existentes integer, erro_codigo text, iniciada_em timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select app.eh_equipe()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return query
  select i.prefeitura_id, p.nome, i.origem, i.situacao, i.novos, i.duplicados, i.ja_existentes, i.erro_codigo, i.iniciada_em
  from public.importacoes_tce i
  join public.prefeituras p on p.id = i.prefeitura_id
  order by i.iniciada_em desc
  limit least(greatest(coalesce(p_limite, 500), 1), 5000);
end $$;
revoke execute on function public.equipe_importacoes_tce(integer) from public, anon;
grant execute on function public.equipe_importacoes_tce(integer) to authenticated;

-- O pedido recebido entra na auditoria da equipe (sem nenhum dado de contato).
-- Mesma função da revisão de segurança (8 argumentos), com uma linha a mais.
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
  insert into public.auditoria (acao) values ('equipe.pedido_recebido');
  return 'ok';
end $$;
