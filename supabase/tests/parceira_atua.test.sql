-- Parceira atua em UMA prefeitura por vez (parceira_contexto + parceira_atuar) e opera/administra o acervo
-- (estrutura e temporalidade) sem administrar pessoas. Tudo fictício, dentro da transação (ROLLBACK).
--   (a) sem contexto não lê documentos; (b)(c) atuar só em prefeitura permitida;
--   (d) com contexto lê só a prefeitura do contexto; (e) cadastra em A e não em B;
--   (f) altera estrutura e regra de temporalidade em A (não em B) mas não cria usuário, secretaria nem vínculo;
--   (g) desalocar derruba o contexto; (h) parceira_contexto não é legível por authenticated.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
update app.configuracao set segundo_fator_obrigatorio = true;

insert into public.parceiras (id, nome, cnpj) values
  ('f2000000-0000-0000-0000-000000000001', 'Empresa X Fictícia', '00000000000911'),
  ('f2000000-0000-0000-0000-000000000002', 'Empresa Y Fictícia', '11111111000912');
insert into public.prefeituras (id, nome, cnpj, status, parceira_id) values
  ('11111111-1111-1111-1111-111111111111', 'Prefeitura Fictícia A', '00000000000921', 'ativa', 'f2000000-0000-0000-0000-000000000001'),
  ('22222222-2222-2222-2222-222222222222', 'Prefeitura Fictícia B', '00000000000922', 'ativa', 'f2000000-0000-0000-0000-000000000001'),
  ('33333333-3333-3333-3333-333333333333', 'Prefeitura Fictícia C', '00000000000923', 'ativa', 'f2000000-0000-0000-0000-000000000002');
insert into public.secretarias (id, prefeitura_id, nome) values
  ('a1000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Saúde A'),
  ('b1000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Saúde B');
insert into auth.users (id, email) values
  ('0d000000-0000-0000-0000-000000000011', 'dono.x@exemplo.test'),
  ('0d000000-0000-0000-0000-000000000012', 'func1.x@exemplo.test'),
  ('0d000000-0000-0000-0000-000000000013', 'func2.x@exemplo.test'),
  ('0d000000-0000-0000-0000-000000000014', 'dono.y@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('5d000000-0000-0000-0000-000000000011', '0d000000-0000-0000-0000-000000000011'),
  ('5d000000-0000-0000-0000-000000000012', '0d000000-0000-0000-0000-000000000012'),
  ('5d000000-0000-0000-0000-000000000013', '0d000000-0000-0000-0000-000000000013'),
  ('5d000000-0000-0000-0000-000000000014', '0d000000-0000-0000-0000-000000000014');
insert into public.parceira_pessoas (id, parceira_id, usuario_id, nome, papel, troca_senha_obrigatoria) values
  ('b2000000-0000-0000-0000-000000000011', 'f2000000-0000-0000-0000-000000000001', '0d000000-0000-0000-0000-000000000011', 'Dono X', 'dono', false),
  ('b2000000-0000-0000-0000-000000000012', 'f2000000-0000-0000-0000-000000000001', '0d000000-0000-0000-0000-000000000012', 'Func 1 X', 'funcionario', false),
  ('b2000000-0000-0000-0000-000000000013', 'f2000000-0000-0000-0000-000000000001', '0d000000-0000-0000-0000-000000000013', 'Func 2 X', 'funcionario', false),
  ('b2000000-0000-0000-0000-000000000014', 'f2000000-0000-0000-0000-000000000002', '0d000000-0000-0000-0000-000000000014', 'Dono Y', 'dono', false);
insert into public.parceira_alocacoes (pessoa_id, prefeitura_id, alocado_por) values
  ('b2000000-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', '0d000000-0000-0000-0000-000000000011');

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
  ('c3a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c2a00000-0000-0000-0000-000000000000', 1, 6),
  ('c3b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c2b00000-0000-0000-0000-000000000000', 1, 6);
insert into public.caixas (id, prefeitura_id, nivel_id, numero) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1),
  ('c4b00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 1);
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto) values
  ('d2000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001',
   'licitacao', 'dispensa', '001/2024', 2024, 'Objeto fictício de A'),
  ('d2000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001',
   'licitacao', 'dispensa', '001/2024', 2024, 'Objeto fictício de B');
insert into public.classes_documentais (id, prefeitura_id, grupo_id, codigo, nome, prazo_corrente_anos, prazo_intermediaria_anos, tipo_prazo, destinacao)
select case g.prefeitura_id when '11111111-1111-1111-1111-111111111111'::uuid then 'e2a00000-0000-0000-0000-000000000001'::uuid
                            else 'e2b00000-0000-0000-0000-000000000001'::uuid end,
       g.prefeitura_id, g.id, 'ZZ', 'Classe fictícia', 3, 2, 'fixo', 'eliminacao'
