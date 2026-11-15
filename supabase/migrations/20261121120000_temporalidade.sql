-- Fase 7 · Temporalidade e descarte.
-- Regra de pronto: nenhum documento é apagado sem termo aprovado e registrado.
--   * `documentos` continua sem DELETE para todos (só desativa);
--   * a eliminação é um fluxo: termo em rascunho (listagem) → edital de ciência
--     (45 dias, Resolução CONARQ 40/2014 com a 44/2020) → aprovação por um
--     administrador diferente de quem gerou → só então os documentos são
--     desativados, tudo dentro de uma função do banco;
--   * `descartes` e `descarte_itens` não têm INSERT, UPDATE nem DELETE para
--     ninguém da Data API: só as funções `public.descarte_*` escrevem.

-- ---------------------------------------------------------------------------
-- Início da contagem do prazo: encerramento do processo (licitação).
-- Contrato conta do fim da vigência (`vigencia_fim`).
-- ---------------------------------------------------------------------------
alter table public.documentos add column encerrado_em date;
alter table public.documentos add constraint documentos_encerrado_so_licitacao
  check (tipo = 'licitacao' or encerrado_em is null);
grant insert (encerrado_em), update (encerrado_em) on public.documentos to authenticated;

-- ---------------------------------------------------------------------------
-- Classe do documento para a tabela de temporalidade
-- ---------------------------------------------------------------------------
create or replace function app.classe_documento(p_tipo text, p_modalidade text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_tipo = 'contrato' then 'contrato'
    when p_modalidade in ('dispensa', 'inexigibilidade') then 'dispensa_inexigibilidade'
    else 'licitacao'
  end
$$;
revoke execute on function app.classe_documento(text, text) from public, anon;
grant execute on function app.classe_documento(text, text) to authenticated;

create or replace function app.hoje()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;
revoke execute on function app.hoje() from public, anon;
grant execute on function app.hoje() to authenticated;

-- Fase 6 (empréstimos) redefine esta função com `create or replace`. Até lá,
-- nenhum documento está emprestado.
create or replace function app.documento_emprestado(p_documento uuid)
returns boolean
language sql
stable
set search_path = ''
as $$ select false $$;
revoke execute on function app.documento_emprestado(uuid) from public, anon;
grant execute on function app.documento_emprestado(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- tabela_temporalidade
-- ---------------------------------------------------------------------------
create table public.tabela_temporalidade (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras (id),
  classe text not null check (classe in ('licitacao', 'dispensa_inexigibilidade', 'contrato')),
  prazo_corrente_anos smallint not null check (prazo_corrente_anos between 0 and 50),
  prazo_intermediaria_anos smallint not null check (prazo_intermediaria_anos between 0 and 50),
  destinacao text not null check (destinacao in ('eliminacao', 'guarda_permanente')),
  criado_por uuid default auth.uid() references auth.users (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (prefeitura_id, classe),
  unique (id, prefeitura_id)
);

alter table public.tabela_temporalidade enable row level security;

-- Sem DELETE e sem anon. Quem escreve é só o administrador (segundo fator).
grant select on public.tabela_temporalidade to authenticated;
grant insert (prefeitura_id, classe, prazo_corrente_anos, prazo_intermediaria_anos, destinacao)
  on public.tabela_temporalidade to authenticated;
grant update (prazo_corrente_anos, prazo_intermediaria_anos, destinacao, atualizado_em)
  on public.tabela_temporalidade to authenticated;

create policy temporalidade_le on public.tabela_temporalidade for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()));
create policy temporalidade_inclui on public.tabela_temporalidade for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));
create policy temporalidade_altera on public.tabela_temporalidade for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()))
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));

create or replace function app.temporalidade_carimbo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end
$$;
revoke execute on function app.temporalidade_carimbo() from public;
create trigger temporalidade_carimbo before update on public.tabela_temporalidade
  for each row execute function app.temporalidade_carimbo();
create trigger auditar_tabela_temporalidade after insert or update on public.tabela_temporalidade
  for each row execute function app.auditar_alteracao();

-- ---------------------------------------------------------------------------
-- descartes (termo) e descarte_itens
-- ---------------------------------------------------------------------------
create table public.descartes (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras (id),
  secretaria_id uuid not null,
  ano smallint not null,
  numero integer not null check (numero > 0),
  situacao text not null default 'rascunho' check (situacao in ('rascunho', 'em_ciencia', 'aprovado', 'cancelado')),
  observacao text check (observacao is null or length(observacao) <= 1000),
  gerado_por uuid not null default auth.uid() references auth.users (id),
  gerado_em timestamptz not null default now(),
  edital_publicado_em date,
  aprovado_por uuid references auth.users (id),
  aprovado_em timestamptz,
  unique (prefeitura_id, ano, numero),
  unique (id, prefeitura_id),
  foreign key (secretaria_id, prefeitura_id) references public.secretarias (id, prefeitura_id),
  check (situacao <> 'em_ciencia' or edital_publicado_em is not null),
  check (situacao <> 'aprovado' or (aprovado_por is not null and aprovado_em is not null and edital_publicado_em is not null)),
  check (aprovado_por is null or aprovado_por <> gerado_por)
);

