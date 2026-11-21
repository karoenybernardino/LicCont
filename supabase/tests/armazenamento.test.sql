-- Limite de armazenamento por prefeitura (docs/fases/limite-armazenamento.md):
--   1. envio que passa do limite é recusado (LC007); troca de PDF conta só a diferença;
--   2. o uso de uma prefeitura não bloqueia a outra, e o gatilho não revela o uso
--      de outra prefeitura (quem tenta enviar para B recebe 42501, não LC007);
--   3. dois envios pendentes que cabiam sozinhos: a conferência do segundo (com o
--      tamanho medido pelo servidor) recusa com sem_espaco;
--   4. a equipe recebe o limite em equipe_uso_prefeituras.
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
  ('0b000000-0000-0000-0000-000000000001', 'admin.b@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5b000000-0000-0000-0000-000000000001', '0b000000-0000-0000-0000-000000000001');
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin A', true, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Admin B', true, false);

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
insert into public.caixas (id, prefeitura_id, nivel_id, numero) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1),
  ('c4b00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 1);
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto) values
  ('d0a10000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'convite', '1/2024', 2024, 'Objeto fictício um'),
  ('d0a20000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'convite', '2/2024', 2024, 'Objeto fictício dois'),
  ('d0a30000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'convite', '3/2024', 2024, 'Objeto fictício três'),
  ('d0b10000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001', 'licitacao', 'convite', '1/2024', 2024, 'Objeto fictício B'),
  ('d0b20000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001', 'licitacao', 'convite', '2/2024', 2024, 'Objeto fictício B dois');

create function public.tst_entrar(p_uid uuid, p_sessao uuid)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', 'aal2')::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid) to authenticated;

select is((select limite_armazenamento_mb from public.prefeituras where id = '11111111-1111-1111-1111-111111111111'), 10240, 'padrão: 10 GB por prefeitura');

-- Limite de 1 MB (1.048.576 bytes) nas duas; A já usa 900 mil bytes no documento 1.
update public.prefeituras set limite_armazenamento_mb = 1;
insert into public.arquivos (id, prefeitura_id, secretaria_id, documento_id, nome_original, tamanho, enviado_por)
values ('f0a10000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000',
        'd0a10000-0000-0000-0000-000000000000', 'a.pdf', 900000, '0a000000-0000-0000-0000-000000000001');
update public.arquivos set situacao = 'pronto', ativo = true where id = 'f0a10000-0000-0000-0000-000000000000';
-- B está cheia.
insert into public.arquivos (id, prefeitura_id, secretaria_id, documento_id, nome_original, tamanho, enviado_por)
values ('f0b10000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000',
        'd0b10000-0000-0000-0000-000000000000', 'b.pdf', 1048576, '0b000000-0000-0000-0000-000000000001');
update public.arquivos set situacao = 'pronto', ativo = true where id = 'f0b10000-0000-0000-0000-000000000000';

set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001');
select throws_ok($$insert into public.arquivos (prefeitura_id, secretaria_id, documento_id, nome_original, tamanho)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'd0a20000-0000-0000-0000-000000000000', 'x.pdf', 200000)$$,
  'LC007', null, 'envio que passa do limite é recusado');
select lives_ok($$insert into public.arquivos (prefeitura_id, secretaria_id, documento_id, nome_original, tamanho)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'd0a20000-0000-0000-0000-000000000000', 'y.pdf', 100000)$$,
  'envio que cabe passa');
select lives_ok($$insert into public.arquivos (prefeitura_id, secretaria_id, documento_id, nome_original, tamanho)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'd0a30000-0000-0000-0000-000000000000', 'z.pdf', 100000)$$,
  'outro envio que cabe sozinho também passa (ainda não conferido)');
select lives_ok($$insert into public.arquivos (prefeitura_id, secretaria_id, documento_id, nome_original, tamanho)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'd0a10000-0000-0000-0000-000000000000', 't.pdf', 1000000)$$,
  'troca de PDF conta só a diferença (o antigo deixa de contar)');
