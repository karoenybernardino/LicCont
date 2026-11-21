-- Fase 9 · 9.13 · Painel: números certos e isolados.
--   1. o resumo conta só o que a pessoa enxerga (prefeitura e secretarias dela);
--   2. outra prefeitura nunca entra na conta;
--   3. filtro por secretaria; documento sem endereço, com e sem PDF contados;
--   4. painel_caixas devolve só números, da própria prefeitura; anon não executa.
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
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000000', 'operador');

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
  ('c3a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c2a00000-0000-0000-0000-000000000000', 1, 5),
  ('c3b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c2b00000-0000-0000-0000-000000000000', 1, 5);
insert into public.caixas (id, prefeitura_id, nivel_id, numero, capacidade_documentos) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1, 2),
  ('c4a00000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 2, 2),
  ('c4a00000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 3, 2),
  ('c4b00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 1, 2);

-- A: caixa 1 cheia (2 docs: Saúde licitação 2023 e Obras contrato 2024), caixa 2 com 1 (Obras licitação 2024),
-- caixa 3 vazia, e 1 documento importado sem endereço (Saúde). B: 1 documento.
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, origem, orgao) values
  ('d0a10000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'dispensa', '001/2023', 2023, 'Licitação Saúde fictícia', 'manual', 'prefeitura'),
  ('d0a20000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '002/2024', 2024, 'Contrato Obras fictício', 'manual', 'prefeitura'),
  ('d0a30000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000002', 'licitacao', 'dispensa', '003/2024', 2024, 'Licitação Obras fictícia', 'manual', 'prefeitura'),
  ('d0a40000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', null, 'contrato', null, '004/2024', 2024, 'Contrato importado fictício', 'planilha', 'camara'),
  ('d0b10000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001', 'licitacao', 'dispensa', '001/2024', 2024, 'Documento de B fictício', 'manual', 'prefeitura');

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- Administrador A: vê as duas secretarias.
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select results_eq($$select (public.painel_resumo() -> 'documentos' ->> 'total')::int$$, array[4], 'administrador conta os 4 documentos de A, nenhum de B');
select results_eq($$select (public.painel_resumo() -> 'documentos' ->> 'licitacoes')::int || '/' || (public.painel_resumo() -> 'documentos' ->> 'contratos')::int$$, array['2/2'], 'separa licitações e contratos');
select results_eq($$select (public.painel_resumo() -> 'documentos' ->> 'sem_endereco')::int$$, array[1], 'conta o documento sem endereço');
select results_eq($$select (public.painel_resumo() -> 'documentos' ->> 'sem_pdf')::int$$, array[4], 'sem PDF contado');
select results_eq($$select jsonb_array_length(public.painel_resumo() -> 'por_ano')$$, array[2], 'documentos por ano: 2023 e 2024');
select results_eq($$select (public.painel_resumo('a1000000-0000-0000-0000-000000000000') -> 'documentos' ->> 'total')::int$$, array[2], 'filtro por secretaria (Saúde)');
select results_eq($$select (public.painel_resumo('b1000000-0000-0000-0000-000000000000') -> 'documentos' ->> 'total')::int$$, array[0], 'filtrar por secretaria de B não traz nada');
select results_eq($$select (public.painel_resumo(p_orgao => 'camara') -> 'documentos' ->> 'total')::int$$, array[1], 'filtro por órgão: só o documento da Câmara');
select results_eq($$select (public.painel_resumo(p_orgao => 'prefeitura') -> 'documentos' ->> 'total')::int$$, array[3], 'filtro por órgão: os da Prefeitura de A, sem os de B');
select results_eq($$select (public.painel_caixas('camara') ->> 'total')::int$$, array[0], 'nenhuma caixa da Câmara');
select results_eq($$select public.painel_caixas()::text$$,
  array['{"total": 3, "cheias": 1, "vazias": 1, "com_espaco": 1, "com_documento": 2}'], 'caixas: 1 cheia, 1 com espaço, 1 vazia');

-- Operador A (só Obras): vê só os números de Obras.
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select results_eq($$select (public.painel_resumo() -> 'documentos' ->> 'total')::int$$, array[2], 'operador de Obras conta só Obras');
select results_eq($$select (public.painel_resumo('a1000000-0000-0000-0000-000000000000') -> 'documentos' ->> 'total')::int$$, array[0], 'operador não enxerga Saúde nem filtrando');

-- Administrador B: só o dele.
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select results_eq($$select (public.painel_resumo() -> 'documentos' ->> 'total')::int$$, array[1], 'B conta só o próprio documento');
select results_eq($$select (public.painel_caixas() ->> 'total')::int$$, array[1], 'caixas de B: só a dele');

-- Anon não executa.
reset role;
select ok(not has_function_privilege('anon', 'public.painel_resumo(uuid, text)', 'execute'), 'anon não executa painel_resumo');
select ok(not has_function_privilege('anon', 'public.painel_caixas(text)', 'execute'), 'anon não executa painel_caixas');

select * from finish();
rollback;
