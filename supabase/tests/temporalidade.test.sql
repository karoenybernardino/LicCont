-- Fase 7 · Temporalidade e descarte: isolamento, permissões e a regra de pronto.
--   1. tabela_temporalidade: outra prefeitura não lê nem escreve; só administrador escreve;
--   2. descartes e descarte_itens: só leitura pela Data API; outra prefeitura não lê;
--   3. documento fora do prazo, de guarda permanente, sem data, de outra secretaria
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

-- Documentos fictícios. Contrato conta do fim da vigência; licitação do encerramento.
--   d1 contrato vencido (apto)            d2 contrato que acabou hoje (prazo não cumprido)
--   d3 licitação de regra permanente      d4 dispensa vencida (apta)
--   d5 contrato sem data de fim           d6 contrato vencido de Obras (outra secretaria)
--   d7 contrato vencido da prefeitura B   d8 e d9 contratos vencidos (aptos), para o termo do administrador
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, situacao,
                               vigencia_inicio, vigencia_fim, encerrado_em) values
  ('d1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '001', 2005, 'Objeto fictício um', 'encerrado', '2005-01-01', '2010-01-01', null),
  ('d1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '002', 2020, 'Objeto fictício dois', 'encerrado', '2020-01-01', app.hoje(), null),
  ('d1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'concorrencia', '003', 2000, 'Objeto fictício três', 'concluida', null, null, '2000-01-01'),
  ('d1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'dispensa', '004', 2000, 'Objeto fictício quatro', 'concluida', null, null, '2000-01-01'),
  ('d1000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '005', 2005, 'Objeto fictício cinco', 'vigente', '2005-01-01', null, null),
  ('d1000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '006', 2005, 'Objeto fictício seis', 'encerrado', '2005-01-01', '2010-01-01', null),
  ('d1000000-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001', 'contrato', null, '007', 2005, 'Objeto fictício sete', 'encerrado', '2005-01-01', '2010-01-01', null),
  ('d1000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '008', 2005, 'Objeto fictício oito', 'encerrado', '2005-01-01', '2010-01-01', null),
  ('d1000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '009', 2005, 'Objeto fictício nove', 'encerrado', '2005-01-01', '2010-01-01', null);

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 1. tabela_temporalidade
-- ---------------------------------------------------------------------------
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select throws_ok($$insert into public.tabela_temporalidade (prefeitura_id, classe, prazo_corrente_anos, prazo_intermediaria_anos, destinacao)
  values ('11111111-1111-1111-1111-111111111111', 'contrato', 2, 3, 'eliminacao')$$, '42501', null, 'consulta não cria regra');
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select throws_ok($$insert into public.tabela_temporalidade (prefeitura_id, classe, prazo_corrente_anos, prazo_intermediaria_anos, destinacao)
  values ('11111111-1111-1111-1111-111111111111', 'contrato', 2, 3, 'eliminacao')$$, '42501', null, 'coordenador não cria regra');

select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$insert into public.tabela_temporalidade (prefeitura_id, classe, prazo_corrente_anos, prazo_intermediaria_anos, destinacao) values
  ('11111111-1111-1111-1111-111111111111', 'contrato', 2, 3, 'eliminacao'),
  ('11111111-1111-1111-1111-111111111111', 'licitacao', 1, 1, 'guarda_permanente'),
  ('11111111-1111-1111-1111-111111111111', 'dispensa_inexigibilidade', 1, 1, 'eliminacao')$$, 'administrador cria as regras');
select throws_ok($$insert into public.tabela_temporalidade (prefeitura_id, classe, prazo_corrente_anos, prazo_intermediaria_anos, destinacao)
  values ('11111111-1111-1111-1111-111111111111', 'contrato', 9, 9, 'eliminacao')$$, '23505', null, 'uma regra por classe');
select throws_ok($$insert into public.tabela_temporalidade (prefeitura_id, classe, prazo_corrente_anos, prazo_intermediaria_anos, destinacao)
  values ('22222222-2222-2222-2222-222222222222', 'contrato', 2, 3, 'eliminacao')$$, '42501', null, 'administrador de A não cria regra em B');
select lives_ok($$update public.tabela_temporalidade set prazo_corrente_anos = 2 where classe = 'contrato'$$, 'administrador altera regra');

select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is_empty($$select 1 from public.tabela_temporalidade$$, 'B não lê regras de A');
select is_empty($$update public.tabela_temporalidade set prazo_corrente_anos = 1 returning 1$$, 'B não altera regras de A');
select throws_ok($$insert into public.tabela_temporalidade (prefeitura_id, classe, prazo_corrente_anos, prazo_intermediaria_anos, destinacao)
  values ('11111111-1111-1111-1111-111111111111', 'licitacao', 1, 1, 'eliminacao')$$, '42501', null, 'B não cria regra em A');

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
  'LD001', null, 'documento sem data de início é recusado');
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
update public.tabela_temporalidade set destinacao = 'guarda_permanente' where classe = 'dispensa_inexigibilidade';
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select public.descarte_aprovar((select id from public.descartes limit 1))$$,
  'LD001', null, 'documento que deixou de ser apto barra a aprovação inteira');
select results_eq($$select count(*)::int from public.documentos where ativo and id in
  ('d1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004')$$, array[2], 'nenhum documento foi desativado');
reset role;
update public.tabela_temporalidade set destinacao = 'eliminacao' where classe = 'dispensa_inexigibilidade';
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

-- ---------------------------------------------------------------------------
-- Privilégios
-- ---------------------------------------------------------------------------
reset role;
select table_privs_are('public', 'tabela_temporalidade', 'anon', array[]::text[], 'anon sem privilégio em tabela_temporalidade');
select table_privs_are('public', 'descartes', 'anon', array[]::text[], 'anon sem privilégio em descartes');
select table_privs_are('public', 'descarte_itens', 'anon', array[]::text[], 'anon sem privilégio em descarte_itens');
select table_privs_are('public', 'descartes', 'authenticated', array['SELECT'], 'authenticated só lê descartes');
select table_privs_are('public', 'descarte_itens', 'authenticated', array['SELECT'], 'authenticated só lê descarte_itens');
select ok(not has_table_privilege('authenticated', 'public.tabela_temporalidade', 'delete'), 'ninguém apaga regra');
select ok(not has_table_privilege('authenticated', 'public.documentos', 'delete'), 'ninguém apaga documento');
select ok(not has_function_privilege('anon', 'public.descarte_aprovar(uuid)', 'execute'), 'anon não executa descarte_aprovar');
select ok(not has_function_privilege('anon', 'public.descarte_criar(uuid, uuid[], text)', 'execute'), 'anon não executa descarte_criar');

select * from finish();
rollback;
