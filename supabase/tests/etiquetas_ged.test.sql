-- Etiquetas, classificação e GED: isolamento e regras das tabelas novas.
--   1. grupos e tipologias nascem com o órgão; RH e jurídico restritos; B não lê A;
--   2. permissão por grupo: quem não tem o grupo não vê documento, PDF nem empréstimo;
--   3. classes, impressões, número da caixa por órgão;
--   4. parceiras: só a equipe, por função; logos no Storage;
--   5. documento digitalizado sem ICP-Brasil não entra em eliminação.
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
  ('0a000000-0000-0000-0000-000000000002', 'coord.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000003', 'oper.a@exemplo.test'),
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
  ('0a000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Oper A', false, false),
  ('0a000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Consulta A', false, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Admin B', true, false);
insert into public.equipe_liccont (usuario_id) values ('0e000000-0000-0000-0000-000000000001');
insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000000', 'coordenador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000000', 'operador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000000', 'consulta');

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
  ('c4a00000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 2),
  ('c4b00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 1);

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- Classes: fixa de 5 anos (conta da data do documento) e uma de guarda por evento.
insert into public.classes_documentais (prefeitura_id, grupo_id, codigo, nome, prazo_corrente_anos, tipo_prazo, evento, destinacao)
select g.prefeitura_id, g.id, x.codigo, x.nome, 5, x.tp, x.ev, 'eliminacao'
from public.grupos_documentais g,
     (values ('FX', 'Classe fixa', 'fixo', null), ('EV', 'Classe por evento', 'apos_evento', 'Término do contrato')) as x(codigo, nome, tp, ev)
where g.prefeitura_id = '11111111-1111-1111-1111-111111111111' and g.chave = 'licitacoes_contratos';
insert into public.classes_documentais (prefeitura_id, grupo_id, codigo, nome, prazo_corrente_anos, tipo_prazo, destinacao)
select g.prefeitura_id, g.id, 'RH1', 'Ficha funcional', 5, 'fixo', 'eliminacao'
from public.grupos_documentais g
where g.prefeitura_id = '11111111-1111-1111-1111-111111111111' and g.chave = 'rh';

-- Documentos de A: d1 licitação/contrato (fixa), d2 de RH (tipo outro), d3 por evento sem evento informado.
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, situacao, classe_id, data_producao) values
  ('d1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001',
   'licitacao', 'dispensa', '001', 2005, 'Objeto fictício um', 'concluida',
   (select id from public.classes_documentais where codigo = 'FX'), '2005-03-01'),
  ('d1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001',
   'outro', null, '002', 2005, 'Ficha fictícia de servidor', 'arquivado',
   (select id from public.classes_documentais where codigo = 'RH1'), '2005-03-01'),
  ('d1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001',
   'contrato', null, '003', 2005, 'Objeto fictício três', 'vigente',
   (select id from public.classes_documentais where codigo = 'EV'), null);
insert into public.arquivos (id, prefeitura_id, secretaria_id, documento_id, nome_original, tamanho, enviado_por, situacao, ativo, sha256, paginas, conferido_em)
values ('f1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000',
        'd1000000-0000-0000-0000-000000000002', 'ficha.pdf', 1000, '0a000000-0000-0000-0000-000000000003',
        'pronto', true, repeat('a', 64), 1, now());

-- ---------------------------------------------------------------------------
-- 0. Estrutura (como postgres)
-- ---------------------------------------------------------------------------
select results_eq($$select count(*)::int from public.grupos_documentais where prefeitura_id = '11111111-1111-1111-1111-111111111111'$$,
  array[7], 'órgão novo nasce com os sete grupos');
select results_eq($$select chave from public.grupos_documentais where prefeitura_id = '11111111-1111-1111-1111-111111111111' and restrito order by chave$$,
  array['juridico', 'rh'], 'RH e jurídico nascem restritos');
select results_eq($$select array_agg(sequencial order by sequencial) from public.caixas where prefeitura_id = '11111111-1111-1111-1111-111111111111'$$,
  array[array[1, 2]], 'caixas de A numeradas 1 e 2');
select results_eq($$select sequencial from public.caixas where prefeitura_id = '22222222-2222-2222-2222-222222222222'$$,
  array[1], 'a numeração de B começa de novo');
select results_eq($$select grupo_id = (select id from public.grupos_documentais where prefeitura_id = d.prefeitura_id and chave = 'rh')
  from public.documentos d where id = 'd1000000-0000-0000-0000-000000000002'$$, array[true], 'a classe define o grupo do documento');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, numero, ano, objeto, situacao)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'outro', '9', 2024, 'Sem grupo', 'arquivado')$$,
  '23502', null, 'documento de tipo outro precisa de grupo');
