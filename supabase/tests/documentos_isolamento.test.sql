-- Fase 3 · Documentos. Prova os critérios 1, 2, 5 e 6 de docs/fases/fase-3.md:
--   1. ninguém lê, inclui nem altera documento ou arquivo de outra prefeitura;
--   2. ninguém lê nem grava documento de secretaria sem vínculo; papéis;
--   5. ocupação da caixa só devolve números; "próxima livre"; caixa
--      desativada não recebe documento; caixa com documento não se desativa;
--   6. auditoria por gatilho.
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
  ('a2000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Obras'),
  ('b1000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Saúde');

insert into auth.users (id, email) values
  ('0a000000-0000-0000-0000-000000000001', 'admin.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000002', 'coord.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000003', 'operador.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000004', 'consulta.a@exemplo.test'),
  ('0b000000-0000-0000-0000-000000000001', 'admin.b@exemplo.test'),
  ('0e000000-0000-0000-0000-000000000001', 'equipe@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000002', '0a000000-0000-0000-0000-000000000002'),
  ('5a000000-0000-0000-0000-000000000003', '0a000000-0000-0000-0000-000000000003'),
  ('5a000000-0000-0000-0000-000000000004', '0a000000-0000-0000-0000-000000000004'),
  ('5b000000-0000-0000-0000-000000000001', '0b000000-0000-0000-0000-000000000001'),
  ('5e000000-0000-0000-0000-000000000001', '0e000000-0000-0000-0000-000000000001');
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin A', true, false),
  ('0a000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Coord A', false, false),
  ('0a000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Operador A', false, false),
  ('0a000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Consulta A', false, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Admin B', true, false);
-- Coordenador na Saúde; operador e consulta só em Obras.
insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000000', 'coordenador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000000', 'operador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000000', 'consulta');
insert into public.equipe_liccont (usuario_id) values ('0e000000-0000-0000-0000-000000000001');

-- Estrutura: A tem Rua A > M1 > N1 (capacidade 2) com 2 caixas; B tem uma caixa.
insert into public.galpoes (id, prefeitura_id, nome) values
  ('c0a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Galpão A'),
  ('c0b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Galpão B');
insert into public.ruas (id, prefeitura_id, galpao_id, codigo) values
  ('c1a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'A'),
  ('c1b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c0b00000-0000-0000-0000-000000000000', 'A');
insert into public.modulos (id, prefeitura_id, rua_id, numero) values
  ('c2a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c1a00000-0000-0000-0000-000000000000', 1),
  ('c2b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c1b00000-0000-0000-0000-000000000000', 1);
insert into public.niveis (id, prefeitura_id, modulo_id, numero, capacidade) values
  ('c3a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c2a00000-0000-0000-0000-000000000000', 1, 2),
  ('c3b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c2b00000-0000-0000-0000-000000000000', 1, 2);
insert into public.caixas (id, prefeitura_id, nivel_id, numero, capacidade_documentos) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1, 1),
  ('c4a00000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 2, 5),
  ('c4b00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 1, 5);

-- Documentos: um da Saúde (A), um de Obras (A), um da B. Como dono do banco.
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, empresa, situacao) values
  ('d0a10000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'pregao_eletronico', '015/2023', 2023, 'Aquisição de equipamentos médico-hospitalares', 'TecnoMed Fictícia', 'concluida'),
  ('d0a20000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000002', 'licitacao', 'concorrencia', '003/2022', 2022, 'Pavimentação de vias', 'Construtora Fictícia', 'concluida'),
  ('d0b10000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001', 'licitacao', 'dispensa', '001/2024', 2024, 'Material de escritório', null, 'concluida');
insert into public.arquivos (id, prefeitura_id, secretaria_id, documento_id, nome_original, tamanho, enviado_por) values
  ('f0a10000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'd0a10000-0000-0000-0000-000000000000', 'a.pdf', 1000, '0a000000-0000-0000-0000-000000000001'),
  ('f0b10000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'd0b10000-0000-0000-0000-000000000000', 'b.pdf', 1000, '0b000000-0000-0000-0000-000000000001');

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Privilégios
-- ---------------------------------------------------------------------------
select table_privs_are('public', t, 'anon', array[]::text[], 'anon sem privilégio em ' || t)
from unnest(array['documentos', 'arquivos']) as t;
select table_privs_are('public', t, 'service_role', array[]::text[], 'service_role sem privilégio em ' || t)
from unnest(array['documentos', 'arquivos']) as t;
select table_privs_are('public', t, 'authenticated', array['SELECT'], 'authenticated só lê a tabela inteira de ' || t)
from unnest(array['documentos', 'arquivos']) as t;
select ok(not has_column_privilege('authenticated', 'public.documentos', 'secretaria_id', 'update'), 'documento não muda de secretaria');
select ok(not has_column_privilege('authenticated', 'public.documentos', 'prefeitura_id', 'update'), 'documento não muda de prefeitura');
select ok(not has_column_privilege('authenticated', 'public.documentos', 'texto_busca', 'update'), 'texto_busca é gerado');
select ok(not has_column_privilege('authenticated', 'public.arquivos', 'sha256', 'update'), 'hash do arquivo só pela conferência');
select ok(not has_column_privilege('authenticated', 'public.arquivos', 'situacao', 'update'), 'situação do arquivo só pela conferência');
select ok(not has_column_privilege('authenticated', 'public.arquivos', 'caminho', 'insert'), 'caminho do arquivo é do banco');
select ok(not has_function_privilege('anon', 'public.ocupacao_caixas(uuid[])', 'execute'), 'anon não vê ocupação');
select ok(not has_function_privilege('anon', 'public.proxima_caixa_livre(uuid, uuid, uuid)', 'execute'), 'anon não pede próxima caixa');
select ok(not has_function_privilege('anon', 'public.concluir_conferencia(uuid, uuid, boolean, text, bigint, int, text, text[], boolean)', 'execute'), 'anon não conclui conferência');

-- A chave composta amarra o arquivo ao documento, prefeitura e secretaria (mesmo como dono).
select throws_ok($$insert into public.arquivos (prefeitura_id, secretaria_id, documento_id, nome_original, tamanho, enviado_por)
  values ('11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'd0a10000-0000-0000-0000-000000000000', 'x.pdf', 10, '0a000000-0000-0000-0000-000000000001')$$,
  '23503', null, 'arquivo não aponta para documento de outra secretaria');
select throws_ok($$insert into public.arquivos (prefeitura_id, secretaria_id, documento_id, nome_original, tamanho, enviado_por)
  values ('22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'd0a10000-0000-0000-0000-000000000000', 'x.pdf', 10, '0a000000-0000-0000-0000-000000000001')$$,
  '23503', null, 'arquivo não aponta para documento de outra prefeitura');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, situacao)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001', 'licitacao', 'dispensa', '9/2024', 2024, 'Objeto qualquer', 'concluida')$$,
  '23503', null, 'documento não entra em caixa de outra prefeitura (nem como dono)');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, numero, ano, objeto, situacao)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000002', 'licitacao', '9/2024', 2024, 'Objeto qualquer', 'concluida')$$,
  '23514', null, 'licitação exige modalidade');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, numero, ano, objeto, situacao)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000002', 'contrato', '9/2024', 2024, 'Objeto qualquer', 'concluida')$$,
  '23514', null, 'situação de licitação não vale em contrato');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, situacao)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000002', 'licitacao', 'pregao_eletronico', '015/2023', 2023, 'Mesmo processo', 'concluida')$$,
  '23505', null, 'o mesmo processo não entra duas vezes');
