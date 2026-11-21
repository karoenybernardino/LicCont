-- Órgão (Prefeitura ou Câmara), dois tipos de caixa, número por órgão e segundo logo.
--   1. estrutura: órgão obrigatório, número da caixa em sequência por órgão, tipo e metadados;
--   2. documento herda o órgão da caixa, mas pode receber outro; caixa geral não lista documento;
--   3. isolamento: B não lê nem altera caixas de A; operador não altera caixa;
--   4. pesquisa de caixas e de documentos por órgão, fundo, setor e mês; classe pelo código;
--   5. segundo logo: só a equipe grava; cada órgão lê só o seu;
--   6. o documento não guarda mais empresa, CNPJ, CPF, valor, situação nem datas.
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
  ('0a000000-0000-0000-0000-000000000003', 'oper.a@exemplo.test'),
  ('0b000000-0000-0000-0000-000000000001', 'admin.b@exemplo.test'),
  ('0e000000-0000-0000-0000-000000000001', 'equipe@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000003', '0a000000-0000-0000-0000-000000000003'),
  ('5b000000-0000-0000-0000-000000000001', '0b000000-0000-0000-0000-000000000001'),
  ('5e000000-0000-0000-0000-000000000001', '0e000000-0000-0000-0000-000000000001');
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin A', true, false),
  ('0a000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Oper A', false, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Admin B', true, false);
insert into public.equipe_liccont (usuario_id) values ('0e000000-0000-0000-0000-000000000001');
insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000000', 'operador');

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
-- A: duas da Prefeitura (padrão) e uma da Câmara; B: uma da Prefeitura.
insert into public.caixas (id, prefeitura_id, nivel_id, numero, orgao) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1, 'prefeitura'),
  ('c4a00000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 2, 'prefeitura'),
  ('c4a00000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 3, 'camara'),
  ('c4b00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 1, 'prefeitura');
-- A caixa 3 da Câmara é geral (arquivo geral); a 1 é detalhada com metadados.
update public.caixas set tipo = 'geral', fundo = 'Câmara Municipal', setor = 'Secretaria Legislativa',
  meses = '{3,4}', ano_limite = 2015, digitalizada = true, codigo_classificacao = 'FX'
where id = 'c4a00000-0000-0000-0000-000000000003';
update public.caixas set fundo = 'Prefeitura Municipal', setor = 'Compras', meses = '{1,2,3}', ano_limite = 2020
where id = 'c4a00000-0000-0000-0000-000000000001';

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- Classe de A (B não tem).
insert into public.classes_documentais (prefeitura_id, grupo_id, codigo, nome, prazo_corrente_anos, prazo_intermediaria_anos, tipo_prazo, destinacao)
select g.prefeitura_id, g.id, 'FX', 'Classe fixa', 3, 2, 'fixo', 'eliminacao'
from public.grupos_documentais g
where g.prefeitura_id = '11111111-1111-1111-1111-111111111111' and g.chave = 'licitacoes_contratos';

-- ---------------------------------------------------------------------------
-- 1. Estrutura (como postgres)
-- ---------------------------------------------------------------------------
select is((select array_agg(sequencial order by sequencial) from public.caixas where prefeitura_id = '11111111-1111-1111-1111-111111111111' and orgao = 'prefeitura'),
  array[1, 2], 'caixas da Prefeitura de A numeradas 1 e 2');
select is((select array_agg(sequencial) from public.caixas where prefeitura_id = '11111111-1111-1111-1111-111111111111' and orgao = 'camara'),
  array[1], 'a numeração da Câmara de A começa de novo em 1');
select is((select sequencial from public.caixas where id = 'c4b00000-0000-0000-0000-000000000001'), 1, 'a numeração de B é própria');
select results_eq($$select orgao || ':' || proximo from public.caixa_contador where prefeitura_id = '11111111-1111-1111-1111-111111111111' order by orgao$$,
  array['camara:2', 'prefeitura:3'], 'um contador por órgão');
select throws_ok($$insert into public.caixas (prefeitura_id, nivel_id, numero, orgao)
  values ('11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 4, 'outro')$$,
  '23514', null, 'órgão da caixa só aceita prefeitura ou câmara');
select throws_ok($$insert into public.caixas (prefeitura_id, nivel_id, numero, orgao)
  values ('11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 4, null)$$,
  '23502', null, 'órgão da caixa é obrigatório');
select throws_ok($$update public.caixas set tipo = 'mista' where id = 'c4a00000-0000-0000-0000-000000000001'$$,
  '23514', null, 'tipo da caixa só aceita geral ou detalhada');
select throws_ok($$update public.caixas set meses = '{13}' where id = 'c4a00000-0000-0000-0000-000000000001'$$,
  '23514', null, 'mês da caixa vai de 1 a 12');
select throws_ok($$update public.caixas set codigo_classificacao = 'a b' where id = 'c4a00000-0000-0000-0000-000000000001'$$,
  '23514', null, 'código de classificação com formato inválido');
-- Trocar o órgão pega o próximo número do órgão novo.
update public.caixas set orgao = 'camara' where id = 'c4a00000-0000-0000-0000-000000000002';
select is((select sequencial from public.caixas where id = 'c4a00000-0000-0000-0000-000000000002'), 2, 'ao trocar para a Câmara a caixa recebe o próximo número dela');
insert into public.caixas (id, prefeitura_id, nivel_id, numero, orgao, sequencial)
  values ('c4a00000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 5, 'camara', 99);
select is((select sequencial from public.caixas where id = 'c4a00000-0000-0000-0000-000000000005'), 3, 'o número é gerado pelo sistema, mesmo que o cadastro mande outro');
delete from public.caixas where id = 'c4a00000-0000-0000-0000-000000000005';
update public.caixas set orgao = 'prefeitura' where id = 'c4a00000-0000-0000-0000-000000000002';

-- ---------------------------------------------------------------------------
-- 2. Documento: órgão herdado ou escolhido; caixa geral não lista documento
-- ---------------------------------------------------------------------------
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto) values
  ('d1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001',
   'licitacao', 'dispensa', '001/2024', 2024, 'Objeto fictício da Prefeitura'),
  ('d1000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001',
   'licitacao', 'dispensa', '001/2024', 2024, 'Objeto fictício de B');
select is((select orgao from public.documentos where id = 'd1000000-0000-0000-0000-000000000001'), 'prefeitura', 'documento herda o órgão da caixa');
-- Documento da Câmara arquivado numa caixa da Prefeitura: o cadastro escolhe o órgão.
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, orgao) values
  ('d1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001',
   'licitacao', 'dispensa', '002/2024', 2024, 'Objeto fictício da Câmara na caixa da Prefeitura', 'camara');
select is((select orgao from public.documentos where id = 'd1000000-0000-0000-0000-000000000003'), 'camara', 'o órgão escolhido no cadastro vale mais que o da caixa');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, tipo, modalidade, numero, ano, objeto, origem)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'licitacao', 'dispensa', '003/2024', 2024, 'Sem caixa e sem órgão', 'planilha')$$,
  '23502', null, 'órgão do documento é obrigatório quando não há caixa para herdar');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, tipo, modalidade, numero, ano, objeto, origem, orgao)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'licitacao', 'dispensa', '003/2024', 2024, 'Órgão inválido', 'planilha', 'estado')$$,
  '23514', null, 'órgão do documento só aceita prefeitura ou câmara');
