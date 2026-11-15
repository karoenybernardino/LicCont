-- Fase 8: uso da equipe (só números), autorização de suporte (até 5 h) e aceites.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
update app.configuracao set segundo_fator_obrigatorio = true;

insert into public.prefeituras (id, nome, cnpj, status) values
  ('11111111-1111-1111-1111-111111111111', 'Prefeitura Fictícia A', '00000000000191', 'ativa'),
  ('22222222-2222-2222-2222-222222222222', 'Prefeitura Fictícia B', '00000000000272', 'ativa');
insert into auth.users (id, email) values
  ('0a000000-0000-0000-0000-000000000001', 'admin.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000003', 'operador.a@exemplo.test'),
  ('0b000000-0000-0000-0000-000000000001', 'admin.b@exemplo.test'),
  ('0e000000-0000-0000-0000-000000000001', 'equipe@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000003', '0a000000-0000-0000-0000-000000000003'),
  ('5b000000-0000-0000-0000-000000000001', '0b000000-0000-0000-0000-000000000001'),
  ('5e000000-0000-0000-0000-000000000001', '0e000000-0000-0000-0000-000000000001');
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin A', true, false),
  ('0a000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Operador A', false, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Admin B', true, false);
insert into public.equipe_liccont (usuario_id) values ('0e000000-0000-0000-0000-000000000001');

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

set local role authenticated;

-- 1. uso da equipe
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select is((select count(*) from public.equipe_uso_prefeituras() where prefeitura_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')), 2::bigint, 'equipe com 2º fator vê as duas prefeituras');
select is((select usuarios from public.equipe_uso_prefeituras() where prefeitura_id = '11111111-1111-1111-1111-111111111111'), 2, 'conta usuários ativos');
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal1');
select throws_ok($$select * from public.equipe_uso_prefeituras()$$, '42501', null, 'equipe sem 2º fator não executa');
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select * from public.equipe_uso_prefeituras()$$, '42501', null, 'administrador de prefeitura não executa');
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select is((select count(*) from public.documentos), 0::bigint, 'equipe continua sem ler documentos');

-- 2. suporte
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select public.autorizar_suporte('ajuda com cadastro', 6)$$, '22023', null, 'mais de 5 h é recusado');
select throws_ok($$select public.autorizar_suporte('ajuda com cadastro', 0)$$, '22023', null, 'zero hora é recusado');
select lives_ok($$select public.autorizar_suporte('ajuda com cadastro', 5)$$, 'administrador autoriza 5 h');
select is((select count(*) from public.autorizacoes_suporte), 1::bigint, 'administrador vê a própria autorização');
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal2');
select throws_ok($$select public.autorizar_suporte('ajuda com cadastro', 1)$$, '42501', null, 'operador não autoriza');
select is((select count(*) from public.autorizacoes_suporte), 0::bigint, 'operador não vê autorizações');
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is((select count(*) from public.autorizacoes_suporte), 0::bigint, 'outra prefeitura não vê');
select throws_ok(format($$select public.revogar_suporte(%L)$$, (select 'x')::text), '22P02', null, 'id inválido recusado');
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select public.autorizar_suporte('ajuda com cadastro', 1)$$, '42501', null, 'equipe não autoriza a si mesma');
select isnt((select public.suporte_autorizado('11111111-1111-1111-1111-111111111111')), null, 'equipe vê que há autorização valendo');
select is((select public.suporte_autorizado('22222222-2222-2222-2222-222222222222')), null, 'e que não há na outra');
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$select public.revogar_suporte((select id from public.autorizacoes_suporte limit 1))$$, 'administrador revoga');
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select is((select public.suporte_autorizado('11111111-1111-1111-1111-111111111111')), null, 'revogada deixa de valer');

-- 6. aceites
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal2');
select lives_ok($$select public.registrar_aceite('v1')$$, 'pessoa aceita a versão');
select lives_ok($$select public.registrar_aceite('v1')$$, 'aceitar de novo não duplica');
select is((select count(*) from public.aceites), 2::bigint, 'um aceite por documento');
select throws_ok($$update public.aceites set versao = 'v2'$$, '42501', null, 'ninguém altera aceite');
select throws_ok($$delete from public.aceites$$, '42501', null, 'ninguém apaga aceite');
select throws_ok($$insert into public.aceites (prefeitura_id, documento, versao) values ('11111111-1111-1111-1111-111111111111', 'termos', 'v9')$$, '42501', null, 'sem insert direto');
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is((select count(*) from public.aceites), 0::bigint, 'outra prefeitura não vê aceite');
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select is((select count(*) from public.aceites), 2::bigint, 'administrador vê os da prefeitura');

-- 3. exportação
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($select public.registrar_exportacao(10, 4, 0)$, 'administrador registra exportação');
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal2');
select throws_ok($select public.registrar_exportacao(1, 1, 0)$, '42501', null, 'operador não registra exportação');

reset role;
set local role anon;
select throws_ok($$select * from public.aceites$$, '42501', null, 'anon não lê aceites');
select throws_ok($$select * from public.autorizacoes_suporte$$, '42501', null, 'anon não lê autorizações');
select throws_ok($$select * from public.equipe_uso_prefeituras()$$, '42501', null, 'anon não executa uso');

select * from finish();
rollback;
