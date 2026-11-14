-- Fase 3 · Documentos: documentos, arquivos (PDF), pesquisa e ocupação da caixa.
-- Plano: docs/fases/fase-3.md. Testes: supabase/tests/documentos_*.test.sql.
--
-- Documento é da secretaria (RLS por prefeitura E secretaria permitida).
-- A caixa é da prefeitura (guarda documentos de várias secretarias): a
-- contagem de ocupação vem de função security definer que devolve só números.
-- Nada se apaga, só se desativa. Só adiciona objetos: compatível com o app
-- que está no ar.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Texto sem acento e em minúsculas, para a pesquisa. "Imutável" porque o
-- dicionário é fixo; é o que permite usar em coluna gerada e em índice.
create or replace function app.sem_acento(p_texto text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_texto, '')))
$$;
revoke execute on function app.sem_acento(text) from public;
grant execute on function app.sem_acento(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Colunas novas em tabelas existentes (só adicionam)
-- ---------------------------------------------------------------------------
alter table public.caixas
  add column capacidade_documentos smallint not null default 50
    check (capacidade_documentos between 1 and 500);
grant update (capacidade_documentos) on public.caixas to authenticated;

alter table public.prefeituras
  add column limite_pdf_mb smallint not null default 50
    check (limite_pdf_mb between 1 and 50);

-- ---------------------------------------------------------------------------
-- Funções de papel
-- ---------------------------------------------------------------------------
-- Cadastra: administrador (com 2º fator) ou vínculo de operador/coordenador,
-- sempre em secretaria ativa da prefeitura.
create or replace function app.pode_cadastrar(p_secretaria uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.secretarias s
    where s.id = p_secretaria
      and s.ativa
      and s.prefeitura_id = app.prefeitura_atual()
      and (
        app.eh_admin()
        or exists (
          select 1 from public.vinculos v
          where v.secretaria_id = s.id
            and v.usuario_id = auth.uid()
            and v.papel in ('operador', 'coordenador')
        )
      )
  )
$$;

-- Confere e desativa: administrador ou coordenador daquela secretaria.
create or replace function app.eh_coordenador_de(p_secretaria uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.eh_admin() or exists (
    select 1 from public.vinculos v
    join public.secretarias s on s.id = v.secretaria_id
    where v.secretaria_id = p_secretaria
      and v.usuario_id = auth.uid()
      and v.papel = 'coordenador'
      and s.ativa
      and v.prefeitura_id = app.prefeitura_atual()
  )
$$;
revoke execute on function app.pode_cadastrar(uuid), app.eh_coordenador_de(uuid) from public, anon;
grant execute on function app.pode_cadastrar(uuid), app.eh_coordenador_de(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- documentos
-- ---------------------------------------------------------------------------
create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null,
  secretaria_id uuid not null,
  caixa_id uuid not null,
  tipo text not null check (tipo in ('licitacao', 'contrato')),
  modalidade text check (modalidade in (
    'pregao_eletronico', 'pregao_presencial', 'concorrencia', 'concurso', 'leilao',
    'dialogo_competitivo', 'dispensa', 'inexigibilidade', 'tomada_de_precos', 'convite')),
  numero text not null check (length(trim(numero)) between 1 and 30),
  ano smallint not null check (ano between 1950 and 2100),
  objeto text not null check (length(trim(objeto)) between 3 and 2000),
  empresa text check (empresa is null or length(trim(empresa)) between 1 and 200),
  cnpj text check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  valor numeric(15, 2) check (valor is null or valor >= 0),
  situacao text not null,
  vigencia_inicio date,
  vigencia_fim date,
  conferido_em timestamptz,
  conferido_por uuid references auth.users (id),
  ativo boolean not null default true,
  criado_por uuid default auth.uid() references auth.users (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  texto_busca text generated always as (
    app.sem_acento(numero || ' ' || objeto || ' ' || coalesce(empresa, '') || ' ' || coalesce(cnpj, ''))
  ) stored,
  unique (id, prefeitura_id),
  unique (id, prefeitura_id, secretaria_id),
  foreign key (secretaria_id, prefeitura_id) references public.secretarias (id, prefeitura_id),
  foreign key (caixa_id, prefeitura_id) references public.caixas (id, prefeitura_id),
  -- Modalidade: obrigatória na licitação; opcional no contrato.
  check (tipo = 'contrato' or modalidade is not null),
  -- Situação conforme o tipo (a lista pode crescer: trocar o check).
  check (
    (tipo = 'licitacao' and situacao in ('em_andamento', 'concluida', 'deserta', 'fracassada', 'revogada', 'anulada'))
    or (tipo = 'contrato' and situacao in ('vigente', 'encerrado', 'rescindido'))
  ),
  -- Vigência é só do contrato; o fim não vem antes do início.
  check (tipo = 'contrato' or (vigencia_inicio is null and vigencia_fim is null)),
  check (vigencia_inicio is null or vigencia_fim is null or vigencia_fim >= vigencia_inicio)
);

-- Mesmo processo duas vezes, só entre os ativos.
create unique index documentos_processo_unico
  on public.documentos (prefeitura_id, tipo, coalesce(modalidade, ''), numero, ano)
  where ativo;
create index documentos_busca_idx on public.documentos using gin (texto_busca extensions.gin_trgm_ops);
create index documentos_filtro_idx on public.documentos (prefeitura_id, secretaria_id, tipo, ano);
create index documentos_recentes_idx on public.documentos (prefeitura_id, criado_em desc, id desc);
create index documentos_caixa_idx on public.documentos (caixa_id) where ativo;
create index documentos_vigencia_idx on public.documentos (prefeitura_id, vigencia_fim) where tipo = 'contrato';
create index documentos_valor_idx on public.documentos (prefeitura_id, valor) where tipo = 'contrato';

-- ---------------------------------------------------------------------------
-- arquivos (o PDF digitalizado de um documento)
-- ---------------------------------------------------------------------------
create table public.arquivos (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null,
  secretaria_id uuid not null,
  documento_id uuid not null,
  caminho text not null default '',
  nome_original text not null check (length(nome_original) between 1 and 200),
  tamanho bigint not null check (tamanho > 0),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  paginas int check (paginas is null or paginas >= 1),
  situacao text not null default 'enviando' check (situacao in ('enviando', 'conferindo', 'pronto', 'recusado')),
  motivo_recusa text check (motivo_recusa in ('nao_pdf', 'com_senha', 'corrompido', 'grande_demais', 'incompleto')),
  avisos text[] not null default '{}' check (avisos <@ array['resolucao_baixa', 'sem_pdfa']),
  miniatura_caminho text,
  copia_leve_caminho text,
  -- Só o arquivo "pronto" fica ativo (feito por app.concluir_conferencia).
  ativo boolean not null default false,
  enviado_por uuid not null default auth.uid() references auth.users (id),
  enviado_em timestamptz not null default now(),
  conferido_em timestamptz,
  foreign key (documento_id, prefeitura_id, secretaria_id)
    references public.documentos (id, prefeitura_id, secretaria_id)
);
create unique index arquivos_um_ativo on public.arquivos (documento_id) where ativo;
create index arquivos_documento_idx on public.arquivos (documento_id);

-- O caminho é do banco: ninguém escolhe onde o objeto vai ficar.
create or replace function app.arquivo_caminho()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.caminho := new.prefeitura_id::text || '/' || new.secretaria_id::text || '/' || new.id::text || '.pdf';
  new.situacao := 'enviando';
  new.ativo := false;
  new.enviado_em := now();
  return new;
end
$$;
create trigger arquivos_caminho before insert on public.arquivos
  for each row execute function app.arquivo_caminho();

-- ---------------------------------------------------------------------------
-- Regras dos documentos (gatilhos)
-- ---------------------------------------------------------------------------
-- Antes de tudo (a_): sem oráculo. Prefeitura e caixa precisam ser da
-- prefeitura de quem inclui; caixa de outra prefeitura e caixa que não
-- existe dão o mesmo erro. Seed e migrações (sem token) não passam por aqui.
create or replace function app.documento_confere()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ativa boolean;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'authenticated' then
    return new;
  end if;
  if new.prefeitura_id is distinct from app.prefeitura_atual() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' or new.caixa_id is distinct from old.caixa_id
     or (new.ativo and not old.ativo) then
    select c.ativo and n.ativo and m.ativo and r.ativo and g.ativo
      into v_ativa
    from public.caixas c
    join public.niveis n on n.id = c.nivel_id
    join public.modulos m on m.id = n.modulo_id
    join public.ruas r on r.id = m.rua_id
    join public.galpoes g on g.id = r.galpao_id
    where c.id = new.caixa_id and c.prefeitura_id = new.prefeitura_id;
    if v_ativa is null then
      raise exception 'sem permissão' using errcode = '42501';
    end if;
    if not v_ativa then
      raise exception 'caixa desativada' using errcode = 'LC004';
    end if;
  end if;
  return new;
end
$$;
revoke execute on function app.documento_confere() from public;
create trigger a_documentos_confere before insert or update on public.documentos
  for each row execute function app.documento_confere();

-- Conferir e desativar: só coordenador da secretaria ou administrador.
-- Quem confere fica registrado pelo banco, não pelo navegador.
create or replace function app.documento_conferir()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  if coalesce(auth.jwt() ->> 'role', '') <> 'authenticated' then
    return new;
  end if;
  if ((new.conferido_em is distinct from old.conferido_em and new.conferido_em is not null)
      or new.ativo is distinct from old.ativo)
     and not app.eh_coordenador_de(new.secretaria_id) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  -- Quem não é coordenador e muda o conteúdo desfaz a conferência.
  if old.conferido_em is not null and new.conferido_em is not distinct from old.conferido_em
     and not app.eh_coordenador_de(new.secretaria_id)
     and to_jsonb(new) - array['atualizado_em','conferido_em','conferido_por','ativo','texto_busca']
         is distinct from to_jsonb(old) - array['atualizado_em','conferido_em','conferido_por','ativo','texto_busca'] then
    new.conferido_em := null;
  end if;
  if new.conferido_em is distinct from old.conferido_em then
    new.conferido_em := case when new.conferido_em is null then null else now() end;
    new.conferido_por := case when new.conferido_em is null then null else auth.uid() end;
  else
    new.conferido_por := old.conferido_por;
  end if;
  return new;
end
$$;
revoke execute on function app.documento_conferir() from public;
create trigger documentos_conferir before update on public.documentos
  for each row execute function app.documento_conferir();

-- Caixa com documento ativo não se desativa (LC005). security definer:
-- o coordenador só lê os documentos da própria secretaria, mas a caixa
-- guarda os de todas.
create or replace function app.caixa_desativa_confere()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.ativo and not new.ativo
     and exists (select 1 from public.documentos d where d.caixa_id = new.id and d.ativo) then
    raise exception 'ainda há documentos ativos na caixa' using errcode = 'LC005';
  end if;
  return new;
end
$$;
revoke execute on function app.caixa_desativa_confere() from public;
create trigger caixas_desativa_confere before update of ativo on public.caixas
  for each row execute function app.caixa_desativa_confere();

-- Nível, módulo, rua e galpão já recusam desativar com caixa ativa (LC003),
-- então a caixa com documento ativo também os segura.

-- Auditoria: igual à geral, sem o texto de busca e sem o nome do arquivo.
create or replace function app.auditar_documento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) - 'texto_busca' - 'nome_original' end;
  v_depois jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) - 'texto_busca' - 'nome_original' end;
  v_linha jsonb := coalesce(v_depois, v_antes);
begin
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id, antes, depois)
  values ((v_linha ->> 'prefeitura_id')::uuid, auth.uid(), tg_table_name || '.' || lower(tg_op),
          tg_table_name, v_linha ->> 'id', v_antes, v_depois);
  return null;