select throws_ok($$insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto)
  values ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000003', 'licitacao', 'dispensa', '004/2024', 2024, 'Em caixa geral')$$,
  'LC008', null, 'caixa geral não lista documentos');

-- ---------------------------------------------------------------------------
-- 3. Isolamento e permissão
-- ---------------------------------------------------------------------------
set local role authenticated;
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select results_eq($$select count(*)::int from public.caixas$$, array[1], 'B lê só a caixa de B');
select is_empty($$select 1 from public.caixas where fundo is not null$$, 'B não lê fundo nem setor das caixas de A');
select is_empty($$update public.caixas set fundo = 'Invasão' where prefeitura_id = '11111111-1111-1111-1111-111111111111' returning 1$$, 'B não altera caixa de A');
select throws_ok($$select 1 from public.caixa_contador$$, '42501', null, 'contador de caixas não é lido pelos órgãos');
select is_empty($$select 1 from public.pesquisar_caixas()  where fundo is not null$$, 'a pesquisa de caixas de B não traz caixa de A');
select is_empty($$select 1 from public.classe_por_codigo('FX')$$, 'B não resolve o código de classe de A');
select results_eq($$select (public.pesquisar_documentos(p_orgao => 'camara') ->> 'total')::int$$, array[0], 'B não acha documento da Câmara de A');