from public.grupos_documentais g
where g.prefeitura_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
  and g.chave = 'licitacoes_contratos';

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- (h) tabela fechada
select table_privs_are('public', 'parceira_contexto', 'anon', array[]::text[], 'anon não acessa parceira_contexto');
select table_privs_are('public', 'parceira_contexto', 'authenticated', array[]::text[], 'authenticated não acessa parceira_contexto');
select ok(not has_function_privilege('anon', 'public.parceira_atuar(uuid)', 'execute'), 'anon não executa parceira_atuar');
select ok(not has_function_privilege('anon', 'app.parceira_atua()', 'execute'), 'anon não executa parceira_atua');

set local role authenticated;

-- (a) sem contexto não lê documentos
select tst_entrar('0d000000-0000-0000-0000-000000000012', '5d000000-0000-0000-0000-000000000012', 'aal2');
select is((select count(*) from public.documentos), 0::bigint, 'funcionário sem contexto não lê documentos');
select is((select app.prefeitura_atual()), null::uuid, 'sem contexto a prefeitura atual é nula');
select tst_entrar('0d000000-0000-0000-0000-000000000011', '5d000000-0000-0000-0000-000000000011', 'aal2');
select is((select count(*) from public.documentos), 0::bigint, 'dono sem contexto não lê documentos');

-- (h) nem a própria pessoa lê a tabela
select throws_ok($$select count(*) from public.parceira_contexto$$, '42501', null, 'authenticated não lê parceira_contexto');

-- (b)(c) atuar só em prefeitura permitida
select tst_entrar('0d000000-0000-0000-0000-000000000012', '5d000000-0000-0000-0000-000000000012', 'aal2');
select throws_ok($$select public.parceira_atuar('22222222-2222-2222-2222-222222222222')$$, '42501', null, 'funcionário alocado só em A não atua em B');
select throws_ok($$select public.parceira_atuar('33333333-3333-3333-3333-333333333333')$$, '42501', null, 'funcionário não atua em prefeitura de outra empresa');
select throws_ok($$select public.parceira_atuar(null)$$, '42501', null, 'atuar sem prefeitura é recusado');
select tst_entrar('0d000000-0000-0000-0000-000000000013', '5d000000-0000-0000-0000-000000000013', 'aal2');
select throws_ok($$select public.parceira_atuar('11111111-1111-1111-1111-111111111111')$$, '42501', null, 'funcionário sem alocação não atua em A');
select tst_entrar('0d000000-0000-0000-0000-000000000014', '5d000000-0000-0000-0000-000000000014', 'aal2');
select throws_ok($$select public.parceira_atuar('11111111-1111-1111-1111-111111111111')$$, '42501', null, 'dono de outra empresa não atua em A');
select tst_entrar('0d000000-0000-0000-0000-000000000012', '5d000000-0000-0000-0000-000000000012', 'aal1');
select throws_ok($$select public.parceira_atuar('11111111-1111-1111-1111-111111111111')$$, '42501', null, 'sem segundo fator não atua');
select tst_entrar('0d000000-0000-0000-0000-000000000012', '5d000000-0000-0000-0000-000000000012', 'aal2');

-- (d) com contexto em A
select lives_ok($$select public.parceira_atuar('11111111-1111-1111-1111-111111111111')$$, 'funcionário atua em A');
select is((select app.prefeitura_atual()), '11111111-1111-1111-1111-111111111111'::uuid, 'prefeitura atual passa a ser A');
select is((select count(*) from public.documentos), 1::bigint, 'com contexto em A lê só o documento de A');
select is((select count(*) from public.documentos where prefeitura_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'não lê documento de B');
select is((select count(*) from public.caixas), 1::bigint, 'lê só a caixa de A');
select is((select count(*) from public.galpoes), 1::bigint, 'lê só a estrutura de A');
select is((select app.eh_admin()), false, 'parceira nunca é administradora');
select is((select app.pode_administrar_acervo()), true, 'parceira com contexto administra o acervo');
select is((select count(*) from public.prefeituras), 0::bigint, 'não lê a linha de prefeituras (usa parceira_atuando)');
select is((select id from public.parceira_atuando()), '11111111-1111-1111-1111-111111111111'::uuid, 'parceira_atuando devolve A');

-- (e) cadastra documento e caixa em A; B falha
select lives_ok($$insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001',
          'licitacao', 'dispensa', '002/2025', 2025, 'Cadastrado pela parceira')$$, 'cadastra documento em A');
