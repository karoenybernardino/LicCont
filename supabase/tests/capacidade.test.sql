-- Capacidade do arquivo: caixas_por_modulo só 30 ou 36, números por módulo e nível
-- isolados por prefeitura, anon sem acesso. Tudo fictício e dentro da transação (ROLLBACK no fim).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
update app.configuracao set segundo_fator_obrigatorio = true;

insert into public.prefeituras (id, nome, cnpj, status) values
  ('11111111-1111-1111-1111-111111111111', 'Prefeitura Fictícia A', '00000000000191', 'ativa'),
  ('22222222-2222-2222-2222-222222222222', 'Prefeitura Fictícia B', '00000000000272', 'ativa');
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
  ('c2b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c1b00000-0000-0000-0000-000000000000', 1),
  ('c2b00000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'c1b00000-0000-0000-0000-000000000000', 2);
insert into public.niveis (id, prefeitura_id, modulo_id, numero, capacidade) values
  ('c3a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c2a00000-0000-0000-0000-000000000000', 1, 6),
  ('c3b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c2b00000-0000-0000-0000-000000000000', 1, 6);
insert into public.caixas (id, prefeitura_id, nivel_id, numero) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1),
  ('c4a00000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 2),
  ('c4a00000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 3),
  ('c4b00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 1);

select results_eq($$select caixas_por_modulo::int from public.prefeituras where id = '11111111-1111-1111-1111-111111111111'$$, array[36], 'padrão: 36 caixas por módulo');
select throws_ok($$update public.prefeituras set caixas_por_modulo = 40 where id = '11111111-1111-1111-1111-111111111111'$$, '23514', null, 'só 30 ou 36');
update public.prefeituras set caixas_por_modulo = 30 where id = '22222222-2222-2222-2222-222222222222';

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select results_eq($$select (public.capacidade_arquivo() ->> 'caixas_por_modulo')::int || '/' || jsonb_array_length(public.capacidade_arquivo() -> 'por_modulo') || '/' || (public.capacidade_arquivo() -> 'por_modulo' -> 0 ->> 'ocupadas')$$,
  array['36/1/3'], 'A: 36 por módulo, 1 módulo, 3 caixas, nada de B');

select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select results_eq($$select (public.capacidade_arquivo() ->> 'caixas_por_modulo')::int || '/' || jsonb_array_length(public.capacidade_arquivo() -> 'por_modulo')$$,
  array['30/2'], 'B: 30 por módulo e 2 módulos, sem os de A');
-- Sem permissão de coluna/linha o update não muda nada (ou falha): o valor de B continua 30.
do $$ begin
  begin
    update public.prefeituras set caixas_por_modulo = 36 where id = '22222222-2222-2222-2222-222222222222';
  exception when others then null;
  end;
end $$;
select results_eq($$select (public.capacidade_arquivo() ->> 'caixas_por_modulo')::int$$, array[30], 'administrador da prefeitura não altera caixas por módulo');

reset role;
select ok(not has_function_privilege('anon', 'public.capacidade_arquivo()', 'execute'), 'anon não executa capacidade_arquivo');

select * from finish();
rollback;