select is(app.sem_acento('Pregão Eletrônico 015/2023 Ação'), 'pregao eletronico 015/2023 acao', 'sem_acento tira acento e põe minúsculas');

-- ---------------------------------------------------------------------------
-- Consulta A (só Obras): lê só Obras, não escreve
-- ---------------------------------------------------------------------------
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select results_eq('select numero from public.documentos', array['003/2022'], 'consulta A lê só os documentos de Obras');
select is_empty('select 1 from public.arquivos', 'consulta A não lê arquivo da Saúde nem da B');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, situacao)
  values ('11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000002', 'licitacao', 'convite', '7/2020', 2020, 'Objeto qualquer', 'concluida')$$,
  '42501', null, 'consulta A não cadastra');
select is_empty($$update public.documentos set objeto = 'Alterado' returning id$$, 'consulta A não altera');
select throws_ok($$delete from public.documentos$$, '42501', null, 'consulta A não apaga');

-- ---------------------------------------------------------------------------
-- Operador A (só Obras)
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select results_eq('select numero from public.documentos', array['003/2022'], 'operador A não lê a Saúde');
select lives_ok($$insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, situacao)
  values ('11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000002', 'licitacao', 'convite', '7/2020', 2020, 'Reforma de escola', 'concluida')$$,
  'operador A cadastra em Obras');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, situacao)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000002', 'licitacao', 'convite', '8/2020', 2020, 'Objeto da Saúde', 'concluida')$$,
  '42501', null, 'operador A não grava documento com secretaria da Saúde');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, situacao)
  values ('11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001', 'licitacao', 'convite', '9/2020', 2020, 'Objeto qualquer', 'concluida')$$,
  '42501', null, 'caixa da B: mesmo erro de caixa que não existe');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, situacao)
  values ('11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-0000000000ff', 'licitacao', 'convite', '9/2020', 2020, 'Objeto qualquer', 'concluida')$$,
  '42501', null, 'caixa inexistente: o mesmo erro');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, situacao)
  values ('22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001', 'licitacao', 'convite', '9/2020', 2020, 'Objeto qualquer', 'concluida')$$,
  '42501', null, 'operador A não cadastra na prefeitura B');