end
$$;
revoke execute on function app.auditar_documento() from public;
create trigger auditar_documentos after insert or update on public.documentos
  for each row execute function app.auditar_documento();
create trigger auditar_arquivos after insert or update on public.arquivos
  for each row execute function app.auditar_documento();

-- ---------------------------------------------------------------------------
-- RLS e GRANTs (sem anon, sem service_role, sem DELETE)
-- ---------------------------------------------------------------------------
alter table public.documentos enable row level security;
alter table public.arquivos enable row level security;
revoke all on public.documentos, public.arquivos from service_role;

grant select on public.documentos, public.arquivos to authenticated;
grant insert (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto,
              empresa, cnpj, valor, situacao, vigencia_inicio, vigencia_fim)
  on public.documentos to authenticated;
-- A secretaria e a prefeitura não mudam (o PDF ficaria na pasta errada).
grant update (caixa_id, modalidade, numero, ano, objeto, empresa, cnpj, valor, situacao,
              vigencia_inicio, vigencia_fim, conferido_em, ativo)
  on public.documentos to authenticated;
grant insert (prefeitura_id, secretaria_id, documento_id, nome_original, tamanho)
  on public.arquivos to authenticated;
-- arquivos: nada de UPDATE direto. Situação, hash e páginas só pelas funções abaixo.

