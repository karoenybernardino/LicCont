-- Fase 9 · 9.15 · Relatórios baixados: registro, isolamento e permissões.
--   1. administrador e operador registram; consulta não registra;
--   2. secretaria que a pessoa não enxerga é recusada; outra prefeitura não lê;
--   3. cada pessoa lê os próprios; o administrador lê os da prefeitura;
--   4. ninguém grava, altera ou apaga direto; auditoria sem conteúdo.
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
  ('0a000000-0000-0000-0000-000000000004', 'consulta.a@exemplo.test'),
  ('0b000000-0000-0000-0000-000000000001', 'admin.b@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000003', '0a000000-0000-0000-0000-000000000003'),
  ('5a000000-0000-0000-0000-000000000004', '0a000000-0000-0000-0000-000000000004'),
  ('5b000000-0000-0000-0000-000000000001', '0b000000-0000-0000-0000-000000000001');
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin A', true, false),
  ('0a000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Operador A', false, false),
  ('0a000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Consulta A', false, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Admin B', true, false);
insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000000', 'operador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000000', 'consulta');

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

set local role authenticated;
-- Administrador A registra.
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$select public.registrar_relatorio('inventario', 'pdf', 120, null, null, null)$$, 'administrador registra relatório');
select lives_ok($$select public.registrar_relatorio('contratos_vigencia', 'planilha', 7, '2026-01-01', '2026-12-31', 'a1000000-0000-0000-0000-000000000000')$$, 'administrador registra com período e secretaria');
select throws_ok($$select public.registrar_relatorio('inventario', 'pdf', 1, null, null, 'b1000000-0000-0000-0000-000000000000')$$, '42501', null, 'secretaria de outra prefeitura é recusada');
select throws_ok($$select public.registrar_relatorio('relatorio_inventado', 'pdf', 1, null, null, null)$$, '23514', null, 'relatório desconhecido é recusado');
select throws_ok($$select public.registrar_relatorio('inventario', 'docx', 1, null, null, null)$$, '23514', null, 'formato desconhecido é recusado');
select results_eq($$select count(*)::int from public.relatorios_gerados$$, array[2], 'administrador lê os da prefeitura');
select throws_ok($$insert into public.relatorios_gerados (prefeitura_id, usuario_id, relatorio, formato, linhas)
  values ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000001', 'inventario', 'pdf', 1)$$, '42501', null, 'sem INSERT direto');

-- Operador A (Obras): registra para Obras, não para Saúde; lê só os próprios.
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select lives_ok($$select public.registrar_relatorio('sem_endereco', 'pdf', 3, null, null, 'a2000000-0000-0000-0000-000000000000')$$, 'operador registra para a própria secretaria');
select throws_ok($$select public.registrar_relatorio('sem_endereco', 'pdf', 3, null, null, 'a1000000-0000-0000-0000-000000000000')$$, '42501', null, 'operador não registra para secretaria alheia');
select results_eq($$select count(*)::int from public.relatorios_gerados$$, array[1], 'operador lê só os próprios');
select throws_ok($$update public.relatorios_gerados set linhas = 0$$, '42501', null, 'sem UPDATE direto');
select throws_ok($$delete from public.relatorios_gerados$$, '42501', null, 'sem DELETE direto');

-- Consulta A: não exporta e não lê.
select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select throws_ok($$select public.registrar_relatorio('inventario', 'pdf', 1, null, null, null)$$, '42501', null, 'consulta não exporta');
select is_empty($$select 1 from public.relatorios_gerados$$, 'consulta não lê o registro dos outros');

-- Administrador B: não vê nada de A.
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is_empty($$select 1 from public.relatorios_gerados$$, 'B não lê relatórios de A');

reset role;
select ok(exists (select 1 from public.auditoria where acao = 'relatorio.gerar' and depois ->> 'linhas' = '120'), 'relatório na auditoria com contagem');
select ok(not exists (select 1 from public.auditoria where acao = 'relatorio.gerar' and depois::text ~ '(Saúde|Obras|Fictícia)'), 'auditoria do relatório sem conteúdo');
select table_privs_are('public', 'relatorios_gerados', 'anon', array[]::text[], 'anon sem privilégio em relatorios_gerados');
select table_privs_are('public', 'relatorios_gerados', 'authenticated', array['SELECT'], 'authenticated só lê relatorios_gerados');
select ok(not has_function_privilege('anon', 'public.registrar_relatorio(text, text, int, date, date, uuid)', 'execute'), 'anon não registra relatório');

select * from finish();
rollback;
