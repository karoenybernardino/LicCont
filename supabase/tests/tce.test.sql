-- Fase 9 · TCE-CE: isolamento e permissões.
--   1. a rotina (importar_tce_*) só roda com a chave de serviço;
--   2. outra prefeitura não lê histórico nem duplicados, não decide nem confirma;
--   3. só administrador configura; configuração incompleta não liga;
--   4. registro novo entra "a conferir", sem caixa; já conhecido é ignorado;
--   5. mesmo processo de documento existente vira duplicado e nunca sobrescreve;
--   6. juntar põe o id do TCE no documento existente; manter só descarta;
--   7. conferir troca secretaria e caixa uma única vez; secretaria não muda de outro jeito;
--   8. auditoria sem conteúdo; anon sem privilégio.
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

-- Documento manual existente (alvo do duplicado).
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, situacao) values
  ('d0a10000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'pregao_eletronico', '015/2023', 2023, 'Objeto manual fictício', 'concluida');

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- Sem configuração a rotina não abre importação.
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select throws_ok($$select public.importar_tce_abrir('11111111-1111-1111-1111-111111111111', 'agendada')$$, '23514', null, 'sem configuração não abre importação');

-- Administrador A configura.
reset role;
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select public.salvar_config_tce(true, null, null, '{}', '{licitacao}')$$, '23514', null, 'configuração incompleta não liga');
select throws_ok($$select public.salvar_config_tce(false, '162', 'a2000000-0000-0000-0000-000000000000', '{1999}', '{licitacao}')$$, '23514', null, 'ano fora da faixa recusado');
select lives_ok($$select public.salvar_config_tce(true, '162', 'a2000000-0000-0000-0000-000000000000', '{2024,2025}', '{licitacao,contrato}')$$, 'administrador configura');
select throws_ok($$select public.salvar_config_tce(true, '162', 'b1000000-0000-0000-0000-000000000000', '{2024}', '{licitacao}')$$, '23503', null, 'secretaria de outra prefeitura recusada');

-- Operador não configura nem roda a rotina.
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select throws_ok($$select public.salvar_config_tce(false, '162', null, '{}', '{licitacao}')$$, '42501', null, 'operador não configura');
select throws_ok($$select public.importar_tce_abrir('11111111-1111-1111-1111-111111111111', 'manual')$$, '42501', null, 'usuário logado não roda a rotina');
select throws_ok($$select public.importar_tce_gravar('00000000-0000-0000-0000-000000000000', '[]')$$, '42501', null, 'usuário logado não grava pela rotina');

-- Rotina com a chave de serviço.
select throws_ok($$select * from public.importar_tce_configuracoes()$$, '42501', null, 'usuário logado não lê as configurações da rotina');
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select results_eq($$select count(*)::int from public.importar_tce_configuracoes()$$, array[1], 'rotina vê só prefeitura com integração completa');
select results_eq($$select anos::text from public.importar_tce_configuracoes('11111111-1111-1111-1111-111111111111')$$, array['{2024,2025}'], 'rotina lê os anos escolhidos');
create temp table imp as select public.importar_tce_abrir('11111111-1111-1111-1111-111111111111', 'agendada') as id;
grant select on imp to service_role;
select ok((select id from imp) is not null, 'rotina abre importação');
select throws_ok($$select public.importar_tce_abrir('11111111-1111-1111-1111-111111111111', 'manual')$$, '55P03', null, 'não abre duas ao mesmo tempo');

select results_eq(
  $$select public.importar_tce_gravar((select id from imp), '[
    {"tce_id":"T1","tipo":"licitacao","modalidade":"dispensa","numero":"001/2024","ano":2024,"objeto":"Objeto do TCE fictício","empresa":"Empresa Fictícia","cnpj":"00000000000191","situacao":"concluida"},
    {"tce_id":"T2","tipo":"licitacao","modalidade":"pregao_eletronico","numero":"015/2023","ano":2023,"objeto":"Objeto do TCE que NÃO pode sobrescrever","situacao":"concluida"}
  ]'::jsonb)::text$$,
  array['{"novos": 1, "duplicados": 1, "ja_existentes": 0}'], 'grava 1 novo e aponta 1 duplicado');
select results_eq($$select public.importar_tce_gravar((select id from imp), '[{"tce_id":"T1","tipo":"licitacao","modalidade":"dispensa","numero":"001/2024","ano":2024,"objeto":"Objeto do TCE fictício","situacao":"concluida"}]'::jsonb)::text$$,
  array['{"novos": 0, "duplicados": 0, "ja_existentes": 1}'], 'registro já conhecido é ignorado');
select lives_ok($$select public.importar_tce_fechar((select id from imp), null)$$, 'rotina fecha a importação');
select throws_ok($$select public.importar_tce_gravar((select id from imp), '[]')$$, '23514', null, 'importação fechada não recebe mais registros');