select throws_ok($$insert into public.classes_documentais (prefeitura_id, grupo_id, codigo, nome, tipo_prazo, destinacao)
  select prefeitura_id, id, 'ZZ', 'Incoerente', 'fixo', 'guarda_permanente' from public.grupos_documentais limit 1$$,
  '23514', null, 'prazo fixo não pode ter guarda permanente');

-- ---------------------------------------------------------------------------
-- 1. Isolamento
-- ---------------------------------------------------------------------------
select set_config('tst.rh_a', (select id::text from public.grupos_documentais where prefeitura_id = '11111111-1111-1111-1111-111111111111' and chave = 'rh'), false);
set local role authenticated;
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select results_eq($$select count(*)::int from public.grupos_documentais$$, array[7], 'B lê só os seus sete grupos');
select is_empty($$select 1 from public.tipologias where prefeitura_id = '11111111-1111-1111-1111-111111111111'$$, 'B não lê tipologias de A');
select is_empty($$select 1 from public.classes_documentais where prefeitura_id = '11111111-1111-1111-1111-111111111111'$$, 'B não lê classes de A');
select throws_ok($$insert into public.grupos_documentais (prefeitura_id, nome) values ('11111111-1111-1111-1111-111111111111', 'Invasão')$$,
  '42501', null, 'B não cria grupo em A');
select is_empty($$update public.grupos_documentais set nome = 'x' where prefeitura_id = '11111111-1111-1111-1111-111111111111' returning 1$$, 'B não altera grupo de A');
select throws_ok($$select public.grupo_definir_papeis(current_setting('tst.rh_a')::uuid, array['consulta']::public.papel_vinculo[])$$,
  '42501', null, 'B não define papéis de grupo de A');

-- ---------------------------------------------------------------------------
-- 2. Permissão por grupo (RH restrito)
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select results_eq($$select count(*)::int from public.documentos$$, array[2], 'operador não vê o documento de RH');
select is_empty($$select 1 from public.arquivos$$, 'operador não vê o PDF do documento de RH');
select is_empty($$select 1 from public.grupos_documentais where chave in ('rh', 'juridico')$$, 'operador não vê os grupos restritos');
select throws_ok($$select public.grupo_definir_papeis((select id from public.grupos_documentais where chave = 'rh'), array['operador']::public.papel_vinculo[])$$,
  '42501', null, 'operador não libera grupo');

select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select results_eq($$select count(*)::int from public.documentos$$, array[3], 'administrador vê o documento de RH');
select lives_ok($$select public.grupo_definir_papeis((select id from public.grupos_documentais where chave = 'rh'), array['coordenador']::public.papel_vinculo[])$$,
  'administrador libera RH para coordenadores');
select lives_ok($$insert into public.grupos_documentais (prefeitura_id, nome, restrito) values ('11111111-1111-1111-1111-111111111111', 'Convênios', false)$$,
  'administrador cadastra um grupo novo');
select lives_ok($$insert into public.tipologias (prefeitura_id, grupo_id, nome)
  select prefeitura_id, id, 'Termo de convênio' from public.grupos_documentais where nome = 'Convênios'$$, 'e uma tipologia nele');

select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select results_eq($$select count(*)::int from public.documentos$$, array[3], 'coordenador liberado vê o documento de RH');
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select results_eq($$select count(*)::int from public.documentos$$, array[2], 'operador continua sem ver');
select throws_ok($$update public.documentos set grupo_id = (select id from public.grupos_documentais where chave = 'rh') where id = 'd1000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'grupo só muda pela classe, nunca direto');

-- ---------------------------------------------------------------------------
-- 3. Impressões
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select throws_ok($$select public.registrar_impressoes('[{"tipo":"caixa","id":"c4a00000-0000-0000-0000-000000000001"}]'::jsonb)$$,
  '42501', null, 'consulta não registra impressão');
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select results_eq($$select public.registrar_impressoes('[
  {"tipo":"caixa","id":"c4a00000-0000-0000-0000-000000000001"},
  {"tipo":"conteudo","id":"c4a00000-0000-0000-0000-000000000001"},
  {"tipo":"documento","id":"d1000000-0000-0000-0000-000000000001"},
  {"tipo":"caixa","id":"c4b00000-0000-0000-0000-000000000001"}]'::jsonb)$$, array[3], 'só conta o que é do próprio órgão');
select results_eq($$select count(*)::int from public.etiqueta_impressoes$$, array[3], 'operador lê as impressões');
select throws_ok($$insert into public.etiqueta_impressoes (prefeitura_id, tipo, caixa_id) values ('11111111-1111-1111-1111-111111111111', 'caixa', 'c4a00000-0000-0000-0000-000000000002')$$,
  '42501', null, 'impressão só entra pela função');
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is_empty($$select 1 from public.etiqueta_impressoes$$, 'B não lê impressões de A');
reset role;
select ok((select count(*) from public.auditoria where alvo_tabela = 'etiqueta_impressoes') >= 3, 'quem imprimiu fica na auditoria');
set local role authenticated;

-- ---------------------------------------------------------------------------
-- 4. Parceiras e marca
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select * from public.parceiras$$, '42501', null, 'administrador de órgão não lê parceiras direto');
select is_empty($$select 1 from public.equipe_parceiras()$$, 'administrador de órgão não lista parceiras');
select throws_ok($$select public.equipe_parceira_salvar(gen_random_uuid(), 'Parceira', '12345678000195', null, array[]::uuid[])$$,
  '42501', null, 'administrador de órgão não cadastra parceira');
select throws_ok($$select public.equipe_orgao_marca('11111111-1111-1111-1111-111111111111', 'prefeitura', 'Nome', null, false, null)$$,
  '42501', null, 'administrador de órgão não troca a marca pela função da equipe');

select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$select public.equipe_parceira_salvar('e1000000-0000-0000-0000-000000000001', 'Parceira Fictícia', '12345678000195',
  'parceiras/e1000000-0000-0000-0000-000000000001/logo.png', array['11111111-1111-1111-1111-111111111111']::uuid[])$$, 'equipe cadastra e liga a parceira');
