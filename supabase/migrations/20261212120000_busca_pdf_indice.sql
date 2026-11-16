-- Busca no texto do PDF pelo índice GIN (teste de carga, docs/desempenho.md).
-- Com 10 mil textos de OCR a busca em arquivo_textos lia a tabela inteira
-- (Seq Scan, ~1,1 s). Causa: com RLS, o Postgres só usa no índice condições
-- "leakproof", e o LIKE não é; o filtro da política vem antes e o GIN nunca
-- entra. Agora a pesquisa pega, uma vez só, os documentos cujo texto contém o
-- termo, por esta função.
-- Só troca o corpo da pesquisar_documentos (mesma assinatura): compatível com o
-- app no ar.

-- Índice com a prefeitura na frente: sem ela, uma palavra comum fazia reler o
-- texto de todas as prefeituras (2,5 s com 10 mil textos). btree_gin é extensão
-- do próprio Postgres (sem serviço externo). Troca o índice antigo, que só tinha
-- os trigramas.
create extension if not exists btree_gin with schema extensions;
-- Sem concurrently (migração roda em transação); hoje a tabela é pequena.
create index arquivo_textos_busca_pref_idx on public.arquivo_textos
  using gin (prefeitura_id, texto_busca extensions.gin_trgm_ops);
drop index public.arquivo_textos_busca_idx;

-- security definer para o índice valer; o acesso é o MESMO da política
-- arquivo_textos_le (prefeitura de quem chama e secretarias permitidas), escrito
-- aqui. Mudou a política, muda aqui. Recebe o termo já sem acento e com % _ \
-- escapados (como faz a pesquisa). Devolve só ids de documento.
create or replace function app.documentos_com_texto(p_termo text)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select t.documento_id from public.arquivo_textos t
  where t.prefeitura_id = (select app.prefeitura_atual())
    and t.secretaria_id in (select app.secretarias_permitidas())
    and t.texto_busca like '%' || p_termo || '%'
$$;
revoke execute on function app.documentos_com_texto(text) from public, anon;
grant execute on function app.documentos_com_texto(text) to authenticated;

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
  p_limite int default 50,
  p_origem text default null)
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
                                        or (length(v_digitos) >= 8 and d.cnpj like v_digitos || '%')
                                        or d.id = any(v_pdf)))
           or (length(v_busca) < 3 and (app.sem_acento(d.numero) = v_busca or d.cnpj = nullif(v_digitos, ''))))
      and (p_ano_de is null or d.ano >= p_ano_de)
      and (p_ano_ate is null or d.ano <= p_ano_ate)
      and (p_secretaria is null or d.secretaria_id = p_secretaria)
      and (p_origem is null or d.origem = p_origem)
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
revoke execute on function public.pesquisar_documentos(text, text, int, int, text, uuid, text, numeric, numeric, text, text, timestamptz, numeric, uuid, int, text) from public, anon;
grant execute on function public.pesquisar_documentos(text, text, int, int, text, uuid, text, numeric, numeric, text, text, timestamptz, numeric, uuid, int, text) to authenticated;