reset role;
select results_eq($$select origem || '|' || tce_a_conferir::text || '|' || coalesce(caixa_id::text, 'sem') || '|' || secretaria_id::text from public.documentos where tce_id = 'T1'$$,
  array['tce|true|sem|a2000000-0000-0000-0000-000000000000'], 'novo entra a conferir, sem caixa, na secretaria padrão');
select results_eq($$select objeto from public.documentos where id = 'd0a10000-0000-0000-0000-000000000000'$$,
  array['Objeto manual fictício'], 'duplicado não sobrescreve o documento existente');
select results_eq($$select count(*)::int from public.documentos where numero = '015/2023'$$, array[1], 'duplicado não cria outro documento');
select results_eq($$select novos::text || '/' || duplicados::text || '/' || ja_existentes::text || '/' || situacao from public.importacoes_tce$$,
  array['1/1/1/ok'], 'histórico guarda só contagens');

-- Administrador A decide o duplicado e confere o novo.
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select results_eq($$select count(*)::int from public.tce_duplicados where decisao is null$$, array[1], 'administrador vê o duplicado pendente');
select lives_ok($$select public.decidir_duplicado_tce((select id from public.tce_duplicados limit 1), 'juntar')$$, 'juntar');
select results_eq($$select tce_id from public.documentos where id = 'd0a10000-0000-0000-0000-000000000000'$$, array['T2'], 'juntar põe o id do TCE no documento existente');
select results_eq($$select objeto from public.documentos where id = 'd0a10000-0000-0000-0000-000000000000'$$, array['Objeto manual fictício'], 'juntar não muda o conteúdo');
select throws_ok($$select public.decidir_duplicado_tce((select id from public.tce_duplicados limit 1), 'manter')$$, '42501', null, 'duplicado decidido não decide de novo');
select throws_ok($$update public.documentos set secretaria_id = 'a1000000-0000-0000-0000-000000000000' where tce_id = 'T1'$$, '42501', null, 'secretaria não muda por UPDATE direto');
select lives_ok($$select public.confirmar_importado_tce((select id from public.documentos where tce_id = 'T1'), 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001')$$, 'administrador confere o importado');
select results_eq($$select tce_a_conferir::text || '|' || secretaria_id::text from public.documentos where tce_id = 'T1'$$,
  array['false|a1000000-0000-0000-0000-000000000000'], 'conferido sai da fila e troca de secretaria');
select throws_ok($$select public.confirmar_importado_tce((select id from public.documentos where tce_id = 'T1'), 'a2000000-0000-0000-0000-000000000000', null)$$, '42501', null, 'conferido não confere de novo');

-- Administrador B: não vê nem decide nada de A.
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is_empty($$select 1 from public.importacoes_tce$$, 'B não lê histórico de A');
select is_empty($$select 1 from public.tce_duplicados$$, 'B não lê duplicados de A');
select throws_ok($$select public.confirmar_importado_tce('d0a10000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', null)$$, '42501', null, 'B não confere documento de A');

-- Operador A não lê o histórico (só administrador).
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select is_empty($$select 1 from public.importacoes_tce$$, 'operador não lê histórico');
select is_empty($$select 1 from public.tce_duplicados$$, 'operador não lê duplicados');

reset role;
select ok(exists (select 1 from public.auditoria where acao = 'tce.importar' and depois ->> 'novos' = '1'), 'importação na auditoria com contagem');
select ok(exists (select 1 from public.auditoria where acao = 'tce.duplicado.juntar'), 'decisão na auditoria');
select ok(not exists (select 1 from public.auditoria where acao like 'tce.%' and depois::text like '%fictíci%'), 'auditoria do TCE sem conteúdo');
select table_privs_are('public', 'importacoes_tce', 'anon', array[]::text[], 'anon sem privilégio em importacoes_tce');
select table_privs_are('public', 'importacoes_tce', 'authenticated', array['SELECT'], 'authenticated só lê importacoes_tce');
select table_privs_are('public', 'tce_duplicados', 'anon', array[]::text[], 'anon sem privilégio em tce_duplicados');
select table_privs_are('public', 'tce_duplicados', 'authenticated', array['SELECT'], 'authenticated só lê tce_duplicados');
select ok(not has_function_privilege('anon', 'public.importar_tce_gravar(uuid, jsonb)', 'execute'), 'anon não roda a rotina');
select ok(not has_function_privilege('authenticated', 'public.importar_tce_gravar(uuid, jsonb)', 'execute'), 'authenticated não roda a rotina');
select ok(has_function_privilege('service_role', 'public.importar_tce_gravar(uuid, jsonb)', 'execute'), 'service_role roda a rotina');

select * from finish();
rollback;
