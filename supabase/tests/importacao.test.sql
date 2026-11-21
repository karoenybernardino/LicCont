-- Fase 9 · 9.1 · Importação: isolamento e permissões.
--   1. outra prefeitura não lê, grava nem desfaz lote;
--   2. só administrador cria, grava e desfaz; operador não;
--   3. linha repetida é pulada, nunca sobrescrita;
--   4. documento importado fica sem caixa; manual sem caixa é recusado;
--   5. desfazer só desativa o que ainda está sem endereço;
--   6. auditoria com contagens; anon sem privilégio.
-- Tudo fictício e dentro da transação (ROLLBACK no fim).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
update app.configuracao set segundo_fator_obrigatorio = true;

insert into public.prefeituras (id, nome, cnpj, status) values
  ('11111111-1111-1111-1111-111111111111', 'Prefeitura Fictícia A', '00000000000191', 'ativa'),
  ('22222222-2222-2222-2222-222222222222', 'Prefeitura Fictícia B', '00000000000272', 'ativa');
insert into public.secretarias (id, prefeitura_id, nome) values
  ('a1000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Saúde'),
  ('b1000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Saúde');
insert into auth.users (id, email) values
  ('0a000000-0000-0000-0000-000000000001', 'admin.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000003', 'operador.a@exemplo.test'),
  ('0b000000-0000-0000-0000-000000000001', 'admin.b@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000003', '0a000000-0000-0000-0000-000000000003'),
  ('5b000000-0000-0000-0000-000000000001', '0b000000-0000-0000-0000-000000000001');
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin A', true, false),
  ('0a000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Operador A', false, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Admin B', true, false);
insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000000', 'operador');

insert into public.galpoes (id, prefeitura_id, nome) values ('c0a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Galpão A');
insert into public.ruas (id, prefeitura_id, galpao_id, codigo) values ('c1a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'A');
insert into public.modulos (id, prefeitura_id, rua_id, numero) values ('c2a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c1a00000-0000-0000-0000-000000000000', 1);
insert into public.niveis (id, prefeitura_id, modulo_id, numero, capacidade) values ('c3a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c2a00000-0000-0000-0000-000000000000', 1, 3);
insert into public.caixas (id, prefeitura_id, nivel_id, numero, capacidade_documentos) values ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1, 5);

-- Documento manual já existente (prova que a repetida é pulada).
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto) values
  ('d0a10000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'pregao_eletronico', '015/2023', 2023, 'Equipamentos fictícios');

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- Administrador A
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
create temp table lote_a as select public.criar_lote_importacao('acervo-ficticio.xlsx', 3) as id;
grant select on lote_a to authenticated;
select ok((select id from lote_a) is not null, 'administrador cria lote');

select results_eq(
  $$select (public.gravar_lote_importacao((select id from lote_a), '[
    {"secretaria_id":"a1000000-0000-0000-0000-000000000000","tipo":"licitacao","modalidade":"pregao_eletronico","numero":"015/2023","ano":2023,"objeto":"Repetida fictícia"},
    {"secretaria_id":"a1000000-0000-0000-0000-000000000000","tipo":"licitacao","modalidade":"dispensa","numero":"001/2024","ano":2024,"objeto":"Nova fictícia"},
    {"secretaria_id":"a1000000-0000-0000-0000-000000000000","tipo":"contrato","numero":"010/2024","ano":2024,"objeto":"Contrato fictício"}
  ]'::jsonb) ->> 'gravados')::int$$,
  array[2], 'grava 2 linhas novas');
select results_eq($$select pulados from public.lotes_importacao where id = (select id from lote_a)$$, array[1], 'repetida é pulada');
select results_eq($$select objeto from public.documentos where id = 'd0a10000-0000-0000-0000-000000000000'$$,
  array['Equipamentos fictícios'], 'repetida não sobrescreve o documento existente');
select results_eq($$select count(*)::int from public.documentos where lote_id = (select id from lote_a) and caixa_id is null and origem = 'planilha'$$,
  array[2], 'importados ficam sem caixa e com origem planilha');
select throws_ok($$select public.gravar_lote_importacao((select id from lote_a), '[]'::jsonb)$$, '23514', null, 'lote não grava duas vezes');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, tipo, modalidade, numero, ano, objeto, orgao)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'licitacao', 'dispensa', '009/2024', 2024, 'Sem caixa', 'prefeitura')$$,
  '23514', null, 'documento manual sem caixa é recusado');
