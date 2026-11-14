-- Fase 3 · Storage. Prova o critério 3 de docs/fases/fase-3.md nas políticas
-- de storage.objects dos buckets "acervo" e "miniaturas":
--   outra prefeitura e outra secretaria não leem nem gravam; Consulta não
--   grava; ninguém grava fora do caminho do banco nem sem a linha "enviando"
--   da própria pessoa; ninguém sobrescreve; só quem enviou apaga, e só o
--   envio recusado ou abandonado.
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
  ('0a000000-0000-0000-0000-000000000003', 'operador.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000005', 'operador.saude.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000004', 'consulta.a@exemplo.test'),
  ('0b000000-0000-0000-0000-000000000003', 'operador.b@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000003', '0a000000-0000-0000-0000-000000000003'),
  ('5a000000-0000-0000-0000-000000000005', '0a000000-0000-0000-0000-000000000005'),
  ('5a000000-0000-0000-0000-000000000004', '0a000000-0000-0000-0000-000000000004'),
  ('5b000000-0000-0000-0000-000000000003', '0b000000-0000-0000-0000-000000000003');
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Operador Obras A', false, false),
  ('0a000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Operador Saúde A', false, false),
  ('0a000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Consulta Obras A', false, false),
  ('0b000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Operador B', false, false);
insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000000', 'operador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000000', 'operador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000000', 'consulta'),
  ('22222222-2222-2222-2222-222222222222', '0b000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000000', 'operador');

insert into public.galpoes (id, prefeitura_id, nome) values
  ('c0a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Galpão A');
insert into public.ruas (id, prefeitura_id, galpao_id, codigo) values
  ('c1a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'A');
insert into public.modulos (id, prefeitura_id, rua_id, numero) values
  ('c2a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c1a00000-0000-0000-0000-000000000000', 1);
insert into public.niveis (id, prefeitura_id, modulo_id, numero, capacidade) values
  ('c3a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c2a00000-0000-0000-0000-000000000000', 1, 2);
insert into public.caixas (id, prefeitura_id, nivel_id, numero) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1);

-- Um documento de Obras e outro da Saúde, cada um com um arquivo "enviando"
-- enviado pelo operador da secretaria (como dono, para montar o cenário).
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, situacao) values
  ('d0a20000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'dispensa', '1/2024', 2024, 'Objeto de Obras', 'concluida'),
  ('d0a10000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'dispensa', '2/2024', 2024, 'Objeto da Saúde', 'concluida');
insert into public.arquivos (id, prefeitura_id, secretaria_id, documento_id, nome_original, tamanho, enviado_por) values
  ('f0a20000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'd0a20000-0000-0000-0000-000000000000', 'obras.pdf', 100, '0a000000-0000-0000-0000-000000000003'),
  ('f0a10000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'd0a10000-0000-0000-0000-000000000000', 'saude.pdf', 100, '0a000000-0000-0000-0000-000000000005');

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

select results_eq($$select count(*)::int from storage.buckets where id in ('acervo', 'miniaturas') and not public$$, array[2],
  'os dois buckets existem e são privados');
select results_eq($$select file_size_limit::int from storage.buckets where id = 'acervo'$$, array[52428800], 'acervo aceita até 50 MB');
select results_eq($$select allowed_mime_types from storage.buckets where id = 'acervo'$$, $$values (array['application/pdf'])$$, 'acervo só aceita PDF');

-- O caminho do objeto é o que o banco gerou para a linha do arquivo.
select results_eq($$select caminho from public.arquivos where id = 'f0a20000-0000-0000-0000-000000000000'$$,
  $$values ('11111111-1111-1111-1111-111111111111/a2000000-0000-0000-0000-000000000000/f0a20000-0000-0000-0000-000000000000.pdf')$$,
  'caminho = prefeitura/secretaria/arquivo.pdf');

set local role authenticated;

-- Operador de Obras: grava só o seu arquivo, no caminho certo.
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select lives_ok($$insert into storage.objects (bucket_id, name) values ('acervo',
  '11111111-1111-1111-1111-111111111111/a2000000-0000-0000-0000-000000000000/f0a20000-0000-0000-0000-000000000000.pdf')$$,
  'operador grava o objeto do próprio envio');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('acervo',
  '11111111-1111-1111-1111-111111111111/a2000000-0000-0000-0000-000000000000/f0a20000-0000-0000-0000-000000000000.pdf')$$,
  null, null, 'ninguém sobrescreve um objeto existente');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('acervo',
  '11111111-1111-1111-1111-111111111111/a2000000-0000-0000-0000-000000000000/qualquer-nome.pdf')$$,
  '42501', null, 'não grava fora do caminho do banco');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('acervo',
  '11111111-1111-1111-1111-111111111111/a1000000-0000-0000-0000-000000000000/f0a10000-0000-0000-0000-000000000000.pdf')$$,
  '42501', null, 'não grava o envio de outra pessoa, nem em outra secretaria');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('miniaturas',
  '11111111-1111-1111-1111-111111111111/a1000000-0000-0000-0000-000000000000/f0a10000-0000-0000-0000-000000000000.webp')$$,
  '42501', null, 'não grava miniatura em outra secretaria');