select throws_ok($$insert into public.arquivos (prefeitura_id, secretaria_id, documento_id, nome_original, tamanho)
  values ('22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'd0b10000-0000-0000-0000-000000000000', 'x.pdf', 10)$$,
  '42501', null, 'A não envia para B e não descobre que B está cheia');

select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001');
select throws_ok($$insert into public.arquivos (prefeitura_id, secretaria_id, documento_id, nome_original, tamanho)
  values ('22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'd0b20000-0000-0000-0000-000000000000', 'x.pdf', 10)$$,
  'LC007', null, 'B cheia não recebe envio');
reset role;
update public.arquivos set ativo = false, situacao = 'recusado' where id = 'f0b10000-0000-0000-0000-000000000000';
set local role authenticated;
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001');
select lives_ok($$insert into public.arquivos (prefeitura_id, secretaria_id, documento_id, nome_original, tamanho)
  values ('22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'd0b10000-0000-0000-0000-000000000000', 'w.pdf', 1000000)$$,
  'o uso de A não conta para B');

-- Dois envios de A que cabiam sozinhos: o servidor conclui um depois do outro; o segundo não cabe.
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001');
select lives_ok($$select public.marcar_conferindo((select id from public.arquivos where documento_id = 'd0a20000-0000-0000-0000-000000000000'))$$, 'marca o primeiro');
select lives_ok($$select public.marcar_conferindo((select id from public.arquivos where documento_id = 'd0a30000-0000-0000-0000-000000000000'))$$, 'marca o segundo');
reset role;
select set_config('t.a2', (select id::text from public.arquivos where documento_id = 'd0a20000-0000-0000-0000-000000000000'), true);
select set_config('t.a3', (select id::text from public.arquivos where documento_id = 'd0a30000-0000-0000-0000-000000000000'), true);
set local role service_role;
select is(public.concluir_conferencia('0a000000-0000-0000-0000-000000000001', current_setting('t.a2')::uuid, true,
  repeat('a', 64), 100000, 1, null, '{}', false), null, 'o primeiro fica pronto');
select is(public.concluir_conferencia('0a000000-0000-0000-0000-000000000001', current_setting('t.a3')::uuid, true,
  repeat('a', 64), 100000, 1, null, '{}', false), 'sem_espaco', 'o segundo é recusado por falta de espaço');
reset role;
select results_eq($$select situacao, ativo, motivo_recusa from public.arquivos where documento_id = 'd0a30000-0000-0000-0000-000000000000'$$,
  $$values ('recusado'::text, false, 'sem_espaco'::text)$$, 'e fica recusado, inativo');
select is((select sum(tamanho)::bigint from public.arquivos where prefeitura_id = '11111111-1111-1111-1111-111111111111' and ativo), 1000000::bigint,
  'o uso de A ficou dentro do limite');

-- Equipe: o limite vem junto do uso.
select ok(pg_get_function_result('public.equipe_uso_prefeituras()'::regprocedure) like '%limite_bytes bigint%', 'equipe_uso_prefeituras devolve limite_bytes');
select ok(has_function_privilege('authenticated', 'public.equipe_uso_prefeituras()', 'execute'), 'a função recriada continua executável pela sessão');
select ok(not has_function_privilege('anon', 'public.equipe_uso_prefeituras()', 'execute'), 'anon não executa o uso');
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001');
select throws_ok($$select * from public.equipe_uso_prefeituras()$$, '42501', null, 'administrador de prefeitura não vê o uso da equipe');
reset role;
select ok(not has_function_privilege('authenticated', 'app.armazenamento_cabe(uuid, uuid, bigint)', 'execute'), 'quem usa o sistema não consulta o uso direto');
select ok(not has_function_privilege('anon', 'app.armazenamento_cabe(uuid, uuid, bigint)', 'execute'), 'anon não consulta o uso');

select * from finish();
rollback;
