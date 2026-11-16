-- Medições do teste de carga (depois de carga.sql). Banco LOCAL do CI.
-- Mede como o administrador da prefeitura 1 (25 mil documentos, todas as
-- secretarias), com RLS ligado, do jeito que o app chama.
-- Cada consulta: 1 rodada de aquecimento + 3 medidas com EXPLAIN ANALYZE;
-- vale a mediana de (planejamento + execução).
\pset pager off

select set_config('request.jwt.claims', json_build_object(
  'sub', md5('carga-user-1')::uuid, 'role', 'authenticated',
  'session_id', md5('carga-sessao-1')::uuid, 'aal', 'aal2')::text, false);

create temp table medida (ordem serial, grupo text, consulta text, meta_ms int, ms numeric, linhas bigint);

create function pg_temp.medir(p_grupo text, p_consulta text, p_meta int, p_sql text)
returns void language plpgsql as $$
declare
  v jsonb;
  t numeric[] := '{}';
  n bigint;
begin
  for i in 0..3 loop
    execute 'set role authenticated';
    execute 'explain (analyze, format json) ' || p_sql into v;
    execute 'reset role';
    if i > 0 then
      t := t || ((v -> 0 ->> 'Planning Time')::numeric + (v -> 0 ->> 'Execution Time')::numeric);
    end if;
    n := (v -> 0 -> 'Plan' ->> 'Actual Rows')::bigint;
  end loop;
  insert into medida (grupo, consulta, meta_ms, ms, linhas)
  values (p_grupo, p_consulta, p_meta, (select x from unnest(t) x order by x offset 1 limit 1), n);
end $$;

-- Cursores reais: o da 2ª página e um perto do fim (página ~500 de 50).
set role authenticated;
select (public.pesquisar_documentos() -> 'proximo') as c2 \gset
select criado_em as cfim_criado, id as cfim_id from public.documentos
  order by criado_em desc, id desc offset 24900 limit 1 \gset
select md5('carga-sec-1-1')::uuid as sec1 \gset
reset role;

select pg_temp.medir('busca', 'pesquisar_documentos: "pavimentacao" (acha no objeto)', 1000,
  $$select public.pesquisar_documentos(p_busca := 'pavimentacao')$$);
select pg_temp.medir('busca', 'pesquisar_documentos: "hidrometro" (só no texto do PDF)', 1000,
  $$select public.pesquisar_documentos(p_busca := 'hidrometro')$$);
select pg_temp.medir('busca', 'pesquisar_documentos: "xilografia" (não acha nada)', 1000,
  $$select public.pesquisar_documentos(p_busca := 'xilografia')$$);
select pg_temp.medir('busca', 'pesquisar_documentos: "habilitacao" (palavra comum no PDF)', 1000,
  $$select public.pesquisar_documentos(p_busca := 'habilitacao')$$);
select pg_temp.medir('busca', 'documentos.texto_busca like (direto)', 1000,
  $$select id from public.documentos where ativo and texto_busca like '%pavimentacao%'$$);
select pg_temp.medir('busca', 'arquivo_textos.texto_busca like (direto)', 1000,
  $$select documento_id from public.arquivo_textos where texto_busca like '%hidrometro%'$$);

select pg_temp.medir('busca', 'app.documentos_com_texto (índice GIN)', 1000,
  $$select app.documentos_com_texto('hidrometro')$$);
select pg_temp.medir('listagem', 'pesquisar_documentos: 1ª página', 500,
  $$select public.pesquisar_documentos()$$);
select pg_temp.medir('listagem', 'pesquisar_documentos: 2ª página (cursor)', 500,
  format($$select public.pesquisar_documentos(p_cursor_criado := %L, p_cursor_id := %L)$$,
         (:'c2'::jsonb) ->> 'criado_em', (:'c2'::jsonb) ->> 'id'));
select pg_temp.medir('listagem', 'pesquisar_documentos: página perto do fim (cursor)', 500,
  format($$select public.pesquisar_documentos(p_cursor_criado := %L, p_cursor_id := %L)$$, :'cfim_criado', :'cfim_id'));
select pg_temp.medir('listagem', 'pesquisar_documentos: filtro secretaria + anos', 500,
  format($$select public.pesquisar_documentos(p_secretaria := %L, p_ano_de := 2010, p_ano_ate := 2015)$$, :'sec1'));