select lives_ok($$insert into storage.objects (bucket_id, name) values ('miniaturas',
  '11111111-1111-1111-1111-111111111111/a2000000-0000-0000-0000-000000000000/f0a20000-0000-0000-0000-000000000000.webp')$$,
  'grava a miniatura do próprio envio');
select results_eq($$select count(*)::int from storage.objects where bucket_id = 'acervo'$$, array[1], 'lê o objeto da própria secretaria');
select is_empty($$update storage.objects set name = name || 'x' where bucket_id = 'acervo' returning id$$, 'sem UPDATE: não renomeia nem sobrescreve');

-- Consulta de Obras: lê, não grava.
select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select results_eq($$select count(*)::int from storage.objects where bucket_id = 'acervo'$$, array[1], 'consulta lê o objeto da própria secretaria');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('acervo',
  '11111111-1111-1111-1111-111111111111/a2000000-0000-0000-0000-000000000000/f0a20000-0000-0000-0000-000000000000.pdf')$$,
  null, null, 'consulta não grava');
select throws_ok($$delete from storage.objects where bucket_id = 'acervo'$$, null, null, 'consulta não apaga');

-- Operador B: não lê nem grava na prefeitura A.
select tst_entrar('0b000000-0000-0000-0000-000000000003', '5b000000-0000-0000-0000-000000000003', 'aal1');
select is_empty($$select 1 from storage.objects where bucket_id in ('acervo', 'miniaturas')$$, 'outra prefeitura não lê');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('acervo',
  '11111111-1111-1111-1111-111111111111/a2000000-0000-0000-0000-000000000000/f0a20000-0000-0000-0000-000000000000.pdf')$$,
  null, null, 'outra prefeitura não grava');

-- Operador da Saúde: não lê o objeto de Obras.
select tst_entrar('0a000000-0000-0000-0000-000000000005', '5a000000-0000-0000-0000-000000000005', 'aal1');
select is_empty($$select 1 from storage.objects where bucket_id = 'acervo'$$, 'outra secretaria não lê');

-- Apagar: só quem enviou, e só "enviando" ou "recusado".
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select public.marcar_conferindo('f0a20000-0000-0000-0000-000000000000');
select throws_ok($$delete from storage.objects where bucket_id = 'acervo'$$, null, null, 'em conferência o objeto não se apaga');
reset role;
set local role service_role;
select public.concluir_conferencia('0a000000-0000-0000-0000-000000000003', 'f0a20000-0000-0000-0000-000000000000', true, repeat('b', 64), 100, 1, null, '{}', false);
reset role;
set local role authenticated;
select throws_ok($$delete from storage.objects where bucket_id = 'acervo'$$, null, null, 'arquivo pronto não se apaga');

reset role;
select * from finish();
rollback;