select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select is_empty($$update public.caixas set fundo = 'Operador' where id = 'c4a00000-0000-0000-0000-000000000001' returning 1$$, 'operador não altera caixa');

select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$update public.caixas set fundo = 'Prefeitura Municipal', observacao = 'Revisada', etiqueta_geral = true where id = 'c4a00000-0000-0000-0000-000000000001'$$,
  'administrador grava metadados e a etiqueta geral da caixa detalhada');
select throws_ok($$update public.caixas set prefeitura_id = '22222222-2222-2222-2222-222222222222' where id = 'c4a00000-0000-0000-0000-000000000001'$$,
  '42501', null, 'a prefeitura da caixa não muda');
select throws_ok($$update public.caixas set sequencial = 99 where id = 'c4a00000-0000-0000-0000-000000000001'$$,
  '42501', null, 'o número da caixa não é editável');
select throws_ok($$select * from public.caixa_contador$$, '42501', null, 'ninguém lê o contador direto');

-- ---------------------------------------------------------------------------
-- 4. Pesquisa e classe pelo código
-- ---------------------------------------------------------------------------
select results_eq($$select count(*)::int from public.pesquisar_caixas(p_orgao => 'camara')$$, array[1], 'filtro por órgão: uma caixa da Câmara');
select results_eq($$select tipo from public.pesquisar_caixas(p_orgao => 'camara')$$, array['geral'], 'a caixa da Câmara é geral');
select results_eq($$select count(*)::int from public.pesquisar_caixas(p_fundo => 'municipal')$$, array[2], 'fundo: acha as duas por parte do nome, sem acento');
select results_eq($$select count(*)::int from public.pesquisar_caixas(p_setor => 'COMPRAS')$$, array[1], 'setor: sem diferença de maiúscula');
select results_eq($$select count(*)::int from public.pesquisar_caixas(p_mes => 4)$$, array[1], 'mês: só a caixa que tem o mês 4');
select results_eq($$select count(*)::int from public.pesquisar_caixas(p_mes => 3)$$, array[2], 'mês: uma caixa pode ter vários meses');
select results_eq($$select count(*)::int from public.pesquisar_caixas(p_ano => 2015)$$, array[1], 'ano limite');
select results_eq($$select count(*)::int from public.pesquisar_caixas(p_tipo => 'detalhada')$$, array[2], 'filtro por tipo');
select results_eq($$select codigo from public.pesquisar_caixas(p_orgao => 'camara')$$, array['A-M1-N1-C03'], 'a caixa mostra o endereço físico junto com o número do órgão');

select results_eq($$select prazo_anos from public.classe_por_codigo('FX')$$, array[5], 'o código da classe traz o prazo (corrente + intermediária)');
select results_eq($$select permanente from public.classe_por_codigo(' FX ')$$, array[false], 'e o destino, ignorando espaços');
select is_empty($$select 1 from public.classe_por_codigo('NAOEXISTE')$$, 'código desconhecido não traz nada');

select results_eq($$select (public.pesquisar_documentos(p_orgao => 'camara') ->> 'total')::int$$, array[1], 'pesquisa de documentos filtra por órgão (Câmara)');
select results_eq($$select (public.pesquisar_documentos(p_orgao => 'prefeitura') ->> 'total')::int$$, array[1], 'pesquisa de documentos filtra por órgão (Prefeitura)');
select results_eq($$select (public.pesquisar_documentos() ->> 'total')::int$$, array[2], 'sem filtro traz os dois órgãos');
select results_eq($$select (public.pesquisar_documentos(p_setor => 'compras') ->> 'total')::int$$, array[2], 'setor da caixa filtra os documentos dela');
select results_eq($$select (public.pesquisar_documentos(p_fundo => 'inexistente') ->> 'total')::int$$, array[0], 'fundo sem caixa não traz documento');
select results_eq($$select (public.pesquisar_documentos(p_mes => 1) ->> 'total')::int$$, array[2], 'mês da caixa filtra os documentos dela');
select results_eq($$select (public.pesquisar_documentos('objeto fictício da camara') ->> 'total')::int$$, array[1], 'a busca de texto continua achando pelo objeto');

