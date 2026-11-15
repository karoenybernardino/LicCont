-- Texto do PDF (OCR): isolamento, permissões e a busca que acha o texto.
--   1. outra prefeitura e outra secretaria não leem o texto;
--   2. só quem cadastra grava; só em arquivo pronto e ativo;
--   3. a pesquisa acha o documento pelo texto do PDF;
--   4. o texto não vai para a auditoria; ninguém grava direto nem apaga.
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
  ('0a000000-0000-0000-0000-000000000001', 'admin1.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000002', 'coord.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000004', 'consulta.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000005', 'admin2.a@exemplo.test'),
  ('0b000000-0000-0000-0000-000000000001', 'admin.b@exemplo.test');

insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000002', '0a000000-0000-0000-0000-000000000002'),
  ('5a000000-0000-0000-0000-000000000004', '0a000000-0000-0000-0000-000000000004'),
  ('5a000000-0000-0000-0000-000000000005', '0a000000-0000-0000-0000-000000000005'),
  ('5b000000-0000-0000-0000-000000000001', '0b000000-0000-0000-0000-000000000001');

insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin 1 A', true, false),
  ('0a000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Coord A', false, false),
  ('0a000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Consulta A', false, false),
  ('0a000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Admin 2 A', true, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Admin B', true, false);

-- Coordenador só em Saúde; consulta só em Obras.
insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000000', 'coordenador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000000', 'consulta');

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
  ('c3a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c2a00000-0000-0000-0000-000000000000', 1, 20),
  ('c3b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c2b00000-0000-0000-0000-000000000000', 1, 20);
insert into public.caixas (id, prefeitura_id, nivel_id, numero) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1),
  ('c4b00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 1);

-- Documentos fictícios. Contrato conta do fim da vigência; licitação do encerramento.
--   d1 contrato vencido (apto)            d2 contrato que acabou hoje (prazo não cumprido)
--   d3 licitação de regra permanente      d4 dispensa vencida (apta)
--   d5 contrato sem data de fim           d6 contrato vencido de Obras (outra secretaria)
--   d7 contrato vencido da prefeitura B   d8 e d9 contratos vencidos (aptos), para o termo do administrador
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, situacao,
                               vigencia_inicio, vigencia_fim, encerrado_em) values
  ('d1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '001', 2005, 'Objeto fictício um', 'encerrado', '2005-01-01', '2010-01-01', null),
  ('d1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '002', 2020, 'Objeto fictício dois', 'encerrado', '2020-01-01', app.hoje(), null),
  ('d1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'concorrencia', '003', 2000, 'Objeto fictício três', 'concluida', null, null, '2000-01-01'),
  ('d1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'dispensa', '004', 2000, 'Objeto fictício quatro', 'concluida', null, null, '2000-01-01'),
  ('d1000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '005', 2005, 'Objeto fictício cinco', 'vigente', '2005-01-01', null, null),
  ('d1000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '006', 2005, 'Objeto fictício seis', 'encerrado', '2005-01-01', '2010-01-01', null),
  ('d1000000-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001', 'contrato', null, '007', 2005, 'Objeto fictício sete', 'encerrado', '2005-01-01', '2010-01-01', null),
  ('d1000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '008', 2005, 'Objeto fictício oito', 'encerrado', '2005-01-01', '2010-01-01', null),
  ('d1000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '009', 2005, 'Objeto fictício nove', 'encerrado', '2005-01-01', '2010-01-01', null);

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

insert into public.arquivos (id, prefeitura_id, secretaria_id, documento_id, nome_original, tamanho, enviado_por,
                             situacao, ativo, sha256, paginas, conferido_em)
values ('f1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000',
        'd1000000-0000-0000-0000-000000000001', 'a.pdf', 1000, '0a000000-0000-0000-0000-000000000002',
        'pronto', true, repeat('a', 64), 2, now()),
       ('f1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000',
        'd1000000-0000-0000-0000-000000000002', 'b.pdf', 1000, '0a000000-0000-0000-0000-000000000002',
        'enviando', false, null, null, null);

-- O insert já nasce "enviando"; a conferência (feita pelo servidor) deixa pronto e ativo.
update public.arquivos set situacao = 'pronto', ativo = true, sha256 = repeat('a', 64), paginas = 2, conferido_em = now()
  where id = 'f1000000-0000-0000-0000-000000000001';

set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select throws_ok($$select public.salvar_texto_pdf('f1000000-0000-0000-0000-000000000001', 'texto', 1)$$, '42501', null, 'consulta não grava texto');

select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select lives_ok($$select public.salvar_texto_pdf('f1000000-0000-0000-0000-000000000001', 'Aquisição de ambulância com maca retrátil', 2)$$, 'coordenador grava o texto do PDF pronto');
select throws_ok($$select public.salvar_texto_pdf('f1000000-0000-0000-0000-000000000002', 'texto', 1)$$, '23514', null, 'arquivo que não está pronto é recusado');
select throws_ok($$select public.salvar_texto_pdf('f1000000-0000-0000-0000-000000000001', '   ', 1)$$, '23514', null, 'texto vazio é recusado');
select lives_ok($$select public.salvar_texto_pdf('f1000000-0000-0000-0000-000000000001', 'Aquisição de ambulância com maca retrátil e desfibrilador', 2)$$, 'trocar o texto é permitido');
select throws_ok($$insert into public.arquivo_textos (arquivo_id, prefeitura_id, secretaria_id, documento_id, texto, paginas_lidas)
  values ('f1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'd1000000-0000-0000-0000-000000000002', 'x', 1)$$,
  '42501', null, 'ninguém grava direto na tabela');
select is((select count(*)::int from public.arquivo_textos), 1, 'coordenador lê o texto da própria secretaria');
select is((select (public.pesquisar_documentos('desfibrilador') ->> 'total')::int), 1, 'a pesquisa acha o documento pelo texto do PDF');
select is((select (public.pesquisar_documentos('hospital inexistente') ->> 'total')::int), 0, 'e não acha o que não está no texto');

select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select is_empty($$select 1 from public.arquivo_textos$$, 'consulta de Obras não lê o texto de Saúde');
select is((select (public.pesquisar_documentos('desfibrilador') ->> 'total')::int), 0, 'nem a pesquisa dela acha esse texto');

select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is_empty($$select 1 from public.arquivo_textos$$, 'B não lê o texto de A');
select throws_ok($$select public.salvar_texto_pdf('f1000000-0000-0000-0000-000000000001', 'texto', 1)$$, '42501', null, 'B não grava texto em arquivo de A');
select throws_ok($$delete from public.arquivo_textos$$, '42501', null, 'ninguém apaga texto');

reset role;
select is_empty($$select 1 from public.auditoria where depois::text like '%desfibrilador%' or antes::text like '%desfibrilador%'$$, 'o texto não vai para a auditoria');
select table_privs_are('public', 'arquivo_textos', 'anon', array[]::text[], 'anon sem privilégio em arquivo_textos');
select table_privs_are('public', 'arquivo_textos', 'authenticated', array['SELECT'], 'authenticated só lê arquivo_textos');
select ok(not has_function_privilege('anon', 'public.salvar_texto_pdf(uuid, text, int)', 'execute'), 'anon não grava texto');

select * from finish();
rollback;