select pg_temp.medir('painel', 'painel_resumo (todas as secretarias)', 1000,
  $$select public.painel_resumo()$$);
select pg_temp.medir('painel', 'painel_resumo (uma secretaria)', 1000,
  format($$select public.painel_resumo(%L)$$, :'sec1'));
select pg_temp.medir('painel', 'painel_caixas', 1000,
  $$select public.painel_caixas()$$);

-- Tela de secretarias: uma contagem por secretaria (8). Sem meta própria;
-- comparada com a da listagem.
select pg_temp.medir('contagem', 'contagem por secretaria (as 8)', 500,
  $$select s.id, (select count(*) from public.documentos d where d.secretaria_id = s.id and d.ativo) from public.secretarias s$$);

-- Exportação: o app lê cada tabela em páginas de 1000 ordenadas por id.
select pg_temp.medir('exportacao', 'documentos: 1ª página (offset 0)', null,
  $$select * from public.documentos order by id limit 1000 offset 0$$);
select pg_temp.medir('exportacao', 'documentos: última página (offset 24000)', null,
  $$select * from public.documentos order by id limit 1000 offset 24000$$);

-- Exportação completa da tabela documentos: soma das 25 páginas (1 rodada cada).
do $$
declare
  v jsonb;
  total numeric := 0;
begin
  for p in 0..24 loop
    execute 'set role authenticated';
    execute format('explain (analyze, format json) select * from public.documentos order by id limit 1000 offset %s', p * 1000) into v;
    execute 'reset role';
    total := total + (v -> 0 ->> 'Planning Time')::numeric + (v -> 0 ->> 'Execution Time')::numeric;
  end loop;
  insert into medida (grupo, consulta, meta_ms, ms, linhas) values ('exportacao', 'documentos: as 25 páginas somadas', null, total, 25000);
end $$;

\echo
\echo '== Resultados (ms, mediana de 3; "25 páginas somadas" = 1 rodada) =='
select grupo, consulta, round(ms, 1) as ms, meta_ms,
       case when meta_ms is null then '—' when ms < meta_ms then 'passou' else 'NÃO passou' end as resultado,
       linhas
from medida order by ordem;

\echo '== Tamanho do banco =='
select pg_size_pretty(pg_database_size(current_database())) as banco,
       pg_size_pretty(pg_total_relation_size('public.documentos')) as documentos,
       pg_size_pretty(pg_total_relation_size('public.arquivos')) as arquivos,
       pg_size_pretty(pg_total_relation_size('public.arquivo_textos')) as arquivo_textos_total,
       pg_size_pretty(pg_relation_size('public.arquivo_textos_busca_pref_idx')) as gin_arquivo_textos,
       pg_size_pretty(pg_relation_size('public.documentos_busca_idx')) as gin_documentos,
       pg_size_pretty(pg_total_relation_size('public.auditoria')) as auditoria;
select count(*) as documentos, (select count(*) from public.arquivos) as arquivos,
       (select count(*) from public.arquivo_textos) as textos_ocr,
       (select round(avg(length(texto))) from public.arquivo_textos) as media_caracteres_ocr,
       (select round(avg(paginas_lidas)) from public.arquivo_textos) as media_paginas_ocr,
       (select count(*) from public.caixas) as caixas
from public.documentos;
select version();

\echo '== Planos (EXPLAIN ANALYZE, BUFFERS) =='
set role authenticated;
explain (analyze, buffers) select documento_id from public.arquivo_textos where texto_busca like '%hidrometro%';
explain (analyze, buffers) select documento_id from public.arquivo_textos where texto_busca like '%xilografia%';
-- O que app.documentos_com_texto roda (como dona da tabela, filtro da política escrito).
reset role;
explain (analyze, buffers) select documento_id from public.arquivo_textos
  where prefeitura_id = md5('carga-pref-1')::uuid and texto_busca like '%hidrometro%';
explain (analyze, buffers) select documento_id from public.arquivo_textos
  where prefeitura_id = md5('carga-pref-1')::uuid and texto_busca like '%habilitacao%';
set role authenticated;
explain (analyze, buffers) select id from public.documentos where ativo and texto_busca like '%pavimentacao%';
explain (analyze, buffers) select s.id, (select count(*) from public.documentos d where d.secretaria_id = s.id and d.ativo) from public.secretarias s;
explain (analyze, buffers) select * from public.documentos order by id limit 1000 offset 24000;
reset role;
