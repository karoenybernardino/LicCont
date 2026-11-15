-- Fase 9 · 9.13 · Visões agregadas do painel (/painel) e dos relatórios.
-- Teste: supabase/tests/painel.test.sql.
--
-- painel_resumo lê só pelo RLS de quem chama (security invoker): cada pessoa vê
-- os números das secretarias a que tem acesso. painel_caixas é a única que
-- cruza secretarias, porque a caixa é da prefeitura e guarda documentos de
-- várias; devolve só números, da prefeitura de quem chama.
-- Só adiciona objetos: compatível com o app que está no ar.

create or replace function public.painel_resumo(p_secretaria uuid default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with d as (
    select x.id, x.tipo, x.ano, x.caixa_id, x.tce_a_conferir,
           exists (select 1 from public.arquivos a where a.documento_id = x.id and a.ativo and a.situacao = 'pronto') as com_pdf
    from public.documentos x
    where x.ativo and (p_secretaria is null or x.secretaria_id = p_secretaria)
  ), por_ano as (
    select ano,
           count(*) filter (where tipo = 'licitacao') as licitacoes,
           count(*) filter (where tipo = 'contrato') as contratos
    from d group by ano
  ), emp as (
    select count(*) as abertos,
           count(*) filter (where e.prazo_em < (now() at time zone 'America/Sao_Paulo')::date) as atrasados,
           max((now() at time zone 'America/Sao_Paulo')::date - e.prazo_em) filter (where e.prazo_em < (now() at time zone 'America/Sao_Paulo')::date) as mais_antigo_dias
    from public.emprestimos e
    where e.devolvido_em is null and (p_secretaria is null or e.secretaria_id = p_secretaria)
  )
  select jsonb_build_object(
    'documentos', jsonb_build_object(
      'total', (select count(*) from d),
      'licitacoes', (select count(*) from d where tipo = 'licitacao'),
      'contratos', (select count(*) from d where tipo = 'contrato'),
      'sem_endereco', (select count(*) from d where caixa_id is null),
      'com_pdf', (select count(*) from d where com_pdf),
      'sem_pdf', (select count(*) from d where not com_pdf)),
    'por_ano', coalesce((select jsonb_agg(jsonb_build_object('ano', ano, 'licitacoes', licitacoes, 'contratos', contratos) order by ano) from por_ano), '[]'::jsonb),
    'tce', jsonb_build_object(
      'a_conferir', (select count(*) from d where tce_a_conferir),
      'duplicados', (select count(*) from public.tce_duplicados where decisao is null)),
    'emprestimos', (select jsonb_build_object('abertos', abertos, 'atrasados', atrasados, 'mais_antigo_dias', mais_antigo_dias) from emp)
  )
$$;

create or replace function public.painel_caixas()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with c as (
    select cx.id, cx.capacidade_documentos as capacidade,
           (select count(*) from public.documentos d where d.caixa_id = cx.id and d.ativo) as ocupados
    from public.caixas cx
    where cx.ativo and cx.prefeitura_id = app.prefeitura_atual()
  )
  select jsonb_build_object(
    'total', count(*),
    'com_documento', count(*) filter (where ocupados > 0),
    'cheias', count(*) filter (where ocupados >= capacidade),
    'com_espaco', count(*) filter (where ocupados > 0 and ocupados < capacidade),
    'vazias', count(*) filter (where ocupados = 0))
  from c
$$;

revoke execute on function public.painel_resumo(uuid) from public, anon;
revoke execute on function public.painel_caixas() from public, anon;
grant execute on function public.painel_resumo(uuid) to authenticated;
grant execute on function public.painel_caixas() to authenticated;