create policy documentos_le on public.documentos for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and secretaria_id in (select app.secretarias_permitidas()));
create policy documentos_inclui on public.documentos for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual())
              and secretaria_id in (select app.secretarias_permitidas())
              and app.pode_cadastrar(secretaria_id));
create policy documentos_altera on public.documentos for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and secretaria_id in (select app.secretarias_permitidas())
         and app.pode_cadastrar(secretaria_id))
  with check (prefeitura_id = (select app.prefeitura_atual())
              and secretaria_id in (select app.secretarias_permitidas())
              and app.pode_cadastrar(secretaria_id));

create policy arquivos_le on public.arquivos for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and secretaria_id in (select app.secretarias_permitidas()));
create policy arquivos_inclui on public.arquivos for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual())
              and secretaria_id in (select app.secretarias_permitidas())
              and app.pode_cadastrar(secretaria_id)
              and enviado_por = auth.uid());

-- ---------------------------------------------------------------------------
-- Conferência do PDF (chamada pelo servidor com a sessão da pessoa)
-- ---------------------------------------------------------------------------
-- enviando -> conferindo: só o arquivo da própria pessoa.
create or replace function public.marcar_conferindo(p_arquivo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.arquivos a set situacao = 'conferindo'
  where a.id = p_arquivo and a.situacao = 'enviando' and a.enviado_por = auth.uid()
    and a.prefeitura_id = app.prefeitura_atual() and app.pode_cadastrar(a.secretaria_id);
  if not found then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
end
$$;

-- conferindo -> pronto | recusado. Ao ficar pronto o arquivo vira o ativo
-- do documento e o anterior deixa de ser (a troca é uma só transação).
create or replace function public.concluir_conferencia(
  p_arquivo uuid, p_pronto boolean, p_sha256 text, p_tamanho bigint, p_paginas int,
  p_motivo text, p_avisos text[], p_miniatura boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.arquivos;
  v_limite_mb int;
begin
  select * into a from public.arquivos x
  where x.id = p_arquivo and x.situacao = 'conferindo' and x.enviado_por = auth.uid()
    and x.prefeitura_id = app.prefeitura_atual() and app.pode_cadastrar(x.secretaria_id)
  for update;
  if a.id is null then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  -- Trava o documento: dois envios ao mesmo tempo não disputam o "ativo".
  perform 1 from public.documentos d where d.id = a.documento_id for update;
  -- shortcut: o SHA-256, o tamanho e o formato vêm do servidor da aplicação (SQL não lê
  -- o objeto; o dono desta função não enxerga storage.objects por RLS). Fechar a chamada
  -- direta com um papel só do servidor antes de guardar PDF real.
  select p.limite_pdf_mb into v_limite_mb from public.prefeituras p where p.id = a.prefeitura_id;
  if p_pronto and p_tamanho > v_limite_mb::bigint * 1024 * 1024 then
    p_pronto := false;
    p_motivo := 'grande_demais';
  end if;
  if p_pronto then
    update public.arquivos set ativo = false where documento_id = a.documento_id and ativo;
    -- PDF novo no lugar de outro: a conferência anterior não vale mais.
    update public.documentos set conferido_em = null, conferido_por = null
    where id = a.documento_id and conferido_em is not null
      and exists (select 1 from public.arquivos z where z.documento_id = a.documento_id and z.situacao = 'pronto');
    update public.arquivos set
      situacao = 'pronto', ativo = true, sha256 = p_sha256, tamanho = p_tamanho,
      paginas = p_paginas, avisos = coalesce(p_avisos, '{}'), conferido_em = now(),
      miniatura_caminho = case when p_miniatura
        then a.prefeitura_id::text || '/' || a.secretaria_id::text || '/' || a.id::text || '.webp' end
    where id = a.id;
  else
    update public.arquivos set
      situacao = 'recusado', motivo_recusa = coalesce(p_motivo, 'corrompido'), conferido_em = now()
    where id = a.id;
  end if;
end
$$;
revoke execute on function public.marcar_conferindo(uuid),
  public.concluir_conferencia(uuid, boolean, text, bigint, int, text, text[], boolean) from public, anon;
grant execute on function public.marcar_conferindo(uuid),
  public.concluir_conferencia(uuid, boolean, text, bigint, int, text, text[], boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Ocupação das caixas e "próxima livre" (security definer: só números)
-- ---------------------------------------------------------------------------
create or replace function public.ocupacao_caixas(p_caixas uuid[])
returns table (caixa_id uuid, documentos int, capacidade smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, count(d.id)::int, c.capacidade_documentos
  from public.caixas c
  left join public.documentos d on d.caixa_id = c.id and d.ativo
  where c.id = any (p_caixas)
    and c.prefeitura_id = app.prefeitura_atual()
  group by c.id, c.capacidade_documentos
$$;

-- Primeira caixa ativa com folga, na ordem do código (rua, módulo, nível, caixa).
-- Aceita um escopo: nível, módulo ou rua (os outros null).
create or replace function public.proxima_caixa_livre(
  p_nivel uuid default null, p_modulo uuid default null, p_rua uuid default null)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.caixas c
  join public.niveis n on n.id = c.nivel_id
  join public.modulos m on m.id = n.modulo_id
  join public.ruas r on r.id = m.rua_id
  join public.galpoes g on g.id = r.galpao_id
  where c.prefeitura_id = app.prefeitura_atual()
    and c.ativo and n.ativo and m.ativo and r.ativo and g.ativo
    and (p_nivel is null or n.id = p_nivel)
    and (p_modulo is null or m.id = p_modulo)
    and (p_rua is null or r.id = p_rua)
    and (select count(*) from public.documentos d where d.caixa_id = c.id and d.ativo)
        < c.capacidade_documentos
  order by r.codigo, m.numero, n.numero, c.numero
  limit 1
$$;
revoke execute on function public.ocupacao_caixas(uuid[]), public.proxima_caixa_livre(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.ocupacao_caixas(uuid[]), public.proxima_caixa_livre(uuid, uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Pesquisa (security invoker: o RLS vale). Uma chamada devolve as contagens
-- das abas, o total da aba e até p_limite itens, com paginação por cursor.
-- Regras de combinação (docs/fases/fase-3.md, pergunta 7): busca, período e
-- secretaria valem para todos; modalidade só restringe licitações; situação,
-- valor e vigência só restringem contratos.
-- ---------------------------------------------------------------------------
create or replace function public.pesquisar_documentos(
  p_busca text default null,
  p_aba text default 'todos',
  p_ano_de int default null,
  p_ano_ate int default null,
  p_modalidade text default null,
  p_secretaria uuid default null,
  p_situacao text default null,
  p_valor_min numeric default null,
  p_valor_max numeric default null,
  p_vigencia text default null,
  p_ordem text default 'recentes',
  p_cursor_criado timestamptz default null,
  p_cursor_valor numeric default null,
  p_cursor_id uuid default null,
  p_limite int default 50)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_busca text := app.sem_acento(trim(coalesce(p_busca, '')));
  v_digitos text := regexp_replace(coalesce(p_busca, ''), '[^0-9]', '', 'g');
  v_limite int := least(greatest(coalesce(p_limite, 50), 1), 100);
  v_contagens jsonb;
  v_itens jsonb;
  v_proximo jsonb;
begin
  if v_busca <> '' then
    v_busca := replace(replace(replace(v_busca, '\', '\\'), '%', '\%'), '_', '\_');
  end if;

  with base as materialized (
    select d.*
    from public.documentos d
    where d.ativo
      and (v_busca = ''
           or (length(v_busca) >= 3 and d.texto_busca like '%' || v_busca || '%')
           or (length(v_busca) < 3 and (app.sem_acento(d.numero) = v_busca or d.cnpj = nullif(v_digitos, ''))))
      and (p_ano_de is null or d.ano >= p_ano_de)
      and (p_ano_ate is null or d.ano <= p_ano_ate)
      and (p_secretaria is null or d.secretaria_id = p_secretaria)
      and (p_modalidade is null or d.tipo <> 'licitacao' or d.modalidade = p_modalidade)
      and (p_situacao is null or d.tipo <> 'contrato' or d.situacao = p_situacao)
      and (p_valor_min is null or d.tipo <> 'contrato' or d.valor >= p_valor_min)
      and (p_valor_max is null or d.tipo <> 'contrato' or d.valor <= p_valor_max)
      and (p_vigencia is null or d.tipo <> 'contrato' or case p_vigencia
             when 'vigentes' then d.vigencia_inicio <= current_date and d.vigencia_fim >= current_date
             when 'vencidos' then d.vigencia_fim < current_date
             when 'vencem_30' then d.vigencia_fim between current_date and current_date + 30
             else true end)
  ), cont as (
    select jsonb_build_object(
      'todos', count(*),
      'licitacao', count(*) filter (where tipo = 'licitacao'),
      'contrato', count(*) filter (where tipo = 'contrato')) as j
    from base
  ), escolhidos as (
    select b.*
    from base b
    where (p_aba = 'todos' or b.tipo = p_aba)
      and case p_ordem
        when 'antigos' then p_cursor_criado is null or (b.criado_em, b.id) > (p_cursor_criado, p_cursor_id)
        when 'maior_valor' then p_cursor_id is null
          or (coalesce(b.valor, -1), b.id) < (coalesce(p_cursor_valor, -1), p_cursor_id)
        else p_cursor_criado is null or (b.criado_em, b.id) < (p_cursor_criado, p_cursor_id)
      end
    order by
      case when p_ordem = 'antigos' then b.criado_em end asc,
      case when p_ordem = 'maior_valor' then coalesce(b.valor, -1) end desc,
      case when p_ordem not in ('antigos', 'maior_valor') then b.criado_em end desc,
      case when p_ordem = 'antigos' then b.id end asc,
      b.id desc
    limit v_limite + 1
  ), pagina as (
    select e.*, row_number() over () as pos from escolhidos e
  )
  select
    (select j from cont),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'tipo', p.tipo, 'modalidade', p.modalidade, 'numero', p.numero, 'ano', p.ano,
        'situacao', p.situacao, 'objeto', p.objeto, 'empresa', p.empresa, 'valor', p.valor,
        'secretaria_id', p.secretaria_id, 'criado_em', p.criado_em,
        'conferido', p.conferido_em is not null,
        'codigo', r.codigo || '-M' || m.numero || '-N' || n.numero || '-C' || lpad(c.numero::text, 2, '0'),
        'tem_pdf', exists (select 1 from public.arquivos a where a.documento_id = p.id and a.ativo))
        order by p.pos)
      from pagina p
      join public.caixas c on c.id = p.caixa_id
      join public.niveis n on n.id = c.nivel_id
      join public.modulos m on m.id = n.modulo_id
      join public.ruas r on r.id = m.rua_id
      where p.pos <= v_limite), '[]'::jsonb),
    (select jsonb_build_object('criado_em', x.criado_em, 'valor', x.valor, 'id', x.id)
       from pagina x
       where x.pos = v_limite and exists (select 1 from pagina y where y.pos = v_limite + 1))
  into v_contagens, v_itens, v_proximo;

  return jsonb_build_object(
    'contagens', v_contagens,
    'total', case p_aba when 'todos' then v_contagens ->> 'todos' else v_contagens ->> p_aba end,
    'itens', v_itens,
    'proximo', v_proximo);
end
$$;
revoke execute on function public.pesquisar_documentos(text, text, int, int, text, uuid, text, numeric,
  numeric, text, text, timestamptz, numeric, uuid, int) from public, anon;
grant execute on function public.pesquisar_documentos(text, text, int, int, text, uuid, text, numeric,
  numeric, text, text, timestamptz, numeric, uuid, int) to authenticated;