select is_empty($$update public.documentos set objeto = 'Invasão' where id in ('d0a10000-0000-0000-0000-000000000000', 'd0b10000-0000-0000-0000-000000000000') returning id$$,
  'operador A não altera documento da Saúde nem da B');
select isnt_empty($$update public.documentos set objeto = 'Pavimentação de vias urbanas' where id = 'd0a20000-0000-0000-0000-000000000000' returning id$$,
  'operador A edita documento de Obras');
select throws_ok($$update public.documentos set conferido_em = now() where id = 'd0a20000-0000-0000-0000-000000000000'$$,
  '42501', null, 'operador A não marca como conferido');
select throws_ok($$update public.documentos set ativo = false where id = 'd0a20000-0000-0000-0000-000000000000'$$,
  '42501', null, 'operador A não desativa');
select throws_ok($$update public.documentos set secretaria_id = 'a1000000-0000-0000-0000-000000000000' where id = 'd0a20000-0000-0000-0000-000000000000'$$,
  '42501', null, 'operador A não troca a secretaria do documento');
select lives_ok($$insert into public.arquivos (prefeitura_id, secretaria_id, documento_id, nome_original, tamanho)
  values ('11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'd0a20000-0000-0000-0000-000000000000', 'obras.pdf', 5000)$$,
  'operador A anexa PDF em Obras');
select results_eq($$select situacao, ativo, caminho like '11111111-1111-1111-1111-111111111111/a2000000-0000-0000-0000-000000000000/%.pdf' from public.arquivos$$,
  $$values ('enviando', false, true)$$, 'arquivo novo nasce "enviando", inativo, com caminho do banco');
select throws_ok($$insert into public.arquivos (prefeitura_id, secretaria_id, documento_id, nome_original, tamanho)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'd0a10000-0000-0000-0000-000000000000', 'x.pdf', 10)$$,
  '42501', null, 'operador A não anexa na Saúde');
select throws_ok($$update public.arquivos set situacao = 'pronto'$$, '42501', null, 'ninguém muda a situação do arquivo direto');
select lives_ok($$select public.marcar_conferindo((select id from public.arquivos limit 1))$$, 'o próprio operador marca "conferindo"');
select throws_ok($$select public.concluir_conferencia('0a000000-0000-0000-0000-000000000003', (select id from public.arquivos limit 1), true,
  repeat('a', 64), 5000, 12, null, '{}', false)$$, '42501', null, 'o operador não conclui a conferência direto (só o servidor)');
-- O servidor (service_role) conclui depois de ler o PDF.
reset role;
set local role service_role;
select lives_ok($$select public.concluir_conferencia('0a000000-0000-0000-0000-000000000003', (select id from public.arquivos where situacao = 'conferindo'), true,
  repeat('a', 64), 5000, 12, null, array['sem_pdfa'], true)$$, 'o servidor conclui a conferência');
select throws_ok($$select public.concluir_conferencia('0a000000-0000-0000-0000-000000000003', (select id from public.arquivos where situacao = 'pronto' limit 1), true,
  repeat('a', 64), 5000, 12, null, '{}', false)$$, '42501', null, 'não conclui duas vezes');
reset role;
set local role authenticated;
select results_eq($$select situacao, ativo, paginas from public.arquivos$$, $$values ('pronto'::text, true, 12)$$,
  'arquivo conferido fica pronto e ativo');

