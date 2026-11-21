-- Fase 7 · Temporalidade e descarte: isolamento, permissões e a regra de pronto.
--   1. classes_documentais: outra prefeitura não lê nem escreve; só administrador grava (pela função);
--   2. descartes e descarte_itens: só leitura pela Data API; outra prefeitura não lê;
--   3. documento fora do prazo, de guarda permanente, sem classe, de outra secretaria
--      ou já em outro termo é recusado;
--   4. eliminar exige edital + 45 dias + administrador diferente de quem gerou;
--   5. nada é apagado: documentos, termos e itens não têm DELETE; termo aprovado não muda.
-- Tudo fictício e dentro da transação (ROLLBACK no fim).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
update app.configuracao set segundo_fator_obrigatorio = true;

-- ---------------------------------------------------------------------------
-- Dados fictícios (como postgres)
-- ---------------------------------------------------------------------------
insert into public.prefeituras (id, nome, cnpj, status) values
  ('11111111-1111-1111-1111-111111111111', 'Prefeitura Fictícia A', '00000000000191', 'ativa'),
  ('22222222-2222-2222-2222-222222222222', 'Prefeitura Fictícia B', '00000000000272', 'ativa');

insert into public.secretarias (id, prefeitura_id, nome) values
  ('a1000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Saúde'),
  ('a2000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Obras'),
  ('b1000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Saúde');

insert into auth.users (id, email) values
  ('0a000000-0000-0000-0000-000000000001', 'admin1.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000002', 'coord.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000004', 'consulta.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000005', 'admin2.a@exemplo.test'),
  ('0b000000-0000-0000-0000-000000000001', 'admin.b@exemplo.test');

insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000002', '0a000000-0000-0000-0000-000000000002'),
  ('5a000000-0000-0000-0000-000000000004', '0a000000-0000-0000-0000-000000000004'),
  ('5a000000-0000-0000-0000-000000000005', '0a000000-0000-0000-0000-000000000005'),
  ('5b000000-0000-0000-0000-000000000001', '0b000000-0000-0000-0000-000000000001');

insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin 1 A', true, false),
  ('0a000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Coord A', false, false),
  ('0a000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Consulta A', false, false),
  ('0a000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Admin 2 A', true, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Admin B', true, false);

-- Coordenador só em Saúde; consulta só em Obras.
insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000000', 'coordenador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000000', 'consulta');

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
  ('c3a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c2a00000-0000-0000-0000-000000000000', 1, 20),
  ('c3b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c2b00000-0000-0000-0000-000000000000', 1, 20);
insert into public.caixas (id, prefeitura_id, nivel_id, numero) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1),
  ('c4b00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 1);

-- Documentos fictícios. O prazo conta do FIM DO ANO do documento (ano + guarda + 1 = primeiro dia liberado).
--   d1 contrato de 2005 (apto)            d2 contrato do ano atual (prazo não cumprido)
--   d3 licitação de regra permanente      d4 dispensa vencida (apta)
--   d5 contrato sem classe           d6 contrato vencido de Obras (outra secretaria)
--   d7 contrato vencido da prefeitura B   d8 e d9 contratos vencidos (aptos), para o termo do administrador
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto) values
  ('d1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '001', 2005, 'Objeto fictício um'),
  ('d1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '002', extract(year from app.hoje())::int, 'Objeto fictício dois'),
  ('d1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'concorrencia', '003', 2000, 'Objeto fictício três'),
  ('d1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'dispensa', '004', 2000, 'Objeto fictício quatro'),
  ('d1000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '005', 2005, 'Objeto fictício cinco'),
  ('d1000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '006', 2005, 'Objeto fictício seis'),
  ('d1000000-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001', 'contrato', null, '007', 2005, 'Objeto fictício sete'),
  ('d1000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '008', 2005, 'Objeto fictício oito'),
  ('d1000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '009', 2005, 'Objeto fictício nove'),
  ('d1000000-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '010', extract(year from app.hoje())::int - 6, 'Objeto fictício dez'),
  ('d1000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '011', extract(year from app.hoje())::int - 5, 'Objeto fictício onze');

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 1. classes_documentais
-- ---------------------------------------------------------------------------
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select throws_ok($$select public.classes_salvar('11111111-1111-1111-1111-111111111111', '[{"codigo":"CT","nome":"Contratos","grupo":"Licitações e Contratos"}]'::jsonb)$$,
  '42501', null, 'consulta não cria classe');
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select throws_ok($$select public.classes_salvar('11111111-1111-1111-1111-111111111111', '[{"codigo":"CT","nome":"Contratos","grupo":"Licitações e Contratos"}]'::jsonb)$$,
  '42501', null, 'coordenador não cria classe');

select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$select public.classes_salvar('11111111-1111-1111-1111-111111111111', '[
  {"codigo":"CT","nome":"Contratos","grupo":"Licitações e Contratos","prazo_corrente":2,"prazo_intermediaria":3,"tipo_prazo":"fixo","destinacao":"eliminacao"},
  {"codigo":"LP","nome":"Licitações permanentes","grupo":"Licitações e Contratos","tipo_prazo":"permanente","destinacao":"guarda_permanente"},
  {"codigo":"DI","nome":"Dispensas","grupo":"Licitações e Contratos","prazo_corrente":1,"prazo_intermediaria":1,"tipo_prazo":"fixo","destinacao":"eliminacao"}]'::jsonb)$$,
  'administrador cria as classes');
select lives_ok($$select public.classes_salvar('11111111-1111-1111-1111-111111111111', '[{"codigo":"CT","nome":"Contratos","grupo":"Licitações e Contratos","prazo_corrente":2,"prazo_intermediaria":3,"tipo_prazo":"fixo","destinacao":"eliminacao"}]'::jsonb)$$,
  'reenviar o mesmo código atualiza, não duplica');
select results_eq($$select count(*)::int from public.classes_documentais where codigo = 'CT'$$, array[1], 'uma classe por código');
select throws_ok($$select public.classes_salvar('22222222-2222-2222-2222-222222222222', '[{"codigo":"CT","nome":"Contratos","grupo":"Licitações e Contratos"}]'::jsonb)$$,
  '42501', null, 'administrador de A não cria classe em B');
select throws_ok($$select public.classes_salvar('11111111-1111-1111-1111-111111111111', '[{"codigo":"XX","nome":"Sem grupo","grupo":"Inexistente"}]'::jsonb)$$,
  '22023', null, 'grupo desconhecido é recusado');
select throws_ok($$update public.classes_documentais set nome = 'Direto'$$, '42501', null, 'ninguém altera classe direto pela Data API');

select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is_empty($$select 1 from public.classes_documentais$$, 'B não lê classes de A');
select throws_ok($$select public.classes_salvar('11111111-1111-1111-1111-111111111111', '[{"codigo":"ZZ","nome":"Invasão","grupo":"Licitações e Contratos"}]'::jsonb)$$,
  '42501', null, 'B não cria classe em A');

-- Liga os documentos às classes (como postgres, sem sessão de usuário: os gatilhos de documentos conferem o JWT).
reset role;
select set_config('request.jwt.claims', '', true);
update public.documentos set classe_id = (select id from public.classes_documentais where codigo = 'CT')
  where id in ('d1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002',
               'd1000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000009',
               'd1000000-0000-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000011');
update public.documentos set classe_id = (select id from public.classes_documentais where codigo = 'LP')
  where id = 'd1000000-0000-0000-0000-000000000003';
update public.documentos set classe_id = (select id from public.classes_documentais where codigo = 'DI')
  where id = 'd1000000-0000-0000-0000-000000000004';
set local role authenticated;
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');

-- ---------------------------------------------------------------------------
-- 2. Criar termo: quem pode e o que pode entrar
-- ---------------------------------------------------------------------------
select throws_ok($$select public.descarte_criar('a1000000-0000-0000-0000-000000000000', array['d1000000-0000-0000-0000-000000000001']::uuid[])$$,
  '42501', null, 'administrador de B não gera termo em A');

select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select throws_ok($$select public.descarte_criar('a2000000-0000-0000-0000-000000000000', array['d1000000-0000-0000-0000-000000000006']::uuid[])$$,
  '42501', null, 'consulta não gera termo');

select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select throws_ok($$select public.descarte_criar('a1000000-0000-0000-0000-000000000000', array['d1000000-0000-0000-0000-000000000002']::uuid[])$$,
  'LD001', null, 'documento com prazo não cumprido é recusado');
select throws_ok($$select public.descarte_criar('a1000000-0000-0000-0000-000000000000', array['d1000000-0000-0000-0000-000000000003']::uuid[])$$,
  'LD001', null, 'documento de guarda permanente é recusado');
select throws_ok($$select public.descarte_criar('a1000000-0000-0000-0000-000000000000', array['d1000000-0000-0000-0000-000000000005']::uuid[])$$,
  'LD001', null, 'documento sem classe é recusado');
select throws_ok($$select public.descarte_criar('a1000000-0000-0000-0000-000000000000', array['d1000000-0000-0000-0000-000000000011']::uuid[])$$,
  'LD001', null, 'ano + guarda de 5 anos chega no ano que vem: ainda não cumprido');
select is((select app.motivo_inelegivel('d1000000-0000-0000-0000-000000000010')), null,
  'ano atual - 6 + 5 anos de guarda = liberado desde 01/01 do ano atual');
select is((select app.motivo_inelegivel('d1000000-0000-0000-0000-000000000011')), 'prazo_nao_cumprido',
  'ano atual - 5 + 5 anos de guarda só libera em 01/01 do ano que vem');
select throws_ok($$select public.descarte_criar('a1000000-0000-0000-0000-000000000000', array['d1000000-0000-0000-0000-000000000006']::uuid[])$$,
  'LD002', null, 'documento de outra secretaria é recusado');
select throws_ok($$select public.descarte_criar('a1000000-0000-0000-0000-000000000000', array['d1000000-0000-0000-0000-000000000007']::uuid[])$$,
  'LD002', null, 'documento de outra prefeitura é recusado');
select throws_ok($$select public.descarte_criar('a1000000-0000-0000-0000-000000000000', array[]::uuid[])$$,
  'LD002', null, 'termo vazio é recusado');
select throws_ok($$select public.descarte_criar('a2000000-0000-0000-0000-000000000000', array['d1000000-0000-0000-0000-000000000006']::uuid[])$$,
  '42501', null, 'coordenador de Saúde não gera termo de Obras');

select lives_ok($$select public.descarte_criar('a1000000-0000-0000-0000-000000000000',
  array['d1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004']::uuid[], 'listagem fictícia')$$,
  'coordenador gera o termo com documentos aptos');
select throws_ok($$select public.descarte_criar('a1000000-0000-0000-0000-000000000000', array['d1000000-0000-0000-0000-000000000001']::uuid[])$$,
  'LD001', null, 'documento já em outro termo é recusado');
select results_eq($$select count(*)::int from public.descarte_itens$$, array[2], 'o termo tem 2 itens');
select results_eq($$select numero::int from public.descartes$$, array[1], 'primeiro termo do ano é o número 1');

-- ---------------------------------------------------------------------------
-- 3. Só leitura pela Data API; outra prefeitura e consulta de Obras não leem
-- ---------------------------------------------------------------------------
select throws_ok($$insert into public.descartes (prefeitura_id, secretaria_id, ano, numero)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 2026, 99)$$, '42501', null, 'ninguém insere termo direto');
select throws_ok($$update public.descartes set situacao = 'aprovado'$$, '42501', null, 'ninguém altera termo direto');
select throws_ok($$delete from public.descartes$$, '42501', null, 'ninguém apaga termo');
select throws_ok($$delete from public.descarte_itens$$, '42501', null, 'ninguém apaga item');
select throws_ok($$delete from public.documentos$$, '42501', null, 'ninguém apaga documento');

select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is_empty($$select 1 from public.descartes$$, 'B não lê termo de A');
select is_empty($$select 1 from public.descarte_itens$$, 'B não lê itens de A');
select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select is_empty($$select 1 from public.descartes$$, 'consulta de Obras não lê termo de Saúde');

-- ---------------------------------------------------------------------------
-- 4. Edital, ciência de 45 dias e aprovação
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select public.descarte_aprovar((select id from public.descartes limit 1))$$,
  'LD003', null, 'não aprova termo sem edital de ciência');
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select throws_ok($$select public.descarte_publicar_edital((select id from public.descartes limit 1), app.hoje() + 1)$$,
  'LD004', null, 'edital com data futura é recusado');
select lives_ok($$select public.descarte_publicar_edital((select id from public.descartes limit 1), app.hoje())$$,
  'coordenador registra a publicação do edital');
select throws_ok($$select public.descarte_aprovar((select id from public.descartes limit 1))$$,
  '42501', null, 'coordenador não aprova');

select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select public.descarte_aprovar((select id from public.descartes limit 1))$$,
  'LD006', null, 'não aprova antes de 45 dias do edital');

-- 50 dias depois (como postgres).
reset role;
update public.descartes set edital_publicado_em = app.hoje() - 50;
set local role authenticated;

select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select throws_ok($$select public.descarte_aprovar((select id from public.descartes limit 1))$$,
  '42501', null, 'consulta não aprova');
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select public.descarte_aprovar('00000000-0000-0000-0000-000000000000')$$,
  '42501', null, 'termo de outra prefeitura não se aprova');

-- Um documento deixa de estar apto (virou permanente) antes da aprovação: nada é eliminado.
reset role;
update public.classes_documentais set tipo_prazo = 'permanente', destinacao = 'guarda_permanente' where codigo = 'DI';
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select public.descarte_aprovar((select id from public.descartes limit 1))$$,
  'LD001', null, 'documento que deixou de ser apto barra a aprovação inteira');
select results_eq($$select count(*)::int from public.documentos where ativo and id in
  ('d1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004')$$, array[2], 'nenhum documento foi desativado');
reset role;
update public.classes_documentais set tipo_prazo = 'fixo', destinacao = 'eliminacao' where codigo = 'DI';
set local role authenticated;

select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$select public.descarte_aprovar((select id from public.descartes limit 1))$$,
  'administrador diferente de quem gerou aprova');
select results_eq($$select count(*)::int from public.documentos where not ativo and id in
  ('d1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004')$$, array[2], 'documentos do termo foram desativados');
select results_eq($$select count(*)::int from public.documentos where id in
  ('d1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004')$$, array[2], 'e continuam registrados (nada foi apagado)');
select results_eq($$select situacao from public.descartes$$, array['aprovado'], 'termo aprovado');
select throws_ok($$select public.descarte_cancelar((select id from public.descartes limit 1))$$,
  'LD009', null, 'termo aprovado não se cancela');
select throws_ok($$update public.documentos set ativo = true where id = 'd1000000-0000-0000-0000-000000000001'$$,
  'LD009', null, 'documento eliminado não volta a ficar ativo');
select throws_ok($$update public.documentos set objeto = 'Outro texto' where id = 'd1000000-0000-0000-0000-000000000001'$$,
  'LD009', null, 'documento eliminado não muda de conteúdo');
select throws_ok($$select public.descarte_criar('a1000000-0000-0000-0000-000000000000', array['d1000000-0000-0000-0000-000000000001']::uuid[])$$,
  'LD001', null, 'documento inativo não entra em termo');
reset role;
select throws_ok($$update public.descartes set observacao = 'mudou'$$, 'LD009', null, 'termo aprovado não muda nem para o dono');
select throws_ok($$delete from public.descartes$$, 'LD009', null, 'termo aprovado não se apaga nem para o dono');
select ok((select count(*) from public.auditoria where alvo_tabela = 'descartes' and acao = 'descartes.update') >= 2,
  'edital e aprovação ficam na auditoria');

-- ---------------------------------------------------------------------------
-- 5. Quem gerou não aprova; cancelar libera os documentos
-- ---------------------------------------------------------------------------
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$select public.descarte_criar('a1000000-0000-0000-0000-000000000000',
  array['d1000000-0000-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000009']::uuid[])$$, 'administrador gera termo');
select lives_ok($$select public.descarte_publicar_edital((select id from public.descartes where numero = 2), app.hoje())$$, 'administrador registra o edital');
reset role;
update public.descartes set edital_publicado_em = app.hoje() - 50 where numero = 2;
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select public.descarte_aprovar((select id from public.descartes where numero = 2))$$,
  'LD005', null, 'quem gerou não aprova o próprio termo');
select tst_entrar('0a000000-0000-0000-0000-000000000005', '5a000000-0000-0000-0000-000000000005', 'aal2');
select lives_ok($$select public.descarte_cancelar((select id from public.descartes where numero = 2))$$, 'administrador cancela o termo');
select results_eq($$select count(*)::int from public.descarte_itens where aberto and descarte_id = (select id from public.descartes where numero = 2)$$,
  array[0], 'cancelar libera os itens');
select lives_ok($$select public.descarte_criar('a1000000-0000-0000-0000-000000000000',
  array['d1000000-0000-0000-0000-000000000008']::uuid[])$$, 'documento liberado entra em novo termo');
select throws_ok($$update public.documentos set ativo = false where id = 'd1000000-0000-0000-0000-000000000008'$$,
  'LD009', null, 'documento de termo aberto não se desativa à mão');
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select public.descarte_publicar_edital((select max(id::text)::uuid from public.descartes), app.hoje())$$,
  '42501', null, 'B não registra edital de termo de A');
