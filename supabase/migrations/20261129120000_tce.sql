-- Fase 9 · TCE-CE (tarefas 9.8 a 9.11): importações, fila de conferência e duplicados.
-- Plano: docs/fases/fase-9.md. Teste: supabase/tests/tce.test.sql.
--
-- A rotina de importação roda no servidor (região de São Paulo) com a chave de
-- serviço e chama só as funções "importar_tce_*" abaixo, que nenhum usuário
-- logado executa. CPF do TCE nunca é guardado: só nome e CNPJ.
-- Só adiciona objetos: compatível com o app que está no ar.

-- ---------------------------------------------------------------------------
-- prefeituras: configuração da integração
-- ---------------------------------------------------------------------------
alter table public.prefeituras
  add column tce_secretaria_id uuid,
  add column tce_anos smallint[] not null default '{}' check (cardinality(tce_anos) <= 10),
  add column tce_tipos text[] not null default '{licitacao,contrato}'
    check (tce_tipos <@ array['licitacao', 'contrato']::text[] and cardinality(tce_tipos) >= 1),
  add constraint prefeituras_tce_secretaria_fk foreign key (tce_secretaria_id, id)
    references public.secretarias (id, prefeitura_id);

alter table public.documentos add column tce_a_conferir boolean not null default false;
create index documentos_tce_fila_idx on public.documentos (prefeitura_id, criado_em desc)
  where tce_a_conferir and ativo;

-- ---------------------------------------------------------------------------
-- importacoes_tce: histórico (só números, datas e um código fixo de erro)
-- ---------------------------------------------------------------------------
create table public.importacoes_tce (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras (id),
  origem text not null check (origem in ('agendada', 'manual')),
  situacao text not null default 'rodando' check (situacao in ('rodando', 'ok', 'erro')),
  anos smallint[] not null default '{}',
  novos int not null default 0 check (novos >= 0),
  duplicados int not null default 0 check (duplicados >= 0),
  ja_existentes int not null default 0 check (ja_existentes >= 0),
  erro_codigo text check (erro_codigo is null or erro_codigo in ('indisponivel', 'formato', 'sem_configuracao', 'interno')),
  iniciada_em timestamptz not null default now(),
  concluida_em timestamptz,
  unique (id, prefeitura_id)
);
create index importacoes_tce_prefeitura_idx on public.importacoes_tce (prefeitura_id, iniciada_em desc);

alter table public.importacoes_tce enable row level security;
grant select on public.importacoes_tce to authenticated;
revoke all on public.importacoes_tce from anon, service_role;
create policy importacoes_tce_le on public.importacoes_tce for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));

-- ---------------------------------------------------------------------------
-- tce_duplicados: registro do TCE que bate com documento já cadastrado
-- ---------------------------------------------------------------------------
create table public.tce_duplicados (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras (id),
  tce_id text not null check (length(tce_id) between 1 and 80),
  documento_id uuid not null,
  tipo text not null check (tipo in ('licitacao', 'contrato')),
  numero text not null,
  ano smallint not null,
  empresa text,
  cnpj text check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  decisao text check (decisao in ('juntar', 'manter')),
  decidido_por uuid references auth.users (id),
  decidido_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (prefeitura_id, tce_id),
  foreign key (documento_id, prefeitura_id) references public.documentos (id, prefeitura_id),
  check ((decisao is null) = (decidido_em is null))
);
create index tce_duplicados_pendentes_idx on public.tce_duplicados (prefeitura_id, criado_em desc) where decisao is null;

alter table public.tce_duplicados enable row level security;
grant select on public.tce_duplicados to authenticated;
revoke all on public.tce_duplicados from anon, service_role;
create policy tce_duplicados_le on public.tce_duplicados for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));

-- ---------------------------------------------------------------------------
-- Configuração (administrador)
-- ---------------------------------------------------------------------------
create or replace function public.salvar_config_tce(
  p_ativo boolean, p_codigo text, p_secretaria uuid, p_anos smallint[], p_tipos text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.eh_admin() or app.prefeitura_atual() is null then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if p_ativo and (p_codigo is null or p_secretaria is null or coalesce(cardinality(p_anos), 0) = 0) then
    raise exception 'configuração incompleta' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(coalesce(p_anos, '{}')) a where a not between 2000 and 2100) then
    raise exception 'ano inválido' using errcode = '23514';
  end if;
  update public.prefeituras
  set tce_ativo = p_ativo, tce_codigo_municipio = nullif(trim(p_codigo), ''),
      tce_secretaria_id = p_secretaria, tce_anos = coalesce(p_anos, '{}'), tce_tipos = p_tipos
  where id = app.prefeitura_atual();
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id, depois)
  values (app.prefeitura_atual(), auth.uid(), 'tce.configurar', 'prefeituras', app.prefeitura_atual()::text,
          jsonb_build_object('ativo', p_ativo, 'anos', p_anos, 'tipos', p_tipos));