-- ---------------------------------------------------------------------------
-- 5. Segundo logo: só a equipe grava; cada órgão lê o seu
-- ---------------------------------------------------------------------------
select throws_ok($$select public.equipe_orgao_marca('11111111-1111-1111-1111-111111111111', 'Nome', null, false, 'orgaos/11111111-1111-1111-1111-111111111111/logo-camara.png', false, null)$$,
  '42501', null, 'administrador de órgão não grava o logo da Câmara pela função da equipe');
select throws_ok($$update public.prefeituras set logo_camara_caminho = 'orgaos/11111111-1111-1111-1111-111111111111/logo-camara.png' where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'nem direto na tabela');
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$select public.equipe_orgao_marca('11111111-1111-1111-1111-111111111111', 'Município de Teste', 'orgaos/11111111-1111-1111-1111-111111111111/logo.png', false,
  'orgaos/11111111-1111-1111-1111-111111111111/logo-camara.png', false, null)$$, 'equipe grava os dois logos');
select throws_ok($$select public.equipe_orgao_marca('11111111-1111-1111-1111-111111111111', 'Nome', null, false, 'orgaos/outro/logo-camara.png', false, null)$$,
  '23514', null, 'o caminho do logo da Câmara tem formato fixo');
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select results_eq($$select logo_camara_caminho from public.etiqueta_marca()$$, array['orgaos/11111111-1111-1111-1111-111111111111/logo-camara.png'],
  'o órgão lê os dois logos para a etiqueta');
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is_empty($$select 1 from public.etiqueta_marca() where logo_camara_caminho is not null$$, 'B não recebe o logo de A');
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$select public.equipe_orgao_marca('11111111-1111-1111-1111-111111111111', 'Município de Teste', null, false, null, true, null)$$, 'equipe remove só o logo da Câmara');

-- ---------------------------------------------------------------------------
-- 6. Documento sem os campos antigos; privilégios
-- ---------------------------------------------------------------------------
reset role;
select results_eq($$select (logo_caminho is not null)::text || (logo_camara_caminho is null)::text from public.prefeituras where id = '11111111-1111-1111-1111-111111111111'$$,
  array['truetrue'], 'o logo da Prefeitura continua e o da Câmara saiu');
select hasnt_column('public', 'documentos', 'empresa', 'documento não guarda empresa');
select hasnt_column('public', 'documentos', 'cnpj', 'documento não guarda CNPJ');
select hasnt_column('public', 'documentos', 'cpf_credor', 'documento não guarda CPF do credor');
select hasnt_column('public', 'documentos', 'valor', 'documento não guarda valor');
select hasnt_column('public', 'documentos', 'situacao', 'documento não guarda situação');
select hasnt_column('public', 'documentos', 'data_producao', 'documento não guarda data do documento');
select hasnt_column('public', 'documentos', 'encerrado_em', 'documento não guarda encerramento');
select hasnt_column('public', 'documentos', 'evento_em', 'documento não guarda evento');
select hasnt_column('public', 'classes_documentais', 'evento', 'a classe não tem mais evento');
select table_privs_are('public', 'caixas', 'anon', array[]::text[], 'anon sem privilégio em caixas');
select table_privs_are('public', 'caixa_contador', 'authenticated', array[]::text[], 'ninguém mexe no contador de caixas');
select ok(not has_column_privilege('authenticated', 'public.caixas', 'sequencial', 'update'), 'o número da caixa não se edita');
select ok(not has_function_privilege('anon', 'public.pesquisar_caixas(text, text, text, text, int, int, int)', 'execute'), 'anon não pesquisa caixas');
select ok(not has_function_privilege('anon', 'public.classe_por_codigo(text)', 'execute'), 'anon não resolve classe');

select * from finish();
rollback;