create table public.descarte_itens (
  id uuid primary key default gen_random_uuid(),
  descarte_id uuid not null,
  prefeitura_id uuid not null,
  secretaria_id uuid not null,
  documento_id uuid not null,
  -- true enquanto o termo está aberto ou aprovado; false se o termo foi cancelado.
  aberto boolean not null default true,
  unique (descarte_id, documento_id),
  foreign key (descarte_id, prefeitura_id) references public.descartes (id, prefeitura_id),
  foreign key (documento_id, prefeitura_id, secretaria_id) references public.documentos (id, prefeitura_id, secretaria_id)
);
-- Um documento só entra em um termo vivo por vez.
create unique index descarte_itens_um_aberto on public.descarte_itens (documento_id) where aberto;
create index descarte_itens_descarte_idx on public.descarte_itens (descarte_id);

alter table public.descartes enable row level security;
alter table public.descarte_itens enable row level security;

-- Só leitura pela Data API; quem escreve são as funções public.descarte_*.
grant select on public.descartes, public.descarte_itens to authenticated;

create policy descartes_le on public.descartes for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and secretaria_id in (select app.secretarias_permitidas()));
create policy descarte_itens_le on public.descarte_itens for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and secretaria_id in (select app.secretarias_permitidas()));

create trigger auditar_descartes after insert or update on public.descartes
  for each row execute function app.auditar_alteracao();
-- Itens: auditoria só com ids (a tabela não tem dado pessoal).
create trigger auditar_descarte_itens after insert or update on public.descarte_itens
  for each row execute function app.auditar_alteracao();

-- Termo aprovado ou cancelado não muda mais; ninguém apaga termo nem item.
create or replace function app.descarte_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'termo não se apaga' using errcode = 'LD009';
  end if;
  if tg_table_name = 'descartes' and old.situacao in ('aprovado', 'cancelado') then
    raise exception 'termo encerrado não muda' using errcode = 'LD009';
  end if;
  if tg_table_name = 'descarte_itens' and (
       select d.situacao in ('aprovado', 'cancelado') from public.descartes d
       where d.id = old.descarte_id and d.prefeitura_id = old.prefeitura_id
     ) and not (old.aberto and not new.aberto and (
       select d.situacao = 'cancelado' from public.descartes d where d.id = old.descarte_id and d.prefeitura_id = old.prefeitura_id)) then
    raise exception 'termo encerrado não muda' using errcode = 'LD009';
  end if;
  return coalesce(new, old);
end
$$;
revoke execute on function app.descarte_imutavel() from public;
create trigger descartes_imutavel before update or delete on public.descartes
  for each row execute function app.descarte_imutavel();
create trigger descarte_itens_imutavel before update or delete on public.descarte_itens
  for each row execute function app.descarte_imutavel();

-- ---------------------------------------------------------------------------
-- Por que um documento NÃO pode ser eliminado agora (null = pode).
-- p_ignorar: termo em que ele já está (a aprovação confere de novo).
-- ---------------------------------------------------------------------------
create or replace function app.motivo_inelegivel(p_documento uuid, p_ignorar uuid default null)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  d public.documentos;
  r public.tabela_temporalidade;
  v_inicio date;
begin
  select * into d from public.documentos
  where id = p_documento and prefeitura_id = app.prefeitura_atual();
  if not found then return 'inexistente'; end if;
  if not d.ativo then return 'inativo'; end if;
  select * into r from public.tabela_temporalidade
  where prefeitura_id = d.prefeitura_id and classe = app.classe_documento(d.tipo, d.modalidade);
  if not found then return 'sem_regra'; end if;
  if r.destinacao <> 'eliminacao' then return 'guarda_permanente'; end if;
  v_inicio := case when d.tipo = 'contrato' then d.vigencia_fim else d.encerrado_em end;
  if v_inicio is null then return 'sem_data'; end if;
  if app.hoje() < (v_inicio + make_interval(years => r.prazo_corrente_anos + r.prazo_intermediaria_anos))::date then
    return 'prazo_nao_cumprido';
  end if;
  if app.documento_emprestado(d.id) then return 'emprestado'; end if;
  if exists (
    select 1 from public.descarte_itens i
    where i.documento_id = d.id and i.aberto and i.descarte_id is distinct from p_ignorar
  ) then return 'em_outro_termo'; end if;
  return null;