select throws_ok($$select public.descarte_cancelar('00000000-0000-0000-0000-000000000000')$$,
  '42501', null, 'B não cancela termo de A');
select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select throws_ok($$select public.descarte_cancelar((select id from public.descartes where numero = 3))$$,
  '42501', null, 'consulta de Obras não cancela termo de Saúde');

-- ---------------------------------------------------------------------------
-- Documento emprestado não entra em termo
-- ---------------------------------------------------------------------------
reset role;
insert into public.emprestimos (prefeitura_id, secretaria_id, documento_id, caixa_id, retirado_por_nome, retirado_por_setor, retirado_em, prazo_em)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'd1000000-0000-0000-0000-000000000009',
          'c4a00000-0000-0000-0000-000000000001', 'Pessoa Fictícia', 'Setor Fictício', app.hoje(), app.hoje() + 10);
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select throws_ok($$select public.descarte_criar('a1000000-0000-0000-0000-000000000000', array['d1000000-0000-0000-0000-000000000009']::uuid[])$$,
  'LD001', null, 'documento emprestado não entra em termo');

-- ---------------------------------------------------------------------------
-- Privilégios
-- ---------------------------------------------------------------------------
reset role;
select table_privs_are('public', 'classes_documentais', 'anon', array[]::text[], 'anon sem privilégio em classes_documentais');
select table_privs_are('public', 'classes_documentais', 'authenticated', array['SELECT'], 'authenticated só lê classes_documentais');
select table_privs_are('public', 'descartes', 'anon', array[]::text[], 'anon sem privilégio em descartes');
select table_privs_are('public', 'descarte_itens', 'anon', array[]::text[], 'anon sem privilégio em descarte_itens');
select table_privs_are('public', 'descartes', 'authenticated', array['SELECT'], 'authenticated só lê descartes');
select table_privs_are('public', 'descarte_itens', 'authenticated', array['SELECT'], 'authenticated só lê descarte_itens');
select ok(not has_table_privilege('authenticated', 'public.classes_documentais', 'delete'), 'ninguém apaga classe direto');
select ok(not has_table_privilege('authenticated', 'public.documentos', 'delete'), 'ninguém apaga documento');
select ok(not has_function_privilege('anon', 'public.descarte_aprovar(uuid)', 'execute'), 'anon não executa descarte_aprovar');
select ok(not has_function_privilege('anon', 'public.descarte_criar(uuid, uuid[], text)', 'execute'), 'anon não executa descarte_criar');

select * from finish();
rollback;
