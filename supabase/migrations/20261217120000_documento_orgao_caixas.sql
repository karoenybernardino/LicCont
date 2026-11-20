-- Documento simplificado, órgão (Prefeitura ou Câmara), dois tipos de caixa e segundo logo.
-- Sem dado cadastrado: as colunas saem sem migrar valores.
--  1. documentos perde empresa, CNPJ, CPF do credor, valor, situação, datas e vigência; ganha título do processo e órgão;
--  2. o prazo de guarda conta do FIM DO ANO do documento (ano 2025 + 5 anos = descarte a partir de 01/01/2031);
--     acaba o prazo "após evento": a classe é só prazo fixo ou guarda permanente;
--  3. caixas: órgão obrigatório, número em sequência por órgão, tipo geral ou detalhada e metadados;
--  4. o segundo logo (da Câmara) fica ao lado do logo da Prefeitura.
-- Convenção do projeto: tabela nova nasce com RLS e GRANT explícito (esta migração não cria tabela).

-- ---------------------------------------------------------------------------
-- 1. Classes: só prazo fixo ou guarda permanente
-- ---------------------------------------------------------------------------
update public.classes_documentais set tipo_prazo = 'fixo' where tipo_prazo = 'apos_evento';
-- Derruba junto o check (tipo_prazo <> 'apos_evento' or evento is not null).
alter table public.classes_documentais drop column evento;
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.classes_documentais'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%apos_evento%'
  loop
    execute format('alter table public.classes_documentais drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.classes_documentais
  add constraint classes_documentais_tipo_prazo_chk check (tipo_prazo in ('fixo', 'permanente'));

drop function public.equipe_classes(uuid);
create function public.equipe_classes(p_prefeitura uuid)
returns table (id uuid, grupo_id uuid, grupo text, codigo text, nome text, prazo_corrente_anos smallint,
               prazo_intermediaria_anos smallint, tipo_prazo text, destinacao text,
               observacao text, ativa boolean, em_uso boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.grupo_id, g.nome, c.codigo, c.nome, c.prazo_corrente_anos, c.prazo_intermediaria_anos,
         c.tipo_prazo, c.destinacao, c.observacao, c.ativa,
         (exists (select 1 from public.documentos d where d.classe_id = c.id)
          or exists (select 1 from public.caixas x where x.classe_id = c.id))
  from public.classes_documentais c
  join public.grupos_documentais g on g.id = c.grupo_id and g.prefeitura_id = c.prefeitura_id
  where c.prefeitura_id = p_prefeitura and app.pode_editar_classes(p_prefeitura)
  order by c.codigo
$$;
revoke execute on function public.equipe_classes(uuid) from public, anon;
grant execute on function public.equipe_classes(uuid) to authenticated;

-- p_linhas: [{codigo, nome, grupo, prazo_corrente, prazo_intermediaria, tipo_prazo, destinacao, observacao, tipologias}].
create or replace function public.classes_salvar(p_prefeitura uuid, p_linhas jsonb, p_substituir boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  l jsonb;
  v_grupo uuid;
  v_inseridas int := 0;
  v_atualizadas int := 0;
  v_removidas int := 0;
  v_desativadas int := 0;
  v_codigos text[] := '{}';
  v_codigo text;
  v_tip text;
  r record;
begin
  if not app.pode_editar_classes(p_prefeitura) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if jsonb_typeof(p_linhas) <> 'array' or jsonb_array_length(p_linhas) > 500 then
    raise exception 'tabela inválida' using errcode = '22023';
  end if;
  perform 1 from public.prefeituras where id = p_prefeitura for update;
  for l in select * from jsonb_array_elements(p_linhas) loop
    select g.id into v_grupo from public.grupos_documentais g
    where g.prefeitura_id = p_prefeitura and lower(g.nome) = lower(trim(l ->> 'grupo'));
    if v_grupo is null then
      raise exception 'grupo desconhecido' using errcode = '22023';
    end if;
    v_codigo := trim(l ->> 'codigo');
    v_codigos := v_codigos || v_codigo;
    if exists (select 1 from public.classes_documentais x where x.prefeitura_id = p_prefeitura and x.codigo = v_codigo) then
      v_atualizadas := v_atualizadas + 1;
    else
      v_inseridas := v_inseridas + 1;
    end if;
    insert into public.classes_documentais
      (prefeitura_id, grupo_id, codigo, nome, prazo_corrente_anos, prazo_intermediaria_anos,
       tipo_prazo, destinacao, observacao)
    values (
      p_prefeitura, v_grupo, v_codigo, trim(l ->> 'nome'),
      coalesce((l ->> 'prazo_corrente')::smallint, 0), coalesce((l ->> 'prazo_intermediaria')::smallint, 0),
      coalesce(l ->> 'tipo_prazo', 'fixo'),
      coalesce(l ->> 'destinacao', 'eliminacao'), nullif(trim(l ->> 'observacao'), ''))
    on conflict (prefeitura_id, codigo) do update set
      grupo_id = excluded.grupo_id, nome = excluded.nome,
      prazo_corrente_anos = excluded.prazo_corrente_anos, prazo_intermediaria_anos = excluded.prazo_intermediaria_anos,
      tipo_prazo = excluded.tipo_prazo, destinacao = excluded.destinacao,
      observacao = excluded.observacao, ativa = true, atualizado_em = now();
    for v_tip in select trim(x) from unnest(regexp_split_to_array(coalesce(l ->> 'tipologias', ''), '[;,]')) as x where trim(x) <> '' loop
      insert into public.tipologias (prefeitura_id, grupo_id, nome) values (p_prefeitura, v_grupo, v_tip)
      on conflict do nothing;
    end loop;
  end loop;
  if p_substituir then
    for r in select id, codigo from public.classes_documentais
             where prefeitura_id = p_prefeitura and not (codigo = any(v_codigos)) loop
      if exists (select 1 from public.documentos d where d.classe_id = r.id)
         or exists (select 1 from public.caixas x where x.classe_id = r.id) then
        update public.classes_documentais set ativa = false, atualizado_em = now() where id = r.id and ativa;
        v_desativadas := v_desativadas + 1;
      else
        delete from public.classes_documentais where id = r.id;
        v_removidas := v_removidas + 1;
      end if;
    end loop;
  end if;
  return jsonb_build_object('inseridas', v_inseridas, 'atualizadas', v_atualizadas,
                            'removidas', v_removidas, 'desativadas', v_desativadas);
end $$;

-- ---------------------------------------------------------------------------
-- 2. Documentos: sai o que o cadastro não pede mais; entram título do processo e órgão
-- ---------------------------------------------------------------------------
drop function app.data_evento(public.documentos);

-- A coluna de busca depende de empresa e CNPJ; sai primeiro e volta sem eles.
alter table public.documentos drop column texto_busca;
alter table public.documentos
  drop column empresa,
  drop column cnpj,
  drop column cpf_credor,
  drop column valor,
  drop column situacao,
  drop column vigencia_inicio,
  drop column vigencia_fim,
  drop column encerrado_em,
  drop column data_producao,
  drop column evento_em;

alter table public.documentos
  add column titulo_processo text check (titulo_processo is null or length(trim(titulo_processo)) between 2 and 200),
  -- Órgão do documento: Prefeitura ou Câmara. Sem valor no cadastro, herda o da caixa (gatilho abaixo).
  add column orgao text not null default 'prefeitura' check (orgao in ('prefeitura', 'camara'));
alter table public.documentos alter column orgao drop default;
alter table public.documentos
  add column texto_busca text generated always as (
    app.sem_acento(numero || ' ' || objeto || ' ' || coalesce(titulo_processo, ''))
  ) stored;
create index documentos_busca_idx on public.documentos using gin (texto_busca extensions.gin_trgm_ops);
create index documentos_orgao_idx on public.documentos (prefeitura_id, orgao);

grant insert (titulo_processo, orgao) on public.documentos to authenticated;
grant update (titulo_processo, orgao) on public.documentos to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Caixas: órgão, número por órgão, tipo (geral ou detalhada) e metadados
-- ---------------------------------------------------------------------------
-- geral = arquivo geral (cadastro bruto, sem listar o conteúdo); detalhada = licitações e contratos.
-- As caixas nascem em lote no mapa (órgão Prefeitura por padrão); o órgão certo vem no cadastro.
alter table public.caixas
  add column orgao text not null default 'prefeitura' check (orgao in ('prefeitura', 'camara')),
  add column tipo text not null default 'detalhada' check (tipo in ('geral', 'detalhada')),
  add column fundo text check (fundo is null or length(trim(fundo)) between 2 and 120),
  add column setor text check (setor is null or length(trim(setor)) between 2 and 120),
  add column meses smallint[] not null default '{}'
    check (cardinality(meses) <= 12 and meses <@ array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]::smallint[]),
  add column ano_limite smallint check (ano_limite is null or ano_limite between 1900 and 2100),
  add column digitalizada boolean not null default false,
  add column observacao text check (observacao is null or length(observacao) <= 500),
  add column codigo_classificacao text check (codigo_classificacao is null or codigo_classificacao ~ '^[0-9A-Za-z.-]{1,20}$'),
  add column tipologia_id uuid,
  add column prazo_anos smallint check (prazo_anos is null or prazo_anos between 0 and 99),
  -- Etiqueta geral da caixa, sem listar itens (vale também para caixa detalhada).
  add column etiqueta_geral boolean not null default false,
  add foreign key (tipologia_id, prefeitura_id) references public.tipologias (id, prefeitura_id);
create index caixas_orgao_tipo_idx on public.caixas (prefeitura_id, orgao, tipo);

grant insert (orgao, tipo, fundo, setor, meses, ano_limite, digitalizada, observacao, codigo_classificacao,
              tipologia_id, prazo_anos, etiqueta_geral) on public.caixas to authenticated;
grant update (orgao, tipo, fundo, setor, meses, ano_limite, digitalizada, observacao, codigo_classificacao,
              tipologia_id, prazo_anos, etiqueta_geral) on public.caixas to authenticated;

-- Contador por (prefeitura, órgão): Prefeitura e Câmara numeram separadas.
alter table public.caixa_contador
  add column orgao text not null default 'prefeitura' check (orgao in ('prefeitura', 'camara'));
alter table public.caixa_contador drop constraint caixa_contador_pkey;
alter table public.caixa_contador add primary key (prefeitura_id, orgao);
alter table public.caixas drop constraint caixas_sequencial_unico;
alter table public.caixas add constraint caixas_sequencial_unico unique (prefeitura_id, orgao, sequencial);

create or replace function app.caixa_sequencial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.caixa_contador (prefeitura_id, orgao, proximo) values (new.prefeitura_id, new.orgao, 2)
  on conflict (prefeitura_id, orgao) do update set proximo = public.caixa_contador.proximo + 1
  returning proximo - 1 into new.sequencial;
  return new;
end $$;
-- Trocar o órgão da caixa pega o próximo número do órgão novo (o antigo fica como vão).
create trigger b_caixas_orgao_sequencial before update of orgao on public.caixas
  for each row when (old.orgao is distinct from new.orgao) execute function app.caixa_sequencial();

-- Classe e prazo pelo código da classificação (o app preenche classe, tipologia e prazo ao escolher o código).
-- security invoker: o RLS de classes_documentais já limita ao órgão e aos grupos permitidos.
create or replace function public.classe_por_codigo(p_codigo text)
returns table (classe_id uuid, grupo_id uuid, codigo text, nome text, prazo_anos integer, permanente boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.grupo_id, c.codigo, c.nome,
         (c.prazo_corrente_anos + c.prazo_intermediaria_anos)::int, c.destinacao = 'guarda_permanente'
  from public.classes_documentais c
  where c.ativa and c.codigo = trim(p_codigo) and c.prefeitura_id = (select app.prefeitura_atual())
$$;
revoke execute on function public.classe_por_codigo(text) from public, anon;
grant execute on function public.classe_por_codigo(text) to authenticated;

-- "Próxima caixa livre" só entre as detalhadas: a caixa geral não lista documentos.
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
    and c.ativo and c.tipo = 'detalhada' and n.ativo and m.ativo and r.ativo and g.ativo
    and (p_nivel is null or n.id = p_nivel)
    and (p_modulo is null or m.id = p_modulo)
    and (p_rua is null or r.id = p_rua)
    and (select count(*) from public.documentos d where d.caixa_id = c.id and d.ativo)
        < c.capacidade_documentos
  order by r.codigo, m.numero, n.numero, c.numero
  limit 1
$$;

-- Documento herda o órgão da caixa quando o cadastro não escolhe; caixa geral não lista documentos.
create or replace function app.documento_orgao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_orgao text;
  v_tipo text;
begin
  if new.caixa_id is not null and (tg_op = 'INSERT' or new.caixa_id is distinct from old.caixa_id) then
    select x.orgao, x.tipo into v_orgao, v_tipo from public.caixas x
    where x.id = new.caixa_id and x.prefeitura_id = new.prefeitura_id;
    if v_tipo = 'geral' then
      raise exception 'caixa geral não lista documentos' using errcode = 'LC008';
    end if;
    if tg_op = 'INSERT' then new.orgao := coalesce(new.orgao, v_orgao); end if;
  end if;
  return new;
end $$;
revoke execute on function app.documento_orgao() from public, anon, authenticated;
create trigger a_documentos_orgao before insert or update of caixa_id on public.documentos
  for each row execute function app.documento_orgao();

-- ---------------------------------------------------------------------------
-- 4. Elegibilidade: conta do fim do ano do documento
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
  c public.classes_documentais;
begin
  select * into d from public.documentos
  where id = p_documento and prefeitura_id = app.prefeitura_atual();
  if not found then return 'inexistente'; end if;
  if not d.ativo then return 'inativo'; end if;
  select * into c from public.classes_documentais
  where id = d.classe_id and prefeitura_id = d.prefeitura_id;
  if not found then return 'sem_regra'; end if;
  if c.destinacao <> 'eliminacao' then return 'guarda_permanente'; end if;
  -- Ano 2025 + 5 anos de guarda: fim de 2030, liberado a partir de 01/01/2031.
  if app.hoje() < make_date(d.ano::int + c.prazo_corrente_anos + c.prazo_intermediaria_anos + 1, 1, 1) then
    return 'prazo_nao_cumprido';
  end if;
  -- Digitalizado só sai com assinatura ICP-Brasil; sem PDF é só organização do arquivo.
  if exists (select 1 from public.arquivos a where a.documento_id = d.id and a.ativo and not a.assinatura_icp) then
    return 'digitalizado_sem_icp';
  end if;
  if app.documento_emprestado(d.id) then return 'emprestado'; end if;
  if exists (
    select 1 from public.descarte_itens i
    where i.documento_id = d.id and i.aberto and i.descarte_id is distinct from p_ignorar
  ) then return 'em_outro_termo'; end if;
  return null;
end
$$;

-- ---------------------------------------------------------------------------
-- 5. Importação por planilha e TCE sem as colunas removidas
-- ---------------------------------------------------------------------------
create or replace function public.gravar_lote_importacao(p_lote uuid, p_linhas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.lotes_importacao;
  v_linha jsonb;
  v_gravados int := 0;
  v_pulados int := 0;
  v_id uuid;
begin
  select * into l from public.lotes_importacao x
  where x.id = p_lote and x.prefeitura_id = app.prefeitura_atual() for update;
  if not found or not app.eh_admin() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if l.situacao <> 'aberto' then
    raise exception 'lote já gravado' using errcode = '23514';
  end if;
  if jsonb_typeof(p_linhas) <> 'array' or jsonb_array_length(p_linhas) > l.linhas_total then
    raise exception 'linhas inválidas' using errcode = '23514';
  end if;

  for v_linha in select * from jsonb_array_elements(p_linhas) loop
    if not exists (select 1 from public.secretarias s
                   where s.id = (v_linha ->> 'secretaria_id')::uuid
                     and s.prefeitura_id = l.prefeitura_id and s.ativa) then
      raise exception 'secretaria inválida' using errcode = '42501';
    end if;
    -- A chave composta (classe, prefeitura) recusa classe ou tipologia de outro órgão.
    insert into public.documentos (prefeitura_id, secretaria_id, tipo, modalidade, numero, ano, objeto,
                                   titulo_processo, classe_id, tipologia_id, volume, orgao,
                                   origem, lote_id, importado_em)
    values (l.prefeitura_id, (v_linha ->> 'secretaria_id')::uuid, v_linha ->> 'tipo', v_linha ->> 'modalidade',
            v_linha ->> 'numero', (v_linha ->> 'ano')::smallint, v_linha ->> 'objeto',
            nullif(trim(v_linha ->> 'titulo_processo'), ''),
            nullif(v_linha ->> 'classe_id', '')::uuid, nullif(v_linha ->> 'tipologia_id', '')::uuid,
            coalesce((v_linha ->> 'volume')::smallint, 1), coalesce(nullif(v_linha ->> 'orgao', ''), 'prefeitura'),
            'planilha', l.id, now())
    on conflict (prefeitura_id, tipo, coalesce(modalidade, ''), numero, ano) where ativo do nothing
    returning id into v_id;
    if v_id is null then v_pulados := v_pulados + 1; else v_gravados := v_gravados + 1; end if;
    v_id := null;
  end loop;

  update public.lotes_importacao set gravados = v_gravados, pulados = v_pulados, situacao = 'gravado'
  where id = l.id;
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id, depois)
  values (l.prefeitura_id, auth.uid(), 'importacao.gravar', 'lotes_importacao', l.id::text,
          jsonb_build_object('gravados', v_gravados, 'pulados', v_pulados));
  return jsonb_build_object('gravados', v_gravados, 'pulados', v_pulados);
end
$$;

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
    insert into public.documentos (prefeitura_id, secretaria_id, tipo, modalidade, numero, ano, objeto, orgao,
                                   origem, tce_id, importado_em, tce_a_conferir)
    values (p.id, p.tce_secretaria_id, r ->> 'tipo', r ->> 'modalidade', r ->> 'numero', (r ->> 'ano')::smallint,
            r ->> 'objeto', 'prefeitura', 'tce', r ->> 'tce_id', now(), true)
    returning id into v_doc;
    v_novos := v_novos + 1;
  end loop;

  update public.importacoes_tce
  set novos = novos + v_novos, duplicados = duplicados + v_dup, ja_existentes = ja_existentes + v_ja
  where id = i.id;
  return jsonb_build_object('novos', v_novos, 'duplicados', v_dup, 'ja_existentes', v_ja);
end
$$;

-- ---------------------------------------------------------------------------
-- 6. Pesquisa: sem situação, valor, vigência nem CNPJ; com órgão, fundo, setor e mês
-- ---------------------------------------------------------------------------
drop function public.pesquisar_documentos(text, text, int, int, text, uuid, text, numeric, numeric, text, text, timestamptz, numeric, uuid, int, text);

create function public.pesquisar_documentos(
  p_busca text default null,
  p_aba text default 'todos',
  p_ano_de int default null,
  p_ano_ate int default null,
  p_modalidade text default null,
  p_secretaria uuid default null,
  p_ordem text default 'recentes',
  p_cursor_criado timestamptz default null,
  p_cursor_id uuid default null,
  p_limite int default 50,
  p_origem text default null,
  p_orgao text default null,
  p_fundo text default null,
  p_setor text default null,
  p_mes int default null)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_busca text := app.sem_acento(trim(coalesce(p_busca, '')));
  v_limite int := least(greatest(coalesce(p_limite, 50), 1), 100);
  v_fundo text := lower(app.sem_acento(trim(coalesce(p_fundo, ''))));
  v_setor text := lower(app.sem_acento(trim(coalesce(p_setor, ''))));
  v_contagens jsonb;
  v_itens jsonb;
  v_proximo jsonb;
  v_pdf uuid[] := '{}';
  v_tamanho int := length(app.sem_acento(trim(coalesce(p_busca, ''))));
begin
  if v_busca <> '' then
    v_busca := replace(replace(replace(v_busca, '\', '\\'), '%', '\%'), '_', '\_');
  end if;
  -- Texto do PDF: uma busca só, pelo índice, antes de filtrar os documentos.
  -- Tamanho antes do escape: "%%" não dispara leitura de todos os textos.
  if v_tamanho >= 4 then
    v_pdf := array(select app.documentos_com_texto(v_busca));
  end if;

  with base as materialized (
    select d.*
    from public.documentos d
    where d.ativo
      and (v_busca = ''
           or (length(v_busca) >= 3 and (d.texto_busca like '%' || v_busca || '%'
                                        or d.id = any(v_pdf)))
           or (length(v_busca) < 3 and app.sem_acento(d.numero) = v_busca))
      and (p_ano_de is null or d.ano >= p_ano_de)
      and (p_ano_ate is null or d.ano <= p_ano_ate)
      and (p_secretaria is null or d.secretaria_id = p_secretaria)
      and (p_origem is null or d.origem = p_origem)
      and (p_orgao is null or d.orgao = p_orgao)
      and (p_modalidade is null or d.tipo <> 'licitacao' or d.modalidade = p_modalidade)
      and ((v_fundo = '' and v_setor = '' and p_mes is null)
           or exists (
             select 1 from public.caixas x
             where x.id = d.caixa_id
               and (v_fundo = '' or strpos(lower(app.sem_acento(coalesce(x.fundo, ''))), v_fundo) > 0)
               and (v_setor = '' or strpos(lower(app.sem_acento(coalesce(x.setor, ''))), v_setor) > 0)
               and (p_mes is null or p_mes = any(x.meses))))
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
        else p_cursor_criado is null or (b.criado_em, b.id) < (p_cursor_criado, p_cursor_id)
      end
    order by
      case when p_ordem = 'antigos' then b.criado_em end asc,
      case when p_ordem <> 'antigos' then b.criado_em end desc,
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
        'objeto', p.objeto, 'titulo_processo', p.titulo_processo, 'orgao', p.orgao,
        'secretaria_id', p.secretaria_id, 'criado_em', p.criado_em,
        'conferido', p.conferido_em is not null,
        'origem', p.origem, 'sem_endereco', p.caixa_id is null,
        'codigo', case when c.id is null then null else r.codigo || '-M' || m.numero || '-N' || n.numero || '-C' || lpad(c.numero::text, 2, '0') end,
        'tem_pdf', exists (select 1 from public.arquivos a where a.documento_id = p.id and a.ativo))
        order by p.pos)
      from pagina p
      left join public.caixas c on c.id = p.caixa_id
      left join public.niveis n on n.id = c.nivel_id
      left join public.modulos m on m.id = n.modulo_id
      left join public.ruas r on r.id = m.rua_id
      where p.pos <= v_limite), '[]'::jsonb),
    (select jsonb_build_object('criado_em', x.criado_em, 'id', x.id)
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
revoke execute on function public.pesquisar_documentos(text, text, int, int, text, uuid, text, timestamptz, uuid, int, text, text, text, text, int) from public, anon;
grant execute on function public.pesquisar_documentos(text, text, int, int, text, uuid, text, timestamptz, uuid, int, text, text, text, text, int) to authenticated;

-- Pesquisa de caixas (gerais e detalhadas) por órgão, tipo, fundo, setor, mês e ano limite.
-- security invoker: o RLS de caixas limita à prefeitura de quem chama.
create or replace function public.pesquisar_caixas(
  p_orgao text default null,
  p_tipo text default null,
  p_fundo text default null,
  p_setor text default null,
  p_mes int default null,
  p_ano int default null,
  p_limite int default 50)
returns table (id uuid, orgao text, sequencial integer, tipo text, fundo text, setor text, meses smallint[],
               ano_limite smallint, digitalizada boolean, codigo_classificacao text, classe_id uuid,
               prazo_anos smallint, etiqueta_geral boolean, codigo text)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.orgao, c.sequencial, c.tipo, c.fundo, c.setor, c.meses, c.ano_limite, c.digitalizada,
         c.codigo_classificacao, c.classe_id, c.prazo_anos, c.etiqueta_geral,
         r.codigo || '-M' || m.numero || '-N' || n.numero || '-C' || lpad(c.numero::text, 2, '0')
  from public.caixas c
  join public.niveis n on n.id = c.nivel_id
  join public.modulos m on m.id = n.modulo_id
  join public.ruas r on r.id = m.rua_id
  where c.ativo
    and (p_orgao is null or c.orgao = p_orgao)
    and (p_tipo is null or c.tipo = p_tipo)
    and (coalesce(trim(p_fundo), '') = ''
         or strpos(lower(app.sem_acento(coalesce(c.fundo, ''))), lower(app.sem_acento(trim(p_fundo)))) > 0)
    and (coalesce(trim(p_setor), '') = ''
         or strpos(lower(app.sem_acento(coalesce(c.setor, ''))), lower(app.sem_acento(trim(p_setor)))) > 0)
    and (p_mes is null or p_mes = any(c.meses))
    and (p_ano is null or c.ano_limite = p_ano)
  order by c.orgao, c.sequencial
  limit least(greatest(coalesce(p_limite, 50), 1), 200)
$$;
revoke execute on function public.pesquisar_caixas(text, text, text, text, int, int, int) from public, anon;
grant execute on function public.pesquisar_caixas(text, text, text, text, int, int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Segundo logo: Prefeitura e Câmara, ambos nos dois cadastros
-- ---------------------------------------------------------------------------
-- prefeituras.tipo fica sem efeito (um cadastro por município; o órgão é escolhido na caixa e no documento).
alter table public.prefeituras
  add column logo_camara_caminho text
    check (logo_camara_caminho is null or logo_camara_caminho ~ '^orgaos/[0-9a-f-]{36}/logo-camara\.png$');

drop function public.etiqueta_marca();
create function public.etiqueta_marca()
returns table (nome text, nome_etiqueta text, tipo text, logo_caminho text, parceira_logo_caminho text,
               logo_camara_caminho text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.nome, p.nome_etiqueta, p.tipo, p.logo_caminho, pa.logo_caminho, p.logo_camara_caminho
  from public.prefeituras p
  left join public.parceiras pa on pa.id = p.parceira_id and pa.ativa
  where p.id = app.prefeitura_atual()
$$;
revoke execute on function public.etiqueta_marca() from public, anon;
grant execute on function public.etiqueta_marca() to authenticated;

drop function public.equipe_orgao_marca(uuid, text, text, text, boolean, uuid);
create function public.equipe_orgao_marca(
  p_prefeitura uuid, p_nome_etiqueta text, p_logo text, p_remover_logo boolean,
  p_logo_camara text, p_remover_logo_camara boolean, p_parceira uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not app.eh_equipe() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  update public.prefeituras set
    nome_etiqueta = nullif(trim(p_nome_etiqueta), ''),
    logo_caminho = case when p_remover_logo then null else coalesce(p_logo, logo_caminho) end,
    logo_camara_caminho = case when p_remover_logo_camara then null else coalesce(p_logo_camara, logo_camara_caminho) end,
    parceira_id = p_parceira
  where id = p_prefeitura;
end $$;
revoke execute on function public.equipe_orgao_marca(uuid, text, text, boolean, text, boolean, uuid) from public, anon;
grant execute on function public.equipe_orgao_marca(uuid, text, text, boolean, text, boolean, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Painel: filtro por órgão (Prefeitura ou Câmara), além da secretaria
-- ---------------------------------------------------------------------------
drop function public.painel_resumo(uuid);
create function public.painel_resumo(p_secretaria uuid default null, p_orgao text default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with d as (
    select x.id, x.tipo, x.ano, x.caixa_id, x.tce_a_conferir,
           exists (select 1 from public.arquivos a where a.documento_id = x.id and a.ativo and a.situacao = 'pronto') as com_pdf
    from public.documentos x
    where x.ativo and (p_secretaria is null or x.secretaria_id = p_secretaria)
      and (p_orgao is null or x.orgao = p_orgao)
  ), por_ano as (
    select ano,
           count(*) filter (where tipo = 'licitacao') as licitacoes,
           count(*) filter (where tipo = 'contrato') as contratos
    from d group by ano
  ), emp as (
    select count(*) as abertos,
           count(*) filter (where e.prazo_em < (now() at time zone 'America/Sao_Paulo')::date) as atrasados,
           max((now() at time zone 'America/Sao_Paulo')::date - e.prazo_em) filter (where e.prazo_em < (now() at time zone 'America/Sao_Paulo')::date) as mais_antigo_dias
    from public.emprestimos e
    where e.devolvido_em is null and (p_secretaria is null or e.secretaria_id = p_secretaria)
  )
  select jsonb_build_object(
    'documentos', jsonb_build_object(
      'total', (select count(*) from d),
      'licitacoes', (select count(*) from d where tipo = 'licitacao'),
      'contratos', (select count(*) from d where tipo = 'contrato'),
      'sem_endereco', (select count(*) from d where caixa_id is null),
      'com_pdf', (select count(*) from d where com_pdf),
      'sem_pdf', (select count(*) from d where not com_pdf)),
    'por_ano', coalesce((select jsonb_agg(jsonb_build_object('ano', ano, 'licitacoes', licitacoes, 'contratos', contratos) order by ano) from por_ano), '[]'::jsonb),
    'tce', jsonb_build_object(
      'a_conferir', (select count(*) from d where tce_a_conferir),
      'duplicados', (select count(*) from public.tce_duplicados where decisao is null)),
    'emprestimos', (select jsonb_build_object('abertos', abertos, 'atrasados', atrasados, 'mais_antigo_dias', mais_antigo_dias) from emp)
  )
$$;
revoke execute on function public.painel_resumo(uuid, text) from public, anon;
grant execute on function public.painel_resumo(uuid, text) to authenticated;

drop function public.painel_caixas();
create function public.painel_caixas(p_orgao text default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with c as (
    select cx.id, cx.capacidade_documentos as capacidade,
           (select count(*) from public.documentos d where d.caixa_id = cx.id and d.ativo) as ocupados
    from public.caixas cx
    where cx.ativo and cx.prefeitura_id = app.prefeitura_atual()
      and (p_orgao is null or cx.orgao = p_orgao)
  )
  select jsonb_build_object(
    'total', count(*),
    'com_documento', count(*) filter (where ocupados > 0),
    'cheias', count(*) filter (where ocupados >= capacidade),
    'com_espaco', count(*) filter (where ocupados > 0 and ocupados < capacidade),
    'vazias', count(*) filter (where ocupados = 0))
  from c
$$;
revoke execute on function public.painel_caixas(text) from public, anon;
grant execute on function public.painel_caixas(text) to authenticated;
