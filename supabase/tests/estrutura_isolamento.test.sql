-- Fase 2 · Estrutura física. Prova os critérios 1 a 5 de docs/fases/fase-2.md:
--   1. ninguém lê, inclui nem altera estrutura de outra prefeitura;
--   2. papéis: toda a prefeitura lê (qualquer secretaria), só o
--      administrador monta, administrador e coordenador mexem em caixas,
--      equipe não lê, anon e service_role sem privilégio, ninguém apaga;
--   3. capacidade: posição além da capacidade, capacidade abaixo das
--      caixas e desativação com caixa ativa são recusadas;
--   4. ocupação calculada pela visão, com RLS;
--   5. auditoria por gatilho.
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
  ('0a000000-0000-0000-0000-000000000001', 'admin.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000002', 'coord.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000003', 'operador.a@exemplo.test'),
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
  ('0a000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Operador A', false, false),
  ('0a000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Consulta A', false, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Admin B', true, false);

-- Operador e consulta só em Obras; coordenador só em Saúde.
insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000000', 'coordenador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000000', 'operador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000000', 'consulta');

insert into public.equipe_liccont (usuario_id) values ('0e000000-0000-0000-0000-000000000001');

-- Estrutura A: Galpão A > Rua A > Módulo 1 > Nível 1 (capacidade 2) com a caixa 1.
-- Estrutura B: Galpão B > Rua A > Módulo 1 > Nível 1 (capacidade 3) com a caixa 1.
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
  ('c3b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c2b00000-0000-0000-0000-000000000000', 1, 3);
insert into public.caixas (id, prefeitura_id, nivel_id, numero) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1),
  ('c4b00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 1);

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Privilégios: sem anon, sem service_role, sem DELETE para ninguém
-- ---------------------------------------------------------------------------
select table_privs_are('public', t, 'anon', array[]::text[], 'anon sem privilégio em ' || t)
from unnest(array['galpoes', 'ruas', 'modulos', 'niveis', 'caixas', 'estrutura_ocupacao']) as t;
select table_privs_are('public', t, 'service_role', array[]::text[], 'service_role sem privilégio em ' || t)
from unnest(array['galpoes', 'ruas', 'modulos', 'niveis', 'caixas', 'estrutura_ocupacao']) as t;
select table_privs_are('public', t, 'authenticated', array['SELECT'], 'authenticated só lê a tabela inteira de ' || t)
from unnest(array['galpoes', 'ruas', 'modulos', 'niveis', 'caixas', 'estrutura_ocupacao']) as t;
select ok(not has_column_privilege('authenticated', 'public.' || t, 'prefeitura_id', 'update'),
  'prefeitura_id de ' || t || ' não muda')
from unnest(array['galpoes', 'ruas', 'modulos', 'niveis', 'caixas']) as t;
select ok(not has_column_privilege('authenticated', 'public.niveis', 'modulo_id', 'update'), 'nível não muda de módulo');
select ok(not has_column_privilege('authenticated', 'public.caixas', 'nivel_id', 'update'), 'caixa não muda de nível pela API');
select ok(not has_function_privilege('anon', 'public.adicionar_modulos(uuid, int, int, int)', 'execute'), 'anon não gera módulos');
select ok(not has_function_privilege('anon', 'public.adicionar_caixas(uuid, int)', 'execute'), 'anon não cadastra caixas');

-- A chave composta impede filho apontar para pai de outra prefeitura.
select throws_ok($$insert into public.ruas (prefeitura_id, galpao_id, codigo)
  values ('11111111-1111-1111-1111-111111111111', 'c0b00000-0000-0000-0000-000000000000', 'Z')$$,
  '23503', null, 'rua da prefeitura A não entra no galpão da B (nem como dono)');
select throws_ok($$insert into public.caixas (prefeitura_id, nivel_id, numero)
  values ('22222222-2222-2222-2222-222222222222', 'c3a00000-0000-0000-0000-000000000000', 2)$$,
  '23503', null, 'caixa da prefeitura B não entra no nível da A (nem como dono)');

-- ---------------------------------------------------------------------------
-- Consulta A (vínculo só em Obras): lê toda a estrutura da prefeitura, não escreve
-- ---------------------------------------------------------------------------
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select results_eq('select nome from public.galpoes', array['Galpão A'], 'consulta A lê só o galpão da própria prefeitura');
select results_eq('select count(*)::int from public.caixas', array[1], 'consulta A lê as caixas da própria prefeitura (estrutura compartilhada)');
select results_eq('select count(*)::int from public.estrutura_ocupacao', array[1], 'consulta A vê só a ocupação da própria prefeitura');
select throws_ok($$insert into public.galpoes (prefeitura_id, nome) values ('11111111-1111-1111-1111-111111111111', 'Novo')$$,
  '42501', null, 'consulta A não cria galpão');
select throws_ok($$insert into public.caixas (prefeitura_id, nivel_id, numero) values ('11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 2)$$,
  '42501', null, 'consulta A não cria caixa');
select is_empty($$update public.caixas set ativo = false returning id$$, 'consulta A não desativa caixa');
select throws_ok($$select public.adicionar_caixas('c3a00000-0000-0000-0000-000000000000', 1)$$,
  '42501', null, 'consulta A não cadastra caixa em lote');
select throws_ok($$delete from public.caixas$$, '42501', null, 'consulta A não apaga caixa');

-- ---------------------------------------------------------------------------
-- Operador A (só Obras): lê, não escreve
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select results_eq('select codigo from public.ruas', array['A'], 'operador A lê as ruas da própria prefeitura');
select throws_ok($$insert into public.ruas (prefeitura_id, galpao_id, codigo) values ('11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'B')$$,
  '42501', null, 'operador A não cria rua');
select is_empty($$update public.niveis set capacidade = 10 returning id$$, 'operador A não altera capacidade');
select throws_ok($$select public.adicionar_caixas('c3a00000-0000-0000-0000-000000000000', 1)$$,
  '42501', null, 'operador A não cadastra caixa');
select throws_ok($$insert into public.caixas (prefeitura_id, nivel_id, numero) values ('11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 2)$$,
  '42501', null, 'operador A não inclui caixa direto');

-- ---------------------------------------------------------------------------
-- Coordenador A: mexe em caixas, não monta a estrutura
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select is(public.adicionar_caixas('c3a00000-0000-0000-0000-000000000000', 1), 1, 'coordenador A cadastra caixa');
select throws_ok($$select public.adicionar_caixas('c3a00000-0000-0000-0000-000000000000', 1)$$,
  'LC001', null, 'nível cheio: caixa além da capacidade é recusada');
select throws_ok($$insert into public.caixas (prefeitura_id, nivel_id, numero) values ('11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 3)$$,
  'LC001', null, 'posição acima da capacidade é recusada');
select throws_ok($$insert into public.caixas (prefeitura_id, nivel_id, numero) values ('11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1)$$,
  '23505', null, 'duas caixas na mesma posição não passam');
select throws_ok($$select public.adicionar_caixas('c3b00000-0000-0000-0000-000000000000', 1)$$,
  '42501', null, 'coordenador A não cadastra caixa na prefeitura B');
select throws_ok($$insert into public.caixas (prefeitura_id, nivel_id, numero) values ('22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 2)$$,
  '42501', null, 'coordenador A não inclui caixa na prefeitura B (WITH CHECK)');
select is_empty($$update public.caixas set ativo = false where id = 'c4b00000-0000-0000-0000-000000000001' returning id$$,
  'coordenador A não desativa caixa da prefeitura B');
select throws_ok($$select public.adicionar_modulos('c1a00000-0000-0000-0000-000000000000', 1, 1, 1)$$,
  '42501', null, 'coordenador A não gera módulos');
select is_empty($$update public.niveis set capacidade = 10 returning id$$, 'coordenador A não altera capacidade');
select isnt_empty($$update public.caixas set ativo = false where id = 'c4a00000-0000-0000-0000-000000000001' returning id$$,
  'coordenador A desativa caixa');
-- Sem oráculo: nível de outra prefeitura dá sempre o mesmo erro, qualquer que seja a posição.
select throws_ok($$insert into public.caixas (prefeitura_id, nivel_id, numero) values ('11111111-1111-1111-1111-111111111111', 'c3b00000-0000-0000-0000-000000000000', 1)$$,
  '42501', null, 'posição ocupada em nível da B: mesmo erro genérico');
select throws_ok($$insert into public.caixas (prefeitura_id, nivel_id, numero) values ('11111111-1111-1111-1111-111111111111', 'c3b00000-0000-0000-0000-000000000000', 99)$$,
  '42501', null, 'posição acima da capacidade em nível da B: mesmo erro genérico');
select throws_ok($$insert into public.galpoes (prefeitura_id, nome) values ('11111111-1111-1111-1111-111111111111', 'Galpão do Coordenador')$$,
  '42501', null, 'coordenador A não cria galpão');
select throws_ok($$insert into public.niveis (prefeitura_id, modulo_id, numero, capacidade) values ('11111111-1111-1111-1111-111111111111', 'c2a00000-0000-0000-0000-000000000000', 5, 2)$$,
  '42501', null, 'coordenador A não cria nível');
-- Desde a Fase 4 a política deixa o coordenador chegar à linha (para a planta);
-- o gatilho app.planta_confere recusa tudo que não é planta.
select throws_ok($$update public.ruas set ativo = false$$, '42501', null, 'coordenador A não desativa rua');
select throws_ok($$update public.caixas set numero = 2$$, '42501', null, 'número da caixa não muda pela API');

-- ---------------------------------------------------------------------------
-- Administrador A sem o segundo fator (obrigatório): não escreve
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal1');
select throws_ok($$insert into public.galpoes (prefeitura_id, nome) values ('11111111-1111-1111-1111-111111111111', 'Galpão Sem Fator')$$,
  '42501', null, 'administrador sem segundo fator não cria galpão');
select throws_ok($$select public.adicionar_modulos('c1a00000-0000-0000-0000-000000000000', 1, 1, 1)$$,
  '42501', null, 'administrador sem segundo fator não gera módulos');

-- ---------------------------------------------------------------------------
-- Administrador A com o segundo fator: monta a estrutura
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$insert into public.ruas (prefeitura_id, galpao_id, codigo) values ('11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'B')$$,
  'administrador A cria rua');
select is(public.adicionar_modulos('c1a00000-0000-0000-0000-000000000000', 2, 3, 4), 2,
  'adicionar_modulos numera depois do último módulo');
select results_eq($$select count(*)::int from public.niveis n join public.modulos m on m.id = n.modulo_id
  where m.rua_id = 'c1a00000-0000-0000-0000-000000000000' and n.capacidade = 4$$, array[6],
  'adicionar_modulos cria os níveis com a capacidade escolhida');
select throws_ok($$select public.adicionar_modulos('c1a00000-0000-0000-0000-000000000000', 21, 1, 1)$$,
  '22023', null, 'mais de 20 módulos por vez é recusado');
select throws_ok($$select public.adicionar_modulos('c1b00000-0000-0000-0000-000000000000', 1, 1, 1)$$,
  '42501', null, 'administrador A não gera módulos na prefeitura B');
select throws_ok($$insert into public.galpoes (prefeitura_id, nome) values ('22222222-2222-2222-2222-222222222222', 'Invasor')$$,
  '42501', null, 'administrador A não cria galpão na prefeitura B (WITH CHECK)');
select is_empty($$update public.galpoes set nome = 'Alterado' where id = 'c0b00000-0000-0000-0000-000000000000' returning id$$,
  'administrador A não altera galpão da prefeitura B');
select throws_ok($$update public.galpoes set prefeitura_id = '22222222-2222-2222-2222-222222222222'$$,
  '42501', null, 'administrador A não muda a prefeitura do galpão');
select throws_ok($$delete from public.galpoes$$, '42501', null, 'administrador A não apaga galpão');
select throws_ok($$insert into public.modulos (prefeitura_id, rua_id, numero) values ('11111111-1111-1111-1111-111111111111', 'c1b00000-0000-0000-0000-000000000000', 1)$$,
  '42501', null, 'administrador A não cria módulo em rua da B (mesmo número já usado lá: sem oráculo)');
select throws_ok($$insert into public.caixas (prefeitura_id, nivel_id, numero) values ('22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 2)$$,
  '42501', null, 'administrador A não inclui caixa na B');
select is_empty($$update public.niveis set capacidade = 9 where id = 'c3b00000-0000-0000-0000-000000000000' returning id$$,
  'administrador A não altera nível da B');

-- Capacidade e desativação.
select is(public.adicionar_caixas('c3a00000-0000-0000-0000-000000000000', 1), 1,
  'adicionar_caixas reativa a caixa desativada antes de ocupar posição nova');
select results_eq($$select count(*)::int from public.caixas where nivel_id = 'c3a00000-0000-0000-0000-000000000000'$$,
  array[2], 'reativar não duplica a caixa');
select throws_ok($$update public.niveis set capacidade = 1 where id = 'c3a00000-0000-0000-0000-000000000000'$$,
  'LC002', null, 'capacidade menor que as caixas guardadas é recusada');
select throws_ok($$update public.niveis set ativo = false where id = 'c3a00000-0000-0000-0000-000000000000'$$,
  'LC003', null, 'nível com caixa ativa não é desativado');
select throws_ok($$update public.modulos set ativo = false where id = 'c2a00000-0000-0000-0000-000000000000'$$,
  'LC003', null, 'módulo com caixa ativa não é desativado');
select throws_ok($$update public.ruas set ativo = false where id = 'c1a00000-0000-0000-0000-000000000000'$$,
  'LC003', null, 'rua com caixa ativa não é desativada');
select throws_ok($$update public.galpoes set ativo = false where id = 'c0a00000-0000-0000-0000-000000000000'$$,
  'LC003', null, 'galpão com caixa ativa não é desativado');
select lives_ok($$update public.caixas set ativo = false where nivel_id = 'c3a00000-0000-0000-0000-000000000000'$$,
  'administrador A desativa as caixas');
select lives_ok($$update public.niveis set capacidade = 1, ativo = false where id = 'c3a00000-0000-0000-0000-000000000000'$$,
  'nível vazio pode diminuir e ser desativado');
select throws_ok($$select public.adicionar_caixas('c3a00000-0000-0000-0000-000000000000', 1)$$,
  'LC004', null, 'caixa não entra em nível desativado');

-- Ocupação calculada (sem coluna gravada).
select results_eq($$select capacidade, caixas from public.estrutura_ocupacao
  where nivel_id = 'c3a00000-0000-0000-0000-000000000000'$$,
  $$values (1::smallint, 0)$$, 'a ocupação acompanha as caixas ativas');
select hasnt_column('public', 'niveis', 'ocupacao', 'nenhuma ocupação gravada em níveis');

-- Auditoria por gatilho.
select isnt_empty($$select 1 from public.auditoria where acao = 'caixas.insert'$$, 'inclusão de caixa entra na auditoria');
select isnt_empty($$select 1 from public.auditoria where acao = 'niveis.update'$$, 'alteração de nível entra na auditoria');
select isnt_empty($$select 1 from public.auditoria where acao = 'modulos.insert'$$, 'módulo gerado entra na auditoria');

-- ---------------------------------------------------------------------------
-- Administrador B: não vê nada da prefeitura A
-- ---------------------------------------------------------------------------
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select results_eq('select nome from public.galpoes', array['Galpão B'], 'administrador B vê só o próprio galpão');
select results_eq('select count(*)::int from public.niveis', array[1], 'administrador B vê só os próprios níveis');
select is_empty($$select 1 from public.estrutura_ocupacao where prefeitura_id = '11111111-1111-1111-1111-111111111111'$$,
  'administrador B não vê a ocupação da prefeitura A');

-- ---------------------------------------------------------------------------
-- Equipe LicCONT: não lê a estrutura
-- ---------------------------------------------------------------------------
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select is_empty('select 1 from public.galpoes', 'equipe não lê galpões');
select is_empty('select 1 from public.caixas', 'equipe não lê caixas');
select throws_ok($$insert into public.galpoes (prefeitura_id, nome) values ('11111111-1111-1111-1111-111111111111', 'Galpão da Equipe')$$,
  '42501', null, 'equipe não cria galpão');

reset role;
select * from finish();
rollback;