select throws_ok($$select * from public.limpar_envios('0a000000-0000-0000-0000-000000000003')$$, '42501', null, 'o operador não limpa envios direto');
reset role;
set local role service_role;
select is_empty($$select * from public.limpar_envios('0b000000-0000-0000-0000-000000000001')$$, 'envio recente não é limpo');
reset role;
update public.arquivos set enviado_em = now() - interval '2 hours' where id = 'f0b10000-0000-0000-0000-000000000000';
set local role service_role;
select results_eq($$select count(*)::int from public.limpar_envios('0b000000-0000-0000-0000-000000000001')$$, array[1], 'envio parado há 2 horas é limpo');
select is_empty($$select * from public.limpar_envios('0b000000-0000-0000-0000-000000000001')$$, 'e só uma vez');
reset role;
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Ocupação e "próxima livre": só números, contando todas as secretarias
-- ---------------------------------------------------------------------------
select results_eq($$select documentos from public.ocupacao_caixas(array['c4a00000-0000-0000-0000-000000000001']::uuid[])$$,
  array[1], 'ocupação conta o documento da Saúde, que o operador de Obras não lê');
select results_eq($$select count(*)::int from public.ocupacao_caixas(array['c4b00000-0000-0000-0000-000000000001']::uuid[])$$,
  array[0], 'ocupação não devolve caixa de outra prefeitura');
select is(public.proxima_caixa_livre(p_nivel => 'c3a00000-0000-0000-0000-000000000000'), 'c4a00000-0000-0000-0000-000000000002'::uuid,
  'próxima livre pula a caixa 1 (cheia) e devolve a 2');
select is(public.proxima_caixa_livre(p_nivel => 'c3b00000-0000-0000-0000-000000000000'), null::uuid,
  'próxima livre não olha nível de outra prefeitura');

-- ---------------------------------------------------------------------------
-- Coordenador A (Saúde): confere, desativa; caixa com documento não desativa
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select results_eq('select numero from public.documentos', array['015/2023'], 'coordenador A lê só a Saúde');
select lives_ok($$update public.documentos set conferido_em = now() where id = 'd0a10000-0000-0000-0000-000000000000'$$,
  'coordenador A confere documento da Saúde');
select results_eq($$select conferido_por from public.documentos$$, array['0a000000-0000-0000-0000-000000000002'::uuid],
  'quem conferiu é registrado pelo banco');
select throws_ok($$update public.caixas set ativo = false where id = 'c4a00000-0000-0000-0000-000000000002'$$,
  'LC005', null, 'caixa com documento ativo não é desativada, mesmo o documento sendo de outra secretaria');
select lives_ok($$update public.documentos set ativo = false where id = 'd0a10000-0000-0000-0000-000000000000'$$,
  'coordenador A desativa documento da Saúde');
select lives_ok($$update public.caixas set ativo = false where id = 'c4a00000-0000-0000-0000-000000000001'$$,
  'sem documento ativo a caixa se desativa');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, situacao)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'convite', '1/2021', 2021, 'Objeto qualquer', 'concluida')$$,
  'LC004', null, 'caixa desativada não recebe documento');

-- ---------------------------------------------------------------------------
-- Administrador A (aal2) lê tudo da A; sem segundo fator não lê nada
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select results_eq('select count(*)::int from public.documentos', array[3], 'administrador A lê todas as secretarias da A');
select is_empty($$select 1 from public.documentos where prefeitura_id = '22222222-2222-2222-2222-222222222222'$$, 'administrador A não lê a B');
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal1');
select is_empty('select 1 from public.documentos', 'administrador sem segundo fator não lê');

-- Administrador B e equipe não leem a A.
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select results_eq('select numero from public.documentos', array['001/2024'], 'administrador B vê só os próprios documentos');
select results_eq($$select count(*)::int from public.ocupacao_caixas(array['c4a00000-0000-0000-0000-000000000002']::uuid[])$$,
  array[0], 'administrador B não vê ocupação da A');
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select is_empty('select 1 from public.documentos', 'equipe não lê documentos');
select is_empty('select 1 from public.arquivos', 'equipe não lê arquivos');

-- Auditoria (como dono).
reset role;
select isnt_empty($$select 1 from public.auditoria where acao = 'documentos.insert'$$, 'inclusão de documento entra na auditoria');
select isnt_empty($$select 1 from public.auditoria where acao = 'documentos.update'$$, 'alteração de documento entra na auditoria');
select isnt_empty($$select 1 from public.auditoria where acao = 'arquivos.insert'$$, 'inclusão de arquivo entra na auditoria');
select isnt_empty($$select 1 from public.auditoria where acao = 'arquivos.update'$$, 'conferência do arquivo entra na auditoria');
select is_empty($$select 1 from public.auditoria where alvo_tabela = 'arquivos' and (antes::text like '%nome_original%' or depois::text like '%nome_original%')$$,
  'auditoria não guarda o nome do arquivo');
select is_empty($$select 1 from public.auditoria where alvo_tabela = 'documentos' and depois::text like '%texto_busca%'$$,
  'auditoria não guarda o texto de busca');

select * from finish();
rollback;
