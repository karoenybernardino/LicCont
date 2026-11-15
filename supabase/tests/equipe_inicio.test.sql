-- 9.17: contrato da prefeitura, andamento de pedido, integrações e auditoria da equipe.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
update app.configuracao set segundo_fator_obrigatorio = true;

insert into public.prefeituras (id, nome, cnpj, status) values
  ('11111111-1111-1111-1111-111111111111', 'Prefeitura Fictícia A', '00000000000191', 'ativa'),
  ('22222222-2222-2222-2222-222222222222', 'Prefeitura Fictícia B', '00000000000272', 'ativa');
insert into auth.users (id, email) values
  ('0a000000-0000-0000-0000-000000000001', 'admin.a@exemplo.test'),
  ('0e000000-0000-0000-0000-000000000001', 'equipe@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5e000000-0000-0000-0000-000000000001', '0e000000-0000-0000-0000-000000000001');
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin A', true, false);
insert into public.equipe_liccont (usuario_id) values ('0e000000-0000-0000-0000-000000000001');
insert into public.importacoes_tce (prefeitura_id, origem, situacao, novos, erro_codigo, concluida_em) values
  ('11111111-1111-1111-1111-111111111111', 'agendada', 'erro', 0, 'indisponivel', now()),
  ('22222222-2222-2222-2222-222222222222', 'agendada', 'ok', 31, null, now());
insert into public.auditoria (prefeitura_id, usuario_id, acao) values
  ('11111111-1111-1111-1111-111111111111', '0e000000-0000-0000-0000-000000000001', 'prefeituras.insert'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000001', 'sessao.entrada');

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

set local role authenticated;
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select is((select erros_7d from public.equipe_integracoes() where prefeitura_id = '11111111-1111-1111-1111-111111111111'), 1, 'equipe vê o erro de uma prefeitura');
select is((select novos from public.equipe_integracoes() where prefeitura_id = '22222222-2222-2222-2222-222222222222'), 31, 'equipe vê os novos da outra');
select is((select count(*) from public.equipe_auditoria() where acao = 'sessao.entrada'), 0::bigint, 'auditoria da equipe não traz o que o usuário da prefeitura fez');
select is((select count(*) from public.equipe_auditoria() where acao = 'prefeituras.insert'), 1::bigint, 'auditoria da equipe traz a ação da equipe');
select lives_ok($$update public.prefeituras set plano = 'completo', valor_mensalidade_centavos = 150000, contrato_inicio = '2026-11-08' where id = '11111111-1111-1111-1111-111111111111'$$, 'equipe grava o contrato');
select throws_ok($$update public.prefeituras set valor_mensalidade_centavos = -1 where id = '11111111-1111-1111-1111-111111111111'$$, '23514', null, 'valor negativo é recusado');

select lives_ok($$update public.prefeituras set tce_ativo = true, tce_codigo_municipio = '123' where id = '22222222-2222-2222-2222-222222222222'$$, 'equipe liga o TCE e grava o código do município');
select is((select tce_codigo_municipio from public.prefeituras where id = '22222222-2222-2222-2222-222222222222'), '123', 'código gravado');
select throws_ok($$update public.prefeituras set tce_codigo_municipio = 'abc' where id = '22222222-2222-2222-2222-222222222222'$$, '23514', null, 'código só com números');

select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal1');
select throws_ok($$select * from public.equipe_integracoes()$$, '42501', null, 'equipe sem 2º fator não executa integrações');
select throws_ok($$select * from public.equipe_auditoria()$$, '42501', null, 'equipe sem 2º fator não lê auditoria');

select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select * from public.equipe_integracoes()$$, '42501', null, 'administrador de prefeitura não executa integrações');
select throws_ok($$select * from public.equipe_auditoria()$$, '42501', null, 'administrador de prefeitura não lê auditoria da equipe');
select lives_ok($$update public.prefeituras set tce_ativo = false where id = '22222222-2222-2222-2222-222222222222'$$, 'administrador não liga nem desliga o TCE da outra prefeitura (RLS filtra)');
select lives_ok($$update public.prefeituras set valor_mensalidade_centavos = 1 where id = '11111111-1111-1111-1111-111111111111'$$, 'administrador não consegue alterar (RLS filtra, sem erro)');
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select is((select valor_mensalidade_centavos from public.prefeituras where id = '11111111-1111-1111-1111-111111111111'), 150000, 'o contrato continua como a equipe gravou');

-- 9.19: lotes, histórico do TCE e pedido na auditoria
reset role;
insert into public.lotes_importacao (prefeitura_id, nome_arquivo, linhas_total, gravados, situacao, criado_por) values
  ('11111111-1111-1111-1111-111111111111', 'arquivo-fictício.xlsx', 10, 10, 'gravado', '0a000000-0000-0000-0000-000000000001');
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select public.registrar_pedido_demonstracao('Pessoa Fictícia', '', 'Órgão Fictício', 'a@exemplo.test', 'h9', null, '', '');
reset role;
set local role authenticated;
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select is((select count(*) from public.equipe_lotes()), 1::bigint, 'equipe vê o lote');
select is((select count(*) from public.equipe_importacoes_tce()), 2::bigint, 'equipe vê o histórico do TCE');
select is((select count(*) from public.equipe_auditoria() where acao = 'equipe.pedido_recebido'), 1::bigint, 'pedido recebido aparece na auditoria da equipe');
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select * from public.equipe_lotes()$$, '42501', null, 'administrador de prefeitura não lê lotes de todas');
select throws_ok($$select * from public.equipe_importacoes_tce()$$, '42501', null, 'administrador de prefeitura não lê o histórico');

reset role;
set local role anon;
select throws_ok($$select * from public.equipe_integracoes()$$, '42501', null, 'anon não executa integrações');
select throws_ok($$select * from public.equipe_auditoria()$$, '42501', null, 'anon não executa auditoria');
select throws_ok($$select * from public.equipe_lotes()$$, '42501', null, 'anon não executa lotes');

select * from finish();
rollback;
