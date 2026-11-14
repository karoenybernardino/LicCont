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
-- Coordenador na Saúde; operador e consulta só em Obras.
insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000000', 'coordenador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000000', 'operador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000000', 'consulta');
insert into public.equipe_liccont (usuario_id) values ('0e000000-0000-0000-0000-000000000001');

-- Estrutura: A tem Rua A > M1 > N1 (capacidade 2) com 2 caixas; B tem uma caixa.
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
insert into public.caixas (id, prefeitura_id, nivel_id, numero, capacidade_documentos) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1, 1),
  ('c4a00000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 2, 5),
  ('c4b00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 1, 5);

-- Documentos: um da Saúde (A), um de Obras (A), um da B. Como dono do banco.
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, empresa, situacao) values
  ('d0a10000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'pregao_eletronico', '015/2023', 2023, 'Aquisição de equipamentos médico-hospitalares', 'TecnoMed Fictícia', 'concluida'),
  ('d0a20000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000002', 'licitacao', 'concorrencia', '003/2022', 2022, 'Pavimentação de vias', 'Construtora Fictícia', 'concluida'),
  ('d0b10000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001', 'licitacao', 'dispensa', '001/2024', 2024, 'Material de escritório', null, 'concluida');
insert into public.arquivos (id, prefeitura_id, secretaria_id, documento_id, nome_original, tamanho, enviado_por) values
  ('f0a10000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'd0a10000-0000-0000-0000-000000000000', 'a.pdf', 1000, '0a000000-0000-0000-0000-000000000001'),
  ('f0b10000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'd0b10000-0000-0000-0000-000000000000', 'b.pdf', 1000, '0b000000-0000-0000-0000-000000000001');

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- Desempenho: 100 mil documentos fictícios da prefeitura A; a pesquisa
-- (busca textual, filtros e página) precisa responder em menos de 1 s.
insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, empresa, situacao)
select '11111111-1111-1111-1111-111111111111',
       case when g % 2 = 0 then 'a1000000-0000-0000-0000-000000000000'::uuid else 'a2000000-0000-0000-0000-000000000000'::uuid end,
       'c4a00000-0000-0000-0000-000000000002', 'licitacao', 'pregao_eletronico',
       lpad(g::text, 6, '0') || '/' || (2000 + g % 25), 2000 + g % 25,
       'Objeto fictício ' || g || case when g % 97 = 0 then ' pavimentação de vias' else ' material de consumo' end,
       'Empresa Fictícia ' || (g % 500), 'concluida'
from generate_series(1, 100000) g;
analyze public.documentos;

select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select performs_ok($$select * from public.pesquisar_documentos(p_busca := 'pavimentacao')$$, 1000, 'busca textual em 100 mil documentos < 1 s');
select performs_ok($$select * from public.pesquisar_documentos(p_ano_de := 2010, p_ano_ate := 2012)$$, 1000, 'filtro por ano < 1 s');
select performs_ok($$select * from public.pesquisar_documentos()$$, 1000, 'primeira página sem filtro < 1 s');

select * from finish();
rollback;