select lives_ok($$insert into public.caixas (prefeitura_id, nivel_id, numero)
  values ('11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 2)$$, 'cadastra caixa em A');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto)
  values ('22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001',
          'licitacao', 'dispensa', '003/2025', 2025, 'Em B')$$, '42501', null, 'não cadastra documento em B');
select throws_ok($$insert into public.caixas (prefeitura_id, nivel_id, numero)
  values ('22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 2)$$, '42501', null, 'não cadastra caixa em B');
select is((select public.registrar_impressoes('[{"tipo":"caixa","id":"c4a00000-0000-0000-0000-000000000001"}]'::jsonb)), 1, 'registra impressão de etiqueta em A');
select is((select public.registrar_impressoes('[{"tipo":"caixa","id":"c4b00000-0000-0000-0000-000000000001"}]'::jsonb)), 0, 'impressão de caixa de B não registra');
select is((select public.mover_documentos(array['d2000000-0000-0000-0000-000000000001']::uuid[],
  (select id from public.caixas where prefeitura_id = '11111111-1111-1111-1111-111111111111' and numero = 2))), 1, 'move documento de A para outra caixa de A');

-- (f) estrutura e temporalidade em A; B não; pessoas nunca
select is((with u as (update public.galpoes set nome = 'Galpão A renomeado' where id = 'c0a00000-0000-0000-0000-000000000000' returning 1) select count(*) from u),
  1::bigint, 'altera galpão de A');
select is((with u as (update public.galpoes set nome = 'Invasão' where id = 'c0b00000-0000-0000-0000-000000000000' returning 1) select count(*) from u),
  0::bigint, 'não altera galpão de B');
select lives_ok($$insert into public.galpoes (prefeitura_id, nome) values ('11111111-1111-1111-1111-111111111111', 'Galpão novo A')$$, 'cria galpão em A');
select throws_ok($$insert into public.galpoes (prefeitura_id, nome) values ('22222222-2222-2222-2222-222222222222', 'Galpão novo B')$$, '42501', null, 'não cria galpão em B');
select is((with u as (update public.niveis set capacidade = 8 where id = 'c3a00000-0000-0000-0000-000000000000' returning 1) select count(*) from u),
  1::bigint, 'altera nível de A');
select is((with u as (update public.ruas set planta_giro = coalesce(planta_giro, 0) where id = 'c1a00000-0000-0000-0000-000000000000' returning 1) select count(*) from u),
  1::bigint, 'altera planta (rua) de A');
select is((select public.classe_excluir('e2a00000-0000-0000-0000-000000000001')), 'excluida', 'altera regra de temporalidade (classe) de A');
select throws_ok($$select public.classe_excluir('e2b00000-0000-0000-0000-000000000001')$$, '42501', null, 'não altera regra de temporalidade de B');
select lives_ok($$insert into public.modelos_termo (prefeitura_id, tipo, base_legal, assinaturas)
  values ('11111111-1111-1111-1111-111111111111', 'eliminacao', 'Base legal fictícia', 'Assinatura fictícia')$$, 'grava modelo de termo em A');
select throws_ok($$insert into public.modelos_termo (prefeitura_id, tipo, base_legal, assinaturas)
  values ('22222222-2222-2222-2222-222222222222', 'eliminacao', 'Base legal fictícia', 'Assinatura fictícia')$$, '42501', null, 'não grava modelo de termo em B');
select throws_ok($$insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria)
  values ('0d000000-0000-0000-0000-000000000099', '11111111-1111-1111-1111-111111111111', 'Intruso', true, true)$$, '42501', null, 'não cria usuário');
select throws_ok($$insert into public.secretarias (prefeitura_id, nome) values ('11111111-1111-1111-1111-111111111111', 'Nova')$$, '42501', null, 'não cria secretaria');
select throws_ok($$insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel)
  values ('11111111-1111-1111-1111-111111111111', '0d000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000000', 'operador')$$, '42501', null, 'não cria vínculo');
select throws_ok($$select public.registrar_emprestimo('d2000000-0000-0000-0000-000000000001', 'Fulano', 'Setor', current_date, current_date + 7, null)$$,
  '42501', null, 'não registra empréstimo');
select is((select count(*) from public.emprestimos), 0::bigint, 'não lê empréstimos');

-- dono atuando em A: B continua fora, mesmo sendo da empresa dele
select tst_entrar('0d000000-0000-0000-0000-000000000011', '5d000000-0000-0000-0000-000000000011', 'aal2');
select lives_ok($$select public.parceira_atuar('11111111-1111-1111-1111-111111111111')$$, 'dono atua em A');
select is((select count(*) from public.documentos where prefeitura_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'dono atuando em A não lê documentos de B');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto)
  values ('22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001',
          'licitacao', 'dispensa', '004/2025', 2025, 'Dono em B')$$, '42501', null, 'dono atuando em A não cadastra em B');
select lives_ok($$select public.parceira_atuar('22222222-2222-2222-2222-222222222222')$$, 'dono troca para B');
select is((select count(*) from public.documentos), 1::bigint, 'dono atuando em B lê só os documentos de B');

-- (g) desalocar derruba o contexto
reset role;
delete from public.parceira_alocacoes where pessoa_id = 'b2000000-0000-0000-0000-000000000012';
set local role authenticated;
select tst_entrar('0d000000-0000-0000-0000-000000000012', '5d000000-0000-0000-0000-000000000012', 'aal2');
select is((select app.prefeitura_atual()), null::uuid, 'desalocado: contexto antigo não vale');
select is((select count(*) from public.documentos), 0::bigint, 'desalocado: não lê documentos');
select is((select app.pode_administrar_acervo()), false, 'desalocado: não administra o acervo');
select throws_ok($$insert into public.caixas (prefeitura_id, nivel_id, numero)
  values ('11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 3)$$, '42501', null, 'desalocado: não cadastra caixa');

select * from finish();
rollback;