end
$$;
revoke execute on function app.motivo_inelegivel(uuid, uuid) from public, anon;
grant execute on function app.motivo_inelegivel(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Funções do fluxo (únicas que escrevem em descartes e descarte_itens)
-- ---------------------------------------------------------------------------

-- 1. Gera o termo em rascunho (a listagem). Coordenador da secretaria ou administrador.
create or replace function public.descarte_criar(p_secretaria uuid, p_documentos uuid[], p_observacao text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prefeitura uuid := app.prefeitura_atual();
  v_ano smallint := extract(year from app.hoje())::smallint;
  v_id uuid;
  v_doc uuid;
  v_motivo text;
begin
  if v_prefeitura is null or not app.eh_coordenador_de(p_secretaria) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if not exists (select 1 from public.secretarias s where s.id = p_secretaria and s.prefeitura_id = v_prefeitura) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if p_documentos is null or cardinality(p_documentos) not between 1 and 500 then
    raise exception 'escolha de 1 a 500 documentos' using errcode = 'LD002';
  end if;
  perform pg_advisory_xact_lock(hashtext('descarte:' || v_prefeitura::text));
  insert into public.descartes (prefeitura_id, secretaria_id, ano, numero, observacao)
  values (v_prefeitura, p_secretaria, v_ano,
          coalesce((select max(numero) from public.descartes where prefeitura_id = v_prefeitura and ano = v_ano), 0) + 1,
          nullif(trim(p_observacao), ''))
  returning id into v_id;
  for v_doc in select distinct unnest(p_documentos) loop
    if not exists (select 1 from public.documentos d where d.id = v_doc and d.secretaria_id = p_secretaria and d.prefeitura_id = v_prefeitura) then
      raise exception 'documento de outra secretaria' using errcode = 'LD002';
    end if;
    v_motivo := app.motivo_inelegivel(v_doc);
    if v_motivo is not null then
      raise exception 'documento não pode ser eliminado: %', v_motivo using errcode = 'LD001';
    end if;
    insert into public.descarte_itens (descarte_id, prefeitura_id, secretaria_id, documento_id)
    values (v_id, v_prefeitura, p_secretaria, v_doc);
  end loop;
  return v_id;
end
$$;

-- 2. Registra a publicação do edital de ciência (abre o prazo de 45 dias).
create or replace function public.descarte_publicar_edital(p_descarte uuid, p_data date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.descartes;
begin
  select * into d from public.descartes where id = p_descarte and prefeitura_id = app.prefeitura_atual();
  if not found or not app.eh_coordenador_de(d.secretaria_id) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if d.situacao <> 'rascunho' then
    raise exception 'termo fora de rascunho' using errcode = 'LD003';
  end if;
  if p_data is null or p_data > app.hoje() or p_data < (d.gerado_em at time zone 'America/Sao_Paulo')::date then
    raise exception 'data do edital inválida' using errcode = 'LD004';
  end if;
  update public.descartes set situacao = 'em_ciencia', edital_publicado_em = p_data where id = d.id;
end
$$;

-- 3. Aprova e elimina: só administrador, diferente de quem gerou, depois dos
--    45 dias do edital. Se qualquer documento deixou de estar apto, nada acontece.
create or replace function public.descarte_aprovar(p_descarte uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.descartes;
  v_item record;
  v_motivo text;
begin
  select * into d from public.descartes where id = p_descarte and prefeitura_id = app.prefeitura_atual() for update;
  if not found or not app.eh_admin() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if d.situacao <> 'em_ciencia' then
    raise exception 'termo sem edital de ciência' using errcode = 'LD003';
  end if;
  if auth.uid() = d.gerado_por then
    raise exception 'quem gerou o termo não o aprova' using errcode = 'LD005';
  end if;
  if app.hoje() < d.edital_publicado_em + 45 then
    raise exception 'prazo de ciência não cumprido' using errcode = 'LD006';
  end if;
  for v_item in select documento_id from public.descarte_itens where descarte_id = d.id and aberto loop
    v_motivo := app.motivo_inelegivel(v_item.documento_id, d.id);
    if v_motivo is not null then
      raise exception 'documento não pode ser eliminado: %', v_motivo using errcode = 'LD001';
    end if;
  end loop;
  update public.documentos set ativo = false
  where prefeitura_id = d.prefeitura_id
    and id in (select documento_id from public.descarte_itens where descarte_id = d.id and aberto);
  update public.descartes set situacao = 'aprovado', aprovado_por = auth.uid(), aprovado_em = now() where id = d.id;
end
$$;

-- 4. Cancela termo em rascunho ou em ciência; libera os documentos.
create or replace function public.descarte_cancelar(p_descarte uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.descartes;
begin
  select * into d from public.descartes where id = p_descarte and prefeitura_id = app.prefeitura_atual() for update;
  if not found or not app.eh_coordenador_de(d.secretaria_id) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if d.situacao not in ('rascunho', 'em_ciencia') then
    raise exception 'termo encerrado não muda' using errcode = 'LD009';
  end if;
  update public.descartes set situacao = 'cancelado' where id = d.id;
  update public.descarte_itens set aberto = false where descarte_id = d.id;
end
$$;

revoke execute on function public.descarte_criar(uuid, uuid[], text), public.descarte_publicar_edital(uuid, date),
  public.descarte_aprovar(uuid), public.descarte_cancelar(uuid) from public, anon;
grant execute on function public.descarte_criar(uuid, uuid[], text), public.descarte_publicar_edital(uuid, date),
  public.descarte_aprovar(uuid), public.descarte_cancelar(uuid) to authenticated;