select throws_ok($$update public.documentos set caixa_id = null where id = 'd0a10000-0000-0000-0000-000000000000'$$,
  '23514', null, 'documento com caixa não volta a ficar sem');

-- Pesquisa: filtro Origem e documentos sem endereço aparecem na lista.
select results_eq($$select (public.pesquisar_documentos(p_origem => 'planilha') ->> 'total')::int$$, array[2], 'pesquisa filtra por origem planilha');
select results_eq($$select (public.pesquisar_documentos(p_origem => 'manual') ->> 'total')::int$$, array[1], 'pesquisa filtra por origem manual');
select results_eq($$select (public.pesquisar_documentos() ->> 'total')::int$$, array[3], 'sem filtro traz todas as origens');
select results_eq($$select count(*)::int from jsonb_array_elements(public.pesquisar_documentos(p_origem => 'planilha') -> 'itens') i
  where i ->> 'codigo' is null and (i ->> 'sem_endereco')::boolean$$, array[2], 'sem endereço sai com código nulo');

-- Localizar um importado (update de caixa) continua valendo.
select lives_ok($$update public.documentos set caixa_id = 'c4a00000-0000-0000-0000-000000000001'
  where lote_id = (select id from lote_a) and numero = '001/2024'$$, 'localiza documento importado');

-- Desfazer: desativa só o que continua sem endereço.
select results_eq($$select public.desfazer_lote_importacao((select id from lote_a))$$, array[1], 'desfaz só o que está sem caixa');
select results_eq($$select count(*)::int from public.documentos where lote_id = (select id from lote_a) and ativo$$, array[1], 'o localizado continua ativo');
select throws_ok($$select public.desfazer_lote_importacao((select id from lote_a))$$, '23514', null, 'lote não desfaz duas vezes');

-- Administrador B: não vê, não grava, não desfaz.
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is_empty($$select 1 from public.lotes_importacao$$, 'B não lê lote de A');
select is_empty($$select 1 from public.documentos where origem = 'planilha'$$, 'B não lê documento importado de A');
select throws_ok($$select public.gravar_lote_importacao((select id from lote_a), '[]'::jsonb)$$, '42501', null, 'B não grava no lote de A');
select throws_ok($$select public.desfazer_lote_importacao((select id from lote_a))$$, '42501', null, 'B não desfaz lote de A');

-- Operador A: não é administrador.
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select throws_ok($$select public.criar_lote_importacao('x.xlsx', 1)$$, '42501', null, 'operador não cria lote');
select is_empty($$select 1 from public.lotes_importacao$$, 'operador não lê lotes');
select throws_ok($$insert into public.lotes_importacao (prefeitura_id, nome_arquivo, linhas_total)
  values ('11111111-1111-1111-1111-111111111111', 'x', 1)$$, '42501', null, 'sem INSERT direto em lotes_importacao');

reset role;
select ok(exists (select 1 from public.auditoria where acao = 'importacao.criar'), 'criação na auditoria');
select ok(exists (select 1 from public.auditoria where acao = 'importacao.gravar' and depois ->> 'gravados' = '2'), 'gravação na auditoria com contagem');
select ok(exists (select 1 from public.auditoria where acao = 'importacao.desfazer'), 'desfazer na auditoria');
select ok(not exists (select 1 from public.auditoria where acao like 'importacao.%' and depois::text like '%fictíci%'),
  'auditoria da importação só com números');
select table_privs_are('public', 'lotes_importacao', 'anon', array[]::text[], 'anon sem privilégio em lotes_importacao');
select table_privs_are('public', 'lotes_importacao', 'authenticated', array['SELECT'], 'authenticated só lê lotes_importacao');
select ok(not has_function_privilege('anon', 'public.gravar_lote_importacao(uuid, jsonb)', 'execute'), 'anon não grava lote');
select ok(not has_function_privilege('anon', 'public.criar_lote_importacao(text, int)', 'execute'), 'anon não cria lote');

select * from finish();
rollback;