end
$$;

-- ---------------------------------------------------------------------------
-- Rotina (só chave de serviço): abrir, gravar e fechar uma importação
-- ---------------------------------------------------------------------------
-- Prefeituras com a integração ligada e completa (uma só, se p_prefeitura vier).
create or replace function public.importar_tce_configuracoes(p_prefeitura uuid default null)
returns table (prefeitura_id uuid, codigo text, anos smallint[], tipos text[])
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.tce_codigo_municipio, p.tce_anos, p.tce_tipos
  from public.prefeituras p
  where p.tce_ativo and p.tce_codigo_municipio is not null and p.tce_secretaria_id is not null
    and cardinality(p.tce_anos) > 0 and p.status = 'ativa'
    and (p_prefeitura is null or p.id = p_prefeitura)
$$;

create or replace function public.importar_tce_abrir(p_prefeitura uuid, p_origem text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.prefeituras;
  v_id uuid;
begin
  select * into p from public.prefeituras where id = p_prefeitura;
  if not found or not p.tce_ativo or p.tce_codigo_municipio is null or p.tce_secretaria_id is null then
    raise exception 'sem configuração' using errcode = '23514';
  end if;
  if exists (select 1 from public.importacoes_tce where prefeitura_id = p.id and situacao = 'rodando'
             and iniciada_em > now() - interval '2 hours') then
    raise exception 'já em andamento' using errcode = '55P03';
  end if;
  update public.importacoes_tce set situacao = 'erro', erro_codigo = 'interno', concluida_em = now()
  where prefeitura_id = p.id and situacao = 'rodando';
  insert into public.importacoes_tce (prefeitura_id, origem, anos) values (p.id, p_origem, p.tce_anos)
  returning id into v_id;
  return v_id;
end
$$;

-- Grava os registros já validados. Sempre dentro de uma única chamada: ou
-- entra tudo desta página ou nada (a função é uma transação).
-- Já conhecido (mesmo tce_id): conta e ignora. Mesmo processo de um documento
-- existente: vai para tce_duplicados, nunca sobrescreve.
create or replace function public.importar_tce_gravar(p_importacao uuid, p_registros jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.importacoes_tce;
  p public.prefeituras;
  r jsonb;
  v_novos int := 0;
  v_dup int := 0;
  v_ja int := 0;
  v_doc uuid;
  v_existente uuid;
begin
  select * into i from public.importacoes_tce where id = p_importacao and situacao = 'rodando' for update;
  if not found then
    raise exception 'importação inválida' using errcode = '23514';
  end if;
  select * into p from public.prefeituras where id = i.prefeitura_id;
  if jsonb_typeof(p_registros) <> 'array' or jsonb_array_length(p_registros) > 1000 then
    raise exception 'registros inválidos' using errcode = '23514';
  end if;

  for r in select * from jsonb_array_elements(p_registros) loop
    if exists (select 1 from public.documentos d where d.prefeitura_id = p.id and d.tce_id = r ->> 'tce_id')
       or exists (select 1 from public.tce_duplicados t where t.prefeitura_id = p.id and t.tce_id = r ->> 'tce_id') then
      v_ja := v_ja + 1;
      continue;
    end if;
    select d.id into v_existente from public.documentos d
    where d.prefeitura_id = p.id and d.ativo and d.tipo = r ->> 'tipo'
      and coalesce(d.modalidade, '') = coalesce(r ->> 'modalidade', '')
      and d.numero = r ->> 'numero' and d.ano = (r ->> 'ano')::smallint;
    if v_existente is not null then
      insert into public.tce_duplicados (prefeitura_id, tce_id, documento_id, tipo, numero, ano, empresa, cnpj)
      values (p.id, r ->> 'tce_id', v_existente, r ->> 'tipo', r ->> 'numero', (r ->> 'ano')::smallint,
              r ->> 'empresa', r ->> 'cnpj');
      v_dup := v_dup + 1;
      continue;
    end if;
    insert into public.documentos (prefeitura_id, secretaria_id, tipo, modalidade, numero, ano, objeto, empresa, cnpj,
                                   valor, situacao, vigencia_inicio, vigencia_fim, origem, tce_id, importado_em, tce_a_conferir)
    values (p.id, p.tce_secretaria_id, r ->> 'tipo', r ->> 'modalidade', r ->> 'numero', (r ->> 'ano')::smallint,
            r ->> 'objeto', r ->> 'empresa', r ->> 'cnpj', (r ->> 'valor')::numeric, r ->> 'situacao',
            (r ->> 'vigencia_inicio')::date, (r ->> 'vigencia_fim')::date, 'tce', r ->> 'tce_id', now(), true)
    returning id into v_doc;
    v_novos := v_novos + 1;
  end loop;

  update public.importacoes_tce
  set novos = novos + v_novos, duplicados = duplicados + v_dup, ja_existentes = ja_existentes + v_ja
  where id = i.id;
  return jsonb_build_object('novos', v_novos, 'duplicados', v_dup, 'ja_existentes', v_ja);
end
$$;

create or replace function public.importar_tce_fechar(p_importacao uuid, p_erro text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.importacoes_tce;
begin
  update public.importacoes_tce
  set situacao = case when p_erro is null then 'ok' else 'erro' end, erro_codigo = p_erro, concluida_em = now()
  where id = p_importacao and situacao = 'rodando'
  returning * into i;
  if i.id is not null then
    insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id, depois)
    values (i.prefeitura_id, null, 'tce.importar', 'importacoes_tce', i.id::text,
            jsonb_build_object('novos', i.novos, 'duplicados', i.duplicados, 'erro', p_erro, 'origem', i.origem));
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Fila de conferência (administrador ou coordenador da secretaria escolhida)
-- ---------------------------------------------------------------------------
create or replace function public.confirmar_importado_tce(p_documento uuid, p_secretaria uuid, p_caixa uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.documentos;
begin
  select * into d from public.documentos x
  where x.id = p_documento and x.prefeitura_id = app.prefeitura_atual() and x.tce_a_conferir and x.ativo for update;
  if not found or not app.eh_coordenador_de(d.secretaria_id) or not app.eh_coordenador_de(p_secretaria) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if not exists (select 1 from public.secretarias s where s.id = p_secretaria and s.prefeitura_id = d.prefeitura_id and s.ativa) then
    raise exception 'secretaria inválida' using errcode = '42501';
  end if;
  -- A troca de secretaria só vale aqui, com o documento ainda por conferir.
  perform set_config('liccont.tce_confirmando', '1', true);
  update public.documentos set secretaria_id = p_secretaria, caixa_id = p_caixa, tce_a_conferir = false where id = d.id;
end
$$;

create or replace function app.documento_tce_trava()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.secretaria_id is distinct from old.secretaria_id
     and not (old.tce_a_conferir and coalesce(current_setting('liccont.tce_confirmando', true), '') = '1') then
    raise exception 'a secretaria não muda' using errcode = '42501';
  end if;
  if new.tce_a_conferir and not old.tce_a_conferir then
    raise exception 'não volta para conferência' using errcode = '23514';
  end if;
  return new;
end
$$;
revoke execute on function app.documento_tce_trava() from public, anon, authenticated;
create trigger documentos_tce_trava before update on public.documentos
  for each row execute function app.documento_tce_trava();

-- Juntar: o documento que já existe passa a carregar o id do TCE (nada é
-- sobrescrito). Manter separado: o registro do TCE é só descartado.
create or replace function public.decidir_duplicado_tce(p_duplicado uuid, p_decisao text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tce_duplicados;
begin
  if p_decisao not in ('juntar', 'manter') then
    raise exception 'decisão inválida' using errcode = '23514';
  end if;
  select * into t from public.tce_duplicados x
  where x.id = p_duplicado and x.prefeitura_id = app.prefeitura_atual() and x.decisao is null for update;
  if not found or not app.eh_admin() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if p_decisao = 'juntar' then
    update public.documentos set tce_id = t.tce_id where id = t.documento_id and tce_id is null;
  end if;
  update public.tce_duplicados set decisao = p_decisao, decidido_por = auth.uid(), decidido_em = now() where id = t.id;
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id, depois)
  values (t.prefeitura_id, auth.uid(), 'tce.duplicado.' || p_decisao, 'tce_duplicados', t.id::text,
          jsonb_build_object('documento_id', t.documento_id));
end
$$;

-- ---------------------------------------------------------------------------
-- EXECUTE: rotina só para a chave de serviço; telas só para usuários logados
-- ---------------------------------------------------------------------------
revoke execute on function public.importar_tce_configuracoes(uuid) from public, anon, authenticated;
grant execute on function public.importar_tce_configuracoes(uuid) to service_role;
revoke execute on function public.importar_tce_abrir(uuid, text) from public, anon, authenticated;
revoke execute on function public.importar_tce_gravar(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.importar_tce_fechar(uuid, text) from public, anon, authenticated;
grant execute on function public.importar_tce_abrir(uuid, text) to service_role;
grant execute on function public.importar_tce_gravar(uuid, jsonb) to service_role;
grant execute on function public.importar_tce_fechar(uuid, text) to service_role;

revoke execute on function public.salvar_config_tce(boolean, text, uuid, smallint[], text[]) from public, anon;
revoke execute on function public.confirmar_importado_tce(uuid, uuid, uuid) from public, anon;
revoke execute on function public.decidir_duplicado_tce(uuid, text) from public, anon;
grant execute on function public.salvar_config_tce(boolean, text, uuid, smallint[], text[]) to authenticated;
grant execute on function public.confirmar_importado_tce(uuid, uuid, uuid) to authenticated;
grant execute on function public.decidir_duplicado_tce(uuid, text) to authenticated;
