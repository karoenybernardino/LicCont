-- Fase 9 · tarefa 9.17: Início da equipe e Prefeituras reformulada.
-- 1. Contrato da prefeitura (plano, valores, início). Só a equipe grava.
-- 2. Andamento do pedido de demonstração (situação, data, responsável).
-- 3. equipe_integracoes(): só números, datas e situação do TCE por prefeitura.
-- 4. equipe_auditoria(): ações da equipe e do sistema, sem conteúdo do acervo.
-- Nada daqui lê documento, nome de pessoa ou objeto de processo.

-- ------------------------------------------------------------------ 1
alter table public.prefeituras
  add column plano text not null default 'completo' check (plano in ('completo')),
  add column contrato_inicio date,
  add column valor_implantacao_centavos integer check (valor_implantacao_centavos is null or valor_implantacao_centavos between 0 and 100000000),
  add column valor_mensalidade_centavos integer check (valor_mensalidade_centavos is null or valor_mensalidade_centavos between 0 and 100000000);
-- Mesmas políticas de INSERT/UPDATE (só equipe); só as colunas novas precisam de GRANT.
grant insert (plano, contrato_inicio, valor_implantacao_centavos, valor_mensalidade_centavos),
      update (plano, contrato_inicio, valor_implantacao_centavos, valor_mensalidade_centavos)
  on public.prefeituras to authenticated;

-- ------------------------------------------------------------------ 2
alter table public.pedidos_demonstracao
  add column situacao text not null default 'novo' check (situacao in ('novo', 'contato', 'agendado', 'feito', 'descartado')),
  add column demo_em date,
  add column responsavel text check (responsavel is null or char_length(responsavel) <= 80),
  add column atualizado_em timestamptz;

-- ------------------------------------------------------------------ 3
-- Uma linha por prefeitura: TCE ligado, última rodada (situação e data), novos
-- da última rodada que terminou bem e erros nos últimos 7 dias.
create or replace function public.equipe_integracoes()
returns table (
  prefeitura_id uuid, tce_ativo boolean, situacao text, ultima_em timestamptz,
  novos integer, erros_7d integer
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select app.eh_equipe()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return query
  select p.id, p.tce_ativo, u.situacao, coalesce(u.concluida_em, u.iniciada_em), u.novos,
    (select count(*)::int from public.importacoes_tce e
       where e.prefeitura_id = p.id and e.situacao = 'erro' and e.iniciada_em >= now() - interval '7 days')
  from public.prefeituras p
  left join lateral (
    select i.situacao, i.concluida_em, i.iniciada_em, i.novos from public.importacoes_tce i
    where i.prefeitura_id = p.id order by i.iniciada_em desc limit 1
  ) u on true;
end $$;
revoke execute on function public.equipe_integracoes() from public, anon;
grant execute on function public.equipe_integracoes() to authenticated;

-- ------------------------------------------------------------------ 4
-- Ações da equipe (quem está em equipe_liccont) e do sistema (TCE, pedidos).
-- Devolve o código da ação e a tabela-alvo; o app troca por texto em português.
create or replace function public.equipe_auditoria(
  p_desde timestamptz default null, p_prefeitura uuid default null, p_limite integer default 200
)
returns table (
  id bigint, criado_em timestamptz, usuario_id uuid, acao text, alvo_tabela text,
  status_novo text, prefeitura_id uuid, prefeitura_nome text, ip text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select app.eh_equipe()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return query
  select a.id, a.criado_em, a.usuario_id, a.acao, a.alvo_tabela, a.depois ->> 'status', a.prefeitura_id, p.nome, host(a.ip)
  from public.auditoria a
  left join public.prefeituras p on p.id = a.prefeitura_id
  where (a.usuario_id in (select e.usuario_id from public.equipe_liccont e)
         or a.acao like 'equipe.%' or a.acao like 'tce.%')
    and (p_desde is null or a.criado_em >= p_desde)
    and (p_prefeitura is null or a.prefeitura_id = p_prefeitura)
  order by a.criado_em desc, a.id desc
  limit least(greatest(coalesce(p_limite, 200), 1), 1000);
end $$;
revoke execute on function public.equipe_auditoria(timestamptz, uuid, integer) from public, anon;
grant execute on function public.equipe_auditoria(timestamptz, uuid, integer) to authenticated;
