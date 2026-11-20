-- Fase 4 · Mapa. Prova o critério 7 de docs/fases/fase-4.md:
--   1. planta_elementos: outra prefeitura não lê, não inclui e não altera;
--      Operador e Consulta leem e não escrevem; administrador e coordenador
--      escrevem; anon e service_role sem privilégio; ninguém apaga; a chave
--      composta dá o mesmo erro para galpão de outra prefeitura e inexistente;
--   2. colunas da planta em galpoes e ruas: o coordenador altera só elas;
--   3. ocupacao_galpao: só números; outra prefeitura = inexistente = vazio;
--   4. mover_documentos: todos mudam ou nenhum muda, sem oráculo, com
--      auditoria da caixa de antes e de depois.
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
  ('0a000000-0000-0000-0000-000000000002', 'coord.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000003', 'operador.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000004', 'consulta.a@exemplo.test'),
  ('0b000000-0000-0000-0000-000000000001', 'admin.b@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000002', '0a000000-0000-0000-0000-000000000002'),
  ('5a000000-0000-0000-0000-000000000003', '0a000000-0000-0000-0000-000000000003'),
  ('5a000000-0000-0000-0000-000000000004', '0a000000-0000-0000-0000-000000000004'),
  ('5b000000-0000-0000-0000-000000000001', '0b000000-0000-0000-0000-000000000001');
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin A', true, false),
  ('0a000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Coord A', false, false),
  ('0a000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Operador A', false, false),
  ('0a000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Consulta A', false, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Admin B', true, false);
-- Coordenador na Saúde; operador e consulta só em Obras.
insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000000', 'coordenador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000000', 'operador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000000', 'consulta');

-- Estrutura: A tem Rua A > M1 > N1 com 3 caixas (a 3 desativada); B tem uma caixa.
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
  ('c3b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c2b00000-0000-0000-0000-000000000000', 1, 2);
insert into public.caixas (id, prefeitura_id, nivel_id, numero, capacidade_documentos) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1, 5),
  ('c4a00000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 2, 1),
  ('c4a00000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 3, 5),
  ('c4b00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 1, 5);
update public.caixas set ativo = false where id = 'c4a00000-0000-0000-0000-000000000003';

-- Documentos: um da Saúde e dois de Obras na caixa 1 da A; um da B.
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto) values
  ('d0a10000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'pregao_eletronico', '015/2023', 2023, 'Aquisição de equipamentos'),
  ('d0a20000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'concorrencia', '003/2022', 2022, 'Pavimentação de vias'),
  ('d0a30000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'concorrencia', '004/2022', 2022, 'Drenagem urbana'),
  ('d0b10000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001', 'licitacao', 'dispensa', '001/2024', 2024, 'Material de escritório');

-- Um elemento da planta em cada prefeitura (como dono do banco).
insert into public.planta_elementos (id, prefeitura_id, galpao_id, tipo, rotulo, x, y) values
  ('e0a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'pilar', null, 3, 3),
  ('e0b00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c0b00000-0000-0000-0000-000000000000', 'pilar', null, 3, 3);

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Privilégios e chave composta
-- ---------------------------------------------------------------------------
select table_privs_are('public', 'planta_elementos', 'anon', array[]::text[], 'anon sem privilégio em planta_elementos');
select table_privs_are('public', 'planta_elementos', 'service_role', array[]::text[], 'service_role sem privilégio em planta_elementos');
select table_privs_are('public', 'planta_elementos', 'authenticated', array['SELECT'], 'authenticated só lê a tabela inteira de planta_elementos');
select ok(not has_column_privilege('authenticated', 'public.planta_elementos', 'prefeitura_id', 'update'), 'prefeitura_id do elemento não muda');
select ok(not has_column_privilege('authenticated', 'public.planta_elementos', 'galpao_id', 'update'), 'elemento não muda de galpão');
select ok(not has_function_privilege('anon', 'public.ocupacao_galpao(uuid)', 'execute'), 'anon não executa ocupacao_galpao');
select ok(not has_function_privilege('anon', 'public.mover_documentos(uuid[], uuid)', 'execute'), 'anon não executa mover_documentos');
select ok(not has_function_privilege('anon', 'public.salvar_planta(uuid, numeric, numeric, text, numeric, jsonb, jsonb, numeric)', 'execute'), 'anon não executa salvar_planta');
select ok(has_function_privilege('authenticated', 'public.mover_documentos(uuid[], uuid)', 'execute'), 'authenticated executa mover_documentos');
select throws_ok($$insert into public.planta_elementos (prefeitura_id, galpao_id, tipo, x, y)
  values ('11111111-1111-1111-1111-111111111111', 'c0b00000-0000-0000-0000-000000000000', 'pilar', 1, 1)$$,
  '23503', null, 'elemento da prefeitura A não entra no galpão da B');
select throws_ok($$insert into public.planta_elementos (prefeitura_id, galpao_id, tipo, x, y)
  values ('11111111-1111-1111-1111-111111111111', 'c0f00000-0000-0000-0000-000000000000', 'pilar', 1, 1)$$,
  '23503', null, 'galpão que não existe dá o mesmo erro');

-- ---------------------------------------------------------------------------
-- Consulta A (só Obras): lê, não escreve
-- ---------------------------------------------------------------------------
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select results_eq('select count(*)::int from public.planta_elementos', array[1], 'consulta A lê só os elementos da própria prefeitura');
select throws_ok($$insert into public.planta_elementos (prefeitura_id, galpao_id, tipo, x, y)
  values ('11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'porta', 1, 1)$$,
  '42501', null, 'consulta A não inclui elemento');
select is_empty($$update public.galpoes set planta_largura = 20 returning id$$, 'consulta A não desenha a planta do galpão');
select throws_ok($$delete from public.planta_elementos$$, '42501', null, 'consulta A não apaga elemento');
select throws_ok($$select public.mover_documentos(array['d0a20000-0000-0000-0000-000000000000']::uuid[], 'c4a00000-0000-0000-0000-000000000002')$$,
  'LC006', null, 'consulta A não move documento');

-- ---------------------------------------------------------------------------
-- Operador A (só Obras): lê, não escreve a planta; move os próprios documentos
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select results_eq('select count(*)::int from public.planta_elementos', array[1], 'operador A lê os elementos da própria prefeitura');
select throws_ok($$insert into public.planta_elementos (prefeitura_id, galpao_id, tipo, x, y)
  values ('11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'porta', 1, 1)$$,
  '42501', null, 'operador A não inclui elemento');
select is_empty($$update public.planta_elementos set x = 9 returning id$$, 'operador A não move elemento');
select is_empty($$update public.ruas set planta_x = 1, planta_y = 1 returning id$$, 'operador A não posiciona rua');

-- Ocupação do galpão: só números, só caixas ativas, todas as secretarias contam.
select results_eq($$select caixa_id, documentos, capacidade from public.ocupacao_galpao('c0a00000-0000-0000-0000-000000000000') order by caixa_id$$,
  $$values ('c4a00000-0000-0000-0000-000000000001'::uuid, 3, 5::smallint),
           ('c4a00000-0000-0000-0000-000000000002'::uuid, 0, 1::smallint)$$,
  'ocupação do galpão: caixas ativas com total de todas as secretarias');
select is_empty($$select 1 from public.ocupacao_galpao('c0b00000-0000-0000-0000-000000000000')$$,
  'galpão de outra prefeitura devolve vazio');
select is_empty($$select 1 from public.ocupacao_galpao('c0f00000-0000-0000-0000-000000000000')$$,
  'galpão que não existe devolve o mesmo vazio');

-- Mover: todos mudam ou nenhum muda.
select throws_ok($$select public.mover_documentos(array['d0a20000-0000-0000-0000-000000000000', 'd0a10000-0000-0000-0000-000000000000']::uuid[], 'c4a00000-0000-0000-0000-000000000002')$$,
  'LC006', null, 'um documento de outra secretaria desfaz o lote inteiro');
select results_eq($$select count(*)::int from public.documentos where caixa_id = 'c4a00000-0000-0000-0000-000000000001'$$,
  array[2], 'nenhum documento mudou de caixa depois do lote recusado');
select throws_ok($$select public.mover_documentos(array['d0b10000-0000-0000-0000-000000000000']::uuid[], 'c4a00000-0000-0000-0000-000000000002')$$,
  'LC006', null, 'documento de outra prefeitura: mesmo erro');
select throws_ok($$select public.mover_documentos(array['d0f00000-0000-0000-0000-000000000000']::uuid[], 'c4a00000-0000-0000-0000-000000000002')$$,
  'LC006', null, 'documento que não existe: mesmo erro');
select throws_ok($$select public.mover_documentos(array[]::uuid[], 'c4a00000-0000-0000-0000-000000000002')$$,
  'LC006', null, 'lista vazia é recusada');
select throws_ok($$select public.mover_documentos(array['d0a20000-0000-0000-0000-000000000000', 'd0a20000-0000-0000-0000-000000000000']::uuid[], 'c4a00000-0000-0000-0000-000000000002')$$,
  'LC006', null, 'lista com repetido é recusada');
select throws_ok($$select public.mover_documentos((select array_agg(gen_random_uuid()) from generate_series(1, 201)), 'c4a00000-0000-0000-0000-000000000002')$$,
  'LC006', null, 'mais de 200 de uma vez é recusado');
select throws_ok($$select public.mover_documentos(array['d0a20000-0000-0000-0000-000000000000']::uuid[], 'c4b00000-0000-0000-0000-000000000001')$$,
  '42501', null, 'caixa destino de outra prefeitura é recusada');
select throws_ok($$select public.mover_documentos(array['d0a20000-0000-0000-0000-000000000000']::uuid[], 'c4f00000-0000-0000-0000-000000000001')$$,
  '42501', null, 'caixa destino que não existe dá o mesmo erro');
select throws_ok($$select public.mover_documentos(array['d0a20000-0000-0000-0000-000000000000']::uuid[], 'c4a00000-0000-0000-0000-000000000003')$$,
  'LC004', null, 'caixa destino desativada da própria prefeitura é recusada');
select is(public.mover_documentos(array['d0a20000-0000-0000-0000-000000000000', 'd0a30000-0000-0000-0000-000000000000']::uuid[], 'c4a00000-0000-0000-0000-000000000002'), 2,
  'operador A move os 2 documentos de Obras');
select results_eq($$select count(*)::int from public.documentos where caixa_id = 'c4a00000-0000-0000-0000-000000000002'$$,
  array[2], 'a caixa destino passa da capacidade (1): avisa e deixa, a regra é só na tela');

-- ---------------------------------------------------------------------------
-- Coordenador A: desenha a planta, mas não renomeia nem desativa
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select isnt_empty($$update public.galpoes set planta_largura = 20, planta_profundidade = 12, entrada_lado = 'frente', entrada_posicao = 2 returning id$$,
  'coordenador A desenha o galpão');
select isnt_empty($$update public.ruas set planta_x = 3, planta_y = 1, planta_giro = 90 returning id$$, 'coordenador A posiciona a rua');
select throws_ok($$update public.galpoes set nome = 'Outro nome'$$, '42501', null, 'coordenador A não renomeia galpão');
select throws_ok($$update public.galpoes set ativo = false$$, '42501', null, 'coordenador A não desativa galpão');
select throws_ok($$update public.ruas set ativo = false$$, '42501', null, 'coordenador A não desativa rua');
select throws_ok($$update public.ruas set planta_x = 1, planta_y = 1, ativo = false$$, '42501', null, 'planta e desativação juntas também são recusadas');
select is_empty($$update public.galpoes set planta_largura = 30 where id = 'c0b00000-0000-0000-0000-000000000000' returning id$$,
  'coordenador A não desenha o galpão da B');
select lives_ok($$insert into public.planta_elementos (prefeitura_id, galpao_id, tipo, rotulo, x, y, largura, profundidade)
  values ('11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'area', 'Mesa de conferência', 5, 5, 3, 2)$$,
  'coordenador A inclui área com nome');
select throws_ok($$insert into public.planta_elementos (prefeitura_id, galpao_id, tipo, x, y)
  values ('22222222-2222-2222-2222-222222222222', 'c0b00000-0000-0000-0000-000000000000', 'porta', 1, 1)$$,
  '42501', null, 'coordenador A não inclui elemento na prefeitura B (WITH CHECK)');
select throws_ok($$insert into public.planta_elementos (prefeitura_id, galpao_id, tipo, x, y)
  values ('11111111-1111-1111-1111-111111111111', 'c0b00000-0000-0000-0000-000000000000', 'porta', 1, 1)$$,
  '23503', null, 'coordenador A não põe elemento seu no galpão da B (mesmo erro de galpão inexistente)');
select is_empty($$update public.planta_elementos set x = 9 where id = 'e0b00000-0000-0000-0000-000000000001' returning id$$,
  'coordenador A não move elemento da B');
select isnt_empty($$update public.planta_elementos set ativo = false where id = 'e0a00000-0000-0000-0000-000000000001' returning id$$,
  'coordenador A remove (desativa) elemento');
select throws_ok($$delete from public.planta_elementos$$, '42501', null, 'coordenador A não apaga elemento');
select throws_ok($$update public.ruas set planta_x = null$$, '23514', null, 'posição da rua precisa de coluna e linha juntas');
select throws_ok($$update public.galpoes set planta_largura = 0.5$$, '23514', null, 'galpão menor que 1 m é recusado');
select throws_ok($$update public.galpoes set planta_profundidade = 1001$$, '23514', null, 'galpão maior que 1.000 m é recusado');
select lives_ok($$update public.galpoes set planta_largura = 7.25, planta_profundidade = 9.6, entrada_posicao = 1.8$$, 'planta aceita metros com casas decimais');
select results_eq($$select planta_largura, planta_profundidade, entrada_posicao from public.galpoes where id = 'c0a00000-0000-0000-0000-000000000000'$$,
  $$values (7.25::numeric, 9.60::numeric, 1.80::numeric)$$, 'a planta ficou salva em metros');
select throws_ok($$update public.ruas set planta_x = 1001, planta_y = 1$$, '23514', null, 'rua fora de 0 a 1.000 m é recusada');
select throws_ok($$update public.galpoes set planta_metros_celula = null$$, '23502', null, 'metros por célula é obrigatório');
select throws_ok($$insert into public.planta_elementos (prefeitura_id, galpao_id, tipo, x, y, largura, profundidade)
  values ('11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'pilar', 1, 1, 0.01, 1)$$,
  '23514', null, 'elemento menor que 0,1 m é recusado');
select lives_ok($$insert into public.planta_elementos (prefeitura_id, galpao_id, tipo, x, y, largura, profundidade)
  values ('11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'pilar', 1.2, 3.6, 0.4, 0.4)$$,
  'elemento aceita metros com casas decimais');
select lives_ok($$select public.salvar_planta('c0a00000-0000-0000-0000-000000000000', 19.2, 14.4, 'frente', 2.4,
  '[{"id":"c1a00000-0000-0000-0000-000000000000","x":3.6,"y":1.2,"giro":0}]'::jsonb,
  '[{"tipo":"area","rotulo":"Sala","x":0.5,"y":0.5,"largura":2.4,"profundidade":1.8,"giro":0}]'::jsonb, 1.2)$$,
  'coordenador A salva a planta em metros');
select results_eq($$select planta_x, planta_y from public.ruas where id = 'c1a00000-0000-0000-0000-000000000000'$$,
  $$values (3.60::numeric, 1.20::numeric)$$, 'a rua foi posicionada em metros');
select results_eq($$select x, largura from public.planta_elementos where rotulo = 'Sala'$$,
  $$values (0.50::numeric, 2.40::numeric)$$, 'o elemento foi salvo em metros');
select throws_ok($$update public.ruas set planta_giro = 45$$, '23514', null, 'giro só em 0, 90, 180 ou 270');
select throws_ok($$update public.ruas set planta_lados = 3$$, '23514', null, 'rua tem um ou dois lados');
select lives_ok($$select public.salvar_planta('c0a00000-0000-0000-0000-000000000000', 16, 10, 'frente', 2,
  '[{"id":"c1a00000-0000-0000-0000-000000000000","x":4,"y":2,"giro":0,"lados":1}]'::jsonb, '[]'::jsonb)$$,
  'coordenador A marca a rua como de um lado só');
select results_eq($$select planta_lados::int from public.ruas where id = 'c1a00000-0000-0000-0000-000000000000'$$,
  $$values (1)$$, 'a rua ficou com um lado');
select throws_ok($$select public.salvar_planta('c0a00000-0000-0000-0000-000000000000', 16, 10, 'frente', 2,
  '[{"id":"c1a00000-0000-0000-0000-000000000000","x":4,"y":2,"giro":0,"lados":5}]'::jsonb, '[]'::jsonb)$$,
  '23514', null, 'lados fora de 1 ou 2 é recusado');

-- salvar_planta: tudo numa transação; galpão ou rua de fora dá o mesmo erro.
select lives_ok($$select public.salvar_planta('c0a00000-0000-0000-0000-000000000000', 16, 10, 'frente', 2,
  '[{"id":"c1a00000-0000-0000-0000-000000000000","x":4,"y":2,"giro":180}]'::jsonb,
  '[{"tipo":"porta","rotulo":"Entrada de serviço","x":0,"y":3,"largura":1,"profundidade":2,"giro":0}]'::jsonb)$$,
  'coordenador A salva a planta inteira');
select results_eq($$select planta_x::int, planta_y::int, planta_giro::int from public.ruas where id = 'c1a00000-0000-0000-0000-000000000000'$$,
  $$values (4, 2, 180)$$, 'a rua foi posicionada pela função');
select results_eq($$select count(*)::int from public.planta_elementos where galpao_id = 'c0a00000-0000-0000-0000-000000000000' and ativo$$,
  array[1], 'a porta nova entrou ativa');
-- Elemento que sumiu da lista é desativado; elemento novo já removido não entra.
select lives_ok($$select public.salvar_planta('c0a00000-0000-0000-0000-000000000000', 16, 10, 'frente', 2, '[]'::jsonb,
  '[{"id":null,"tipo":"pilar","x":1,"y":1,"largura":1,"profundidade":1,"giro":0,"ativo":false}]'::jsonb)$$,
  'salvar sem elementos desativa os que sumiram');
select results_eq($$select count(*)::int from public.planta_elementos where galpao_id = 'c0a00000-0000-0000-0000-000000000000' and ativo$$,
  array[0], 'nenhum elemento ficou ativo e o novo removido não entrou');
select throws_ok($$select public.salvar_planta('c0a00000-0000-0000-0000-000000000000', 16, 10, 'frente', 2, '[]'::jsonb,
  '[{"id":"e0b00000-0000-0000-0000-000000000001","tipo":"pilar","x":1,"y":1,"largura":1,"profundidade":1,"giro":0}]'::jsonb)$$,
  '42501', null, 'elemento de outra prefeitura na lista é recusado');
-- Metros por célula: o coordenador grava; fora de 0,25 a 5 é recusado.
select lives_ok($$select public.salvar_planta('c0a00000-0000-0000-0000-000000000000', 16, 10, 'frente', 2, '[]'::jsonb, '[]'::jsonb, 1.5)$$,
  'coordenador A grava os metros por célula');
select results_eq($$select planta_metros_celula from public.galpoes where id = 'c0a00000-0000-0000-0000-000000000000'$$,
  $$values (1.50::numeric)$$, 'os metros por célula ficaram salvos');
select throws_ok($$select public.salvar_planta('c0a00000-0000-0000-0000-000000000000', 16, 10, 'frente', 2, '[]'::jsonb, '[]'::jsonb, 0.1)$$,
  '23514', null, 'célula menor que 0,25 m é recusada');
select throws_ok($$select public.salvar_planta('c0a00000-0000-0000-0000-000000000000', 16, 10, 'frente', 2, '[]'::jsonb, '[]'::jsonb, 9)$$,
  '23514', null, 'célula maior que 5 m é recusada');
select throws_ok($$update public.galpoes set nome = 'Outro nome', planta_metros_celula = 2 where id = 'c0a00000-0000-0000-0000-000000000000'$$,
  '42501', null, 'coordenador A não renomeia o galpão junto com os metros');
select throws_ok($$select public.salvar_planta('c0b00000-0000-0000-0000-000000000000', 16, 10, 'frente', 2, '[]'::jsonb, '[]'::jsonb)$$,
  '42501', null, 'galpão de outra prefeitura é recusado');
select throws_ok($$select public.salvar_planta('c0f00000-0000-0000-0000-000000000000', 16, 10, 'frente', 2, '[]'::jsonb, '[]'::jsonb)$$,
  '42501', null, 'galpão que não existe dá o mesmo erro');
select throws_ok($$select public.salvar_planta('c0a00000-0000-0000-0000-000000000000', 16, 10, 'frente', 2,
  '[{"id":"c1b00000-0000-0000-0000-000000000000","x":1,"y":1,"giro":0}]'::jsonb, '[]'::jsonb)$$,
  '42501', null, 'rua de outro galpão desfaz a planta inteira');
select results_eq($$select planta_largura::int from public.galpoes where id = 'c0a00000-0000-0000-0000-000000000000'$$,
  array[16], 'a planta recusada não alterou o galpão');
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select throws_ok($$select public.salvar_planta('c0a00000-0000-0000-0000-000000000000', 20, 10, 'frente', 2, '[]'::jsonb, '[]'::jsonb)$$,
  '42501', null, 'operador A não salva a planta');
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');

-- ---------------------------------------------------------------------------
-- Administrador A (segundo fator ok) e administrador B
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$update public.galpoes set nome = 'Galpão Principal' where id = 'c0a00000-0000-0000-0000-000000000000'$$,
  'administrador A continua renomeando o galpão');
select is_empty($$update public.galpoes set planta_largura = 30 where id = 'c0b00000-0000-0000-0000-000000000000' returning id$$,
  'administrador A não desenha o galpão da B');
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select results_eq('select count(*)::int from public.planta_elementos', array[1], 'administrador B vê só os elementos da B');
select is_empty($$select 1 from public.ocupacao_galpao('c0a00000-0000-0000-0000-000000000000')$$, 'administrador B não vê a ocupação da A');
select throws_ok($$select public.mover_documentos(array['d0a10000-0000-0000-0000-000000000000']::uuid[], 'c4b00000-0000-0000-0000-000000000001')$$,
  'LC006', null, 'administrador B não move documento da A');

-- ---------------------------------------------------------------------------
-- Auditoria (como dono): cada documento movido, com a caixa antes e depois
-- ---------------------------------------------------------------------------
reset role;
select results_eq($$select count(*)::int from public.auditoria
  where acao = 'documentos.update' and alvo_tabela = 'documentos'
    and antes ->> 'caixa_id' = 'c4a00000-0000-0000-0000-000000000001'
    and depois ->> 'caixa_id' = 'c4a00000-0000-0000-0000-000000000002'$$,
  array[2], 'cada documento movido gera uma linha com a caixa de antes e a de depois');
select isnt_empty($$select 1 from public.auditoria where acao = 'planta_elementos.insert'$$, 'elemento da planta entra na auditoria');
select isnt_empty($$select 1 from public.auditoria where acao = 'ruas.update' and (depois ->> 'planta_x')::numeric = 3$$, 'posição da rua entra na auditoria');
select lives_ok($$insert into public.planta_elementos (prefeitura_id, galpao_id, tipo, x, y, largura, profundidade)
  values ('11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'janela', 0, 4.8, 1.2, 2.4)$$,
  'janela é um tipo aceito de elemento');
select throws_ok($$insert into public.planta_elementos (prefeitura_id, galpao_id, tipo, x, y, largura, profundidade)
  values ('11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'telhado', 0, 0, 1, 1)$$,
  '23514', null, 'tipo fora da lista é recusado');
select throws_ok($$insert into public.planta_elementos (prefeitura_id, galpao_id, tipo, x, y, largura, profundidade)
  values ('11111111-1111-1111-1111-111111111111', 'c0b00000-0000-0000-0000-000000000000', 'janela', 0, 0, 1, 1)$$,
  '23503', null, 'janela em galpão de outra prefeitura é recusada');

select * from finish();
rollback;