select results_eq($$select prefeituras::int from public.equipe_parceiras()$$, array[1], 'a parceira atende um órgão');
select lives_ok($$select public.equipe_orgao_marca('11111111-1111-1111-1111-111111111111', 'camara', 'Câmara de Teste', 'orgaos/11111111-1111-1111-1111-111111111111/logo.png', false,
  'e1000000-0000-0000-0000-000000000001')$$, 'equipe define tipo, nome e logo do órgão');
select throws_ok($$select public.equipe_parceira_salvar(gen_random_uuid(), 'Outra', '12345678000195', null, array[]::uuid[])$$,
  '23505', null, 'CNPJ de parceira não repete');

select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select results_eq($$select parceira_logo_caminho from public.etiqueta_marca()$$, array['parceiras/e1000000-0000-0000-0000-000000000001/logo.png'],
  'o órgão enxerga o logo da sua parceira para a etiqueta');
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is_empty($$select 1 from public.etiqueta_marca() where parceira_logo_caminho is not null$$, 'B não recebe o logo da parceira de A');

reset role;
select ok(not has_table_privilege('authenticated', 'public.parceiras', 'select'), 'authenticated não lê parceiras direto');
select table_privs_are('public', 'parceiras', 'anon', array[]::text[], 'anon sem privilégio em parceiras');
select table_privs_are('public', 'grupos_documentais', 'anon', array[]::text[], 'anon sem privilégio em grupos_documentais');
select table_privs_are('public', 'tipologias', 'anon', array[]::text[], 'anon sem privilégio em tipologias');
select table_privs_are('public', 'etiqueta_impressoes', 'anon', array[]::text[], 'anon sem privilégio em etiqueta_impressoes');
select table_privs_are('public', 'etiqueta_impressoes', 'authenticated', array['SELECT'], 'authenticated só lê etiqueta_impressoes');
select table_privs_are('public', 'caixa_contador', 'authenticated', array[]::text[], 'ninguém mexe no contador de caixas');

-- ---------------------------------------------------------------------------
-- 5. Eliminação: digitalizado só com ICP-Brasil
-- ---------------------------------------------------------------------------
-- d2 (RH, digitalizado) com prazo vencido; d1 (sem PDF) com prazo vencido.
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select results_eq($$select app.motivo_inelegivel('d1000000-0000-0000-0000-000000000001')$$, array[null]::text[], 'sem PDF e com prazo cumprido é apto (só organização)');
select results_eq($$select app.motivo_inelegivel('d1000000-0000-0000-0000-000000000002')$$, array['digitalizado_sem_icp'], 'digitalizado sem ICP não é apto');
select results_eq($$select app.motivo_inelegivel('d1000000-0000-0000-0000-000000000003')$$, array['aguardando_evento'], 'prazo por evento sem evento informado aguarda');
reset role;
update public.documentos set evento_em = app.hoje() where id = 'd1000000-0000-0000-0000-000000000003';
update public.arquivos set assinatura_icp = false;
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select results_eq($$select app.motivo_inelegivel('d1000000-0000-0000-0000-000000000003')$$, array['prazo_nao_cumprido'], 'com o evento informado conta o prazo a partir dele');
reset role;
update public.arquivos set assinatura_icp = true, assinatura_certificado = 'cert fictício', assinatura_em = now();
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select results_eq($$select app.motivo_inelegivel('d1000000-0000-0000-0000-000000000002')$$, array[null]::text[], 'com assinatura ICP-Brasil o digitalizado passa');

reset role;
select * from finish();
rollback;
