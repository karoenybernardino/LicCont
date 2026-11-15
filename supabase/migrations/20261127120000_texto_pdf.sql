-- Texto do PDF lido por OCR (no navegador de quem envia) e busca dentro dele.
-- O texto pode conter dado pessoal de terceiros (está no papel): fica só nesta
-- tabela, com o mesmo isolamento do documento (prefeitura e secretaria), fora da
-- auditoria e de qualquer log. Ninguém grava direto: só a função abaixo.
create table public.arquivo_textos (
  arquivo_id uuid primary key references public.arquivos (id),
  prefeitura_id uuid not null,
  secretaria_id uuid not null,
  documento_id uuid not null,
  texto text not null check (length(texto) between 1 and 300000),
  paginas_lidas int not null check (paginas_lidas between 1 and 100000),
  criado_por uuid not null default auth.uid() references auth.users (id),
  atualizado_em timestamptz not null default now(),
  texto_busca text generated always as (app.sem_acento(texto)) stored,
  foreign key (documento_id, prefeitura_id, secretaria_id)
    references public.documentos (id, prefeitura_id, secretaria_id)
);
create index arquivo_textos_documento_idx on public.arquivo_textos (documento_id);
create index arquivo_textos_busca_idx on public.arquivo_textos using gin (texto_busca extensions.gin_trgm_ops);

alter table public.arquivo_textos enable row level security;
grant select on public.arquivo_textos to authenticated;
revoke all on public.arquivo_textos from anon, service_role;

create policy arquivo_textos_le on public.arquivo_textos for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and secretaria_id in (select app.secretarias_permitidas()));

-- Grava (ou troca) o texto do PDF ativo e pronto de um documento. Quem cadastra na secretaria.
create or replace function public.salvar_texto_pdf(p_arquivo uuid, p_texto text, p_paginas int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.arquivos;
begin
  select * into a from public.arquivos x
  where x.id = p_arquivo and x.prefeitura_id = app.prefeitura_atual()
    and x.secretaria_id in (select app.secretarias_permitidas());
  if not found or not app.pode_cadastrar(a.secretaria_id) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if a.situacao <> 'pronto' or not a.ativo or coalesce(length(trim(p_texto)), 0) = 0
     or length(p_texto) > 300000 or p_paginas not between 1 and 100000 then
    raise exception 'texto inválido' using errcode = '23514';
  end if;
  insert into public.arquivo_textos (arquivo_id, prefeitura_id, secretaria_id, documento_id, texto, paginas_lidas)
  values (a.id, a.prefeitura_id, a.secretaria_id, a.documento_id, p_texto, p_paginas)
  on conflict (arquivo_id) do update
    set texto = excluded.texto, paginas_lidas = excluded.paginas_lidas, criado_por = auth.uid(), atualizado_em = now();
  -- Trilha sem o texto: só o id do arquivo.
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id)
  values (a.prefeitura_id, auth.uid(), 'arquivos.ocr', 'arquivos', a.id::text);
end
$$;
revoke execute on function public.salvar_texto_pdf(uuid, text, int) from public, anon;
grant execute on function public.salvar_texto_pdf(uuid, text, int) to authenticated;

-- Pesquisa: a busca (4 letras ou mais) também acha o texto lido do PDF.
-- É a mesma função de antes (invoker, o RLS vale) com uma condição a mais.
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
           or (length(v_busca) >= 3 and (d.texto_busca like '%' || v_busca || '%'
                                        or (length(v_digitos) >= 8 and d.cnpj like v_digitos || '%')
                                        or (length(v_busca) >= 4 and exists (
                                              select 1 from public.arquivo_textos t
                                              where t.documento_id = d.id and t.texto_busca like '%' || v_busca || '%'))))
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
