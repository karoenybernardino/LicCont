-- Fase 6 · Empréstimos: isolamento e permissões.
--   1. outra prefeitura não lê nem registra empréstimo;
--   2. consulta não registra nem devolve; operador de outra secretaria não;
--   3. um empréstimo aberto por documento; documento inativo recusado;
--   4. devolução marca a linha e não se desfaz; nada é apagado;
--   5. documento emprestado não muda de caixa;
--   6. auditoria sem o nome de quem retirou; anon sem privilégio.
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

-- Operador só em Obras; consulta em Saúde.
insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000000', 'operador'),
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
  ('c3a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c2a00000-0000-0000-0000-000000000000', 1, 3),
  ('c3b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c2b00000-0000-0000-0000-000000000000', 1, 3);
insert into public.caixas (id, prefeitura_id, nivel_id, numero, capacidade_documentos) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1, 5),
  ('c4a00000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 2, 5),
  ('c4b00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 1, 5);

-- Documentos: Saúde A, Obras A, Obras A inativo e um de B.
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, situacao, ativo) values
  ('d0a10000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'pregao_eletronico', '015/2023', 2023, 'Equipamentos fictícios', 'concluida', true),
  ('d0a20000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000002', 'licitacao', 'concorrencia', '003/2022', 2022, 'Pavimentação fictícia', 'concluida', true),
  ('d0a30000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000002', 'licitacao', 'concorrencia', '004/2022', 2022, 'Obra inativa fictícia', 'concluida', false),
  ('d0b10000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001', 'licitacao', 'dispensa', '001/2024', 2024, 'Material fictício', 'concluida', true);

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Administrador A registra
-- ---------------------------------------------------------------------------
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$select public.registrar_emprestimo('d0a10000-0000-0000-0000-000000000000', 'Pessoa Fictícia', 'Setor Fictício', current_date, current_date + 10, 'obs')$$,
  'administrador registra empréstimo');
select throws_ok($$select public.registrar_emprestimo('d0a10000-0000-0000-0000-000000000000', 'Outra Pessoa', 'Setor', current_date, current_date + 10, null)$$,
  '23505', null, 'um empréstimo aberto por documento');
select throws_ok($$select public.registrar_emprestimo('d0a30000-0000-0000-0000-000000000000', 'Pessoa', 'Setor', current_date, current_date + 10, null)$$,
  '23514', null, 'documento inativo recusado');
select throws_ok($$select public.registrar_emprestimo('d0a20000-0000-0000-0000-000000000000', 'Pessoa', 'Setor', current_date, current_date + 61, null)$$,
  '23514', null, 'prazo máximo de 60 dias');
select throws_ok($$select public.registrar_emprestimo('d0a20000-0000-0000-0000-000000000000', 'Pessoa', 'Setor', current_date + 5, current_date + 10, null)$$,
  '23514', null, 'retirada no futuro recusada');
select throws_ok($$select public.registrar_emprestimo('d0b10000-0000-0000-0000-000000000000', 'Pessoa', 'Setor', current_date, current_date + 10, null)$$,
  '42501', null, 'não empresta documento de outra prefeitura');
select throws_ok($$insert into public.emprestimos (prefeitura_id, secretaria_id, documento_id, caixa_id, retirado_por_nome, retirado_por_setor, retirado_em, prazo_em)
  values ('11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'd0a20000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000002', 'x', 'y', current_date, current_date + 1)$$,
  '42501', null, 'sem INSERT direto na tabela');

-- Documento emprestado não muda de caixa nem é desativado.
select throws_ok($$update public.documentos set caixa_id = 'c4a00000-0000-0000-0000-000000000002' where id = 'd0a10000-0000-0000-0000-000000000000'$$,
  '23514', null, 'emprestado não muda de caixa');
select throws_ok($$update public.documentos set ativo = false where id = 'd0a10000-0000-0000-0000-000000000000'$$,
  '23514', null, 'emprestado não é desativado');

-- ---------------------------------------------------------------------------
-- Administrador B: não vê, não devolve
-- ---------------------------------------------------------------------------
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is_empty($$select 1 from public.emprestimos$$, 'B não lê empréstimo de A');
select throws_ok($$select public.devolver_emprestimo((select id from (select id from public.emprestimos union all select '00000000-0000-0000-0000-000000000000'::uuid) x limit 1))$$,
  '42501', null, 'B não devolve empréstimo de A');

-- ---------------------------------------------------------------------------
-- Papéis em A
-- ---------------------------------------------------------------------------
-- Consulta lê (Saúde), mas não registra nem devolve.
select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select results_eq($$select count(*)::int from public.emprestimos$$, array[1], 'consulta lê empréstimo da própria secretaria');
select throws_ok($$select public.registrar_emprestimo('d0a10000-0000-0000-0000-000000000000', 'P', 'S', current_date, current_date + 1, null)$$,
  '42501', null, 'consulta não registra');
select throws_ok($$select public.devolver_emprestimo((select id from public.emprestimos limit 1))$$,
  '42501', null, 'consulta não devolve');

-- Operador de Obras não vê nem mexe em empréstimo da Saúde.
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select is_empty($$select 1 from public.emprestimos$$, 'operador de Obras não lê empréstimo da Saúde');
select lives_ok($$select public.registrar_emprestimo('d0a20000-0000-0000-0000-000000000000', 'Pessoa Fictícia', 'Setor', current_date, current_date + 5, null)$$,
  'operador registra na própria secretaria');
select lives_ok($$select public.devolver_emprestimo((select id from public.emprestimos limit 1))$$, 'operador devolve');
select throws_ok($$select public.devolver_emprestimo((select id from public.emprestimos limit 1))$$, '23514', null, 'não devolve duas vezes');
select throws_ok($$update public.emprestimos set prazo_em = prazo_em + 1$$, '42501', null, 'sem UPDATE direto');

-- Devolvido libera o documento: pode emprestar de novo e mudar de caixa.
select lives_ok($$update public.documentos set caixa_id = 'c4a00000-0000-0000-0000-000000000001' where id = 'd0a20000-0000-0000-0000-000000000000'$$,
  'devolvido volta a poder mudar de caixa');
select lives_ok($$select public.registrar_emprestimo('d0a20000-0000-0000-0000-000000000000', 'Pessoa Fictícia', 'Setor', current_date, current_date + 5, null)$$,
  'documento devolvido pode ser emprestado de novo');

-- ---------------------------------------------------------------------------
-- Auditoria e privilégios
-- ---------------------------------------------------------------------------
reset role;
select ok(exists (select 1 from public.auditoria where acao = 'emprestimos.retirada'), 'retirada na auditoria');
select ok(exists (select 1 from public.auditoria where acao = 'emprestimos.devolucao'), 'devolução na auditoria');
select ok(not exists (select 1 from public.auditoria
  where acao like 'emprestimos.%' and (depois::text like '%Pessoa Fictícia%' or depois::text like '%retirado_por_nome%')),
  'auditoria sem o nome de quem retirou');
select throws_ok($$delete from public.emprestimos$$, '42501', null, 'nem o dono apaga empréstimo');
select table_privs_are('public', 'emprestimos', 'anon', array[]::text[], 'anon sem privilégio em emprestimos');
select table_privs_are('public', 'emprestimos', 'authenticated', array['SELECT'], 'authenticated só lê emprestimos');
select ok(not has_function_privilege('anon', 'public.registrar_emprestimo(uuid, text, text, date, date, text)', 'execute'), 'anon não registra');
select ok(not has_function_privilege('anon', 'public.devolver_emprestimo(uuid)', 'execute'), 'anon não devolve');

select * from finish();
rollback;
