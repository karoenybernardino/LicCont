-- Fase 4 · Mapa (docs/fases/fase-4.md). A migração só adiciona: colunas
-- opcionais de planta, a tabela planta_elementos e duas funções.
-- Convenções das Fases 1 a 3: RLS ligado, GRANT por coluna, nada para anon
-- nem service_role, nenhum DELETE, funções app.* com search_path vazio.

-- ---------------------------------------------------------------------------
-- Planta do galpão: tudo opcional (vazio = desenho automático). A unidade é a
-- célula de módulo (largura de um módulo de estante).
-- ---------------------------------------------------------------------------
alter table public.galpoes
  add column planta_largura smallint check (planta_largura between 4 and 200),
  add column planta_profundidade smallint check (planta_profundidade between 4 and 200),
  add column entrada_lado text check (entrada_lado in ('frente', 'fundo', 'esquerda', 'direita')),
  add column entrada_posicao smallint check (entrada_posicao between 0 and 199);

alter table public.ruas
  add column planta_x smallint check (planta_x between 0 and 199),
  add column planta_y smallint check (planta_y between 0 and 199),
  add column planta_giro smallint check (planta_giro in (0, 90, 180, 270)),
  add constraint ruas_planta_par check ((planta_x is null) = (planta_y is null));

grant update (planta_largura, planta_profundidade, entrada_lado, entrada_posicao)
  on public.galpoes to authenticated;
grant update (planta_x, planta_y, planta_giro) on public.ruas to authenticated;

-- O coordenador também desenha a planta (já mexe nas caixas), mas não renomeia
-- galpão nem desativa rua: as políticas aceitam os dois e o gatilho recusa,
-- para quem não é administrador, qualquer mudança fora das colunas da planta.
create or replace function app.planta_confere()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_planta text[] := case tg_table_name
    when 'galpoes' then array['planta_largura', 'planta_profundidade', 'entrada_lado', 'entrada_posicao']
    else array['planta_x', 'planta_y', 'planta_giro']
  end;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'authenticated' then
    return new;
  end if;
  if (select app.eh_admin()) then
    return new;
  end if;
  if to_jsonb(new) - v_planta is distinct from to_jsonb(old) - v_planta then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return new;
end
$$;
revoke execute on function app.planta_confere() from public;
-- Prefixo a_: roda antes dos gatilhos de desativação, para o coordenador
-- receber sempre o mesmo erro de permissão.
create trigger a_galpoes_planta_confere before update on public.galpoes
  for each row execute function app.planta_confere();
create trigger a_ruas_planta_confere before update on public.ruas
  for each row execute function app.planta_confere();

drop policy galpoes_altera on public.galpoes;
create policy galpoes_altera on public.galpoes for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and ((select app.eh_admin()) or (select app.eh_coordenador())))
  with check (prefeitura_id = (select app.prefeitura_atual())
              and ((select app.eh_admin()) or (select app.eh_coordenador())));

drop policy ruas_altera on public.ruas;
create policy ruas_altera on public.ruas for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and ((select app.eh_admin()) or (select app.eh_coordenador())))
  with check (prefeitura_id = (select app.prefeitura_atual())
              and ((select app.eh_admin()) or (select app.eh_coordenador())));

-- ---------------------------------------------------------------------------
-- Portas, pilares, paredes internas e áreas com nome
-- ---------------------------------------------------------------------------
create table public.planta_elementos (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null,
  galpao_id uuid not null,
  tipo text not null check (tipo in ('porta', 'pilar', 'parede', 'area')),
  rotulo text check (rotulo is null or length(trim(rotulo)) between 1 and 40),
  x smallint not null check (x between 0 and 199),
  y smallint not null check (y between 0 and 199),
  largura smallint not null default 1 check (largura between 1 and 200),
  profundidade smallint not null default 1 check (profundidade between 1 and 200),
  giro smallint not null default 0 check (giro in (0, 90, 180, 270)),
  ativo boolean not null default true,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  unique (id, prefeitura_id),
  foreign key (galpao_id, prefeitura_id) references public.galpoes (id, prefeitura_id)
);
create index planta_elementos_galpao_idx on public.planta_elementos (galpao_id) where ativo;

create trigger auditar_planta_elementos after insert or update on public.planta_elementos
  for each row execute function app.auditar_alteracao();

alter table public.planta_elementos enable row level security;
revoke all on public.planta_elementos from service_role;
grant select on public.planta_elementos to authenticated;
grant insert (prefeitura_id, galpao_id, tipo, rotulo, x, y, largura, profundidade, giro)
  on public.planta_elementos to authenticated;
grant update (rotulo, x, y, largura, profundidade, giro, ativo)
  on public.planta_elementos to authenticated;

create policy planta_elementos_le on public.planta_elementos for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()));
create policy planta_elementos_inclui on public.planta_elementos for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual())
              and ((select app.eh_admin()) or (select app.eh_coordenador())));
create policy planta_elementos_altera on public.planta_elementos for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and ((select app.eh_admin()) or (select app.eh_coordenador())))
  with check (prefeitura_id = (select app.prefeitura_atual())
              and ((select app.eh_admin()) or (select app.eh_coordenador())));

-- ---------------------------------------------------------------------------
-- Ocupação do galpão inteiro numa chamada ("Mostrar ocupação"). Só números.
-- Galpão de outra prefeitura e galpão inexistente dão o mesmo resultado vazio.
-- ---------------------------------------------------------------------------
create or replace function public.ocupacao_galpao(p_galpao uuid)
returns table (caixa_id uuid, documentos int, capacidade smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, count(d.id)::int, c.capacidade_documentos
  from public.galpoes g
  join public.ruas r on r.galpao_id = g.id
  join public.modulos m on m.rua_id = r.id
  join public.niveis n on n.modulo_id = m.id
  join public.caixas c on c.nivel_id = n.id
  left join public.documentos d on d.caixa_id = c.id and d.ativo
  where g.id = p_galpao
    and g.prefeitura_id = app.prefeitura_atual()
    and g.ativo and r.ativo and m.ativo and n.ativo and c.ativo
  group by c.id, c.capacidade_documentos
$$;
revoke execute on function public.ocupacao_galpao(uuid) from public, anon;
grant execute on function public.ocupacao_galpao(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Mover documentos em lote: todos mudam ou nenhum muda (LC006). security
-- invoker: o RLS e os GRANTs de quem chama valem, então documento de outra
-- prefeitura, de outra secretaria ou de quem só consulta não entra no UPDATE e
-- o erro é o mesmo de um id que não existe. A caixa destino passa pelo gatilho
-- app.documento_confere; a auditoria da Fase 3 grava a caixa antes e depois.
-- ---------------------------------------------------------------------------
create or replace function public.mover_documentos(p_documentos uuid[], p_destino uuid)
returns int
language plpgsql
set search_path = ''
as $$
declare
  v_n int := coalesce(cardinality(p_documentos), 0);
  v_mudou int;
begin
  if v_n = 0 or v_n > 200
     or (select count(distinct x) from unnest(p_documentos) as x) <> v_n then
    raise exception 'não foi possível mover' using errcode = 'LC006';
  end if;
  update public.documentos set caixa_id = p_destino
  where id = any (p_documentos) and ativo;
  get diagnostics v_mudou = row_count;
  if v_mudou <> v_n then
    raise exception 'não foi possível mover' using errcode = 'LC006';
  end if;
  return v_mudou;
end
$$;
revoke execute on function public.mover_documentos(uuid[], uuid) from public, anon;
grant execute on function public.mover_documentos(uuid[], uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Salvar a planta inteira numa transação: tamanho, entrada, posição das ruas e
-- elementos. security invoker: as políticas e o gatilho app.planta_confere
-- valem para quem chama. Rua ou elemento fora do galpão dá o mesmo erro de
-- permissão (sem oráculo). A conferência de paredes e sobreposição é da
-- Server Action (a mesma função do leiaute), porque depende do número de
-- módulos, que muda depois.
-- ---------------------------------------------------------------------------
create or replace function public.salvar_planta(
  p_galpao uuid, p_largura int, p_profundidade int, p_lado text, p_posicao int,
  p_ruas jsonb, p_elementos jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_item jsonb;
  v_linhas int;
begin
  if jsonb_typeof(coalesce(p_ruas, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_elementos, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_ruas, '[]'::jsonb)) > 500
     or jsonb_array_length(coalesce(p_elementos, '[]'::jsonb)) > 200 then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  update public.galpoes
     set planta_largura = p_largura, planta_profundidade = p_profundidade,
         entrada_lado = p_lado, entrada_posicao = p_posicao
   where id = p_galpao;
  get diagnostics v_linhas = row_count;
  if v_linhas = 0 then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_ruas, '[]'::jsonb)) loop
    update public.ruas
       set planta_x = (v_item ->> 'x')::smallint, planta_y = (v_item ->> 'y')::smallint,
           planta_giro = coalesce((v_item ->> 'giro')::smallint, 0)
     where id = (v_item ->> 'id')::uuid and galpao_id = p_galpao;
    get diagnostics v_linhas = row_count;
    if v_linhas = 0 then
      raise exception 'sem permissão' using errcode = '42501';
    end if;
  end loop;

  -- Elemento que o editor não mandou mais foi removido: desativa (nunca apaga).
  update public.planta_elementos
     set ativo = false
   where galpao_id = p_galpao and ativo
     and id not in (
       select (e ->> 'id')::uuid from jsonb_array_elements(coalesce(p_elementos, '[]'::jsonb)) e
        where e ->> 'id' is not null
     );

  for v_item in select * from jsonb_array_elements(coalesce(p_elementos, '[]'::jsonb)) loop
    if v_item ->> 'id' is null and coalesce((v_item ->> 'ativo')::boolean, true) = false then
      continue;
    elsif v_item ->> 'id' is null then
      insert into public.planta_elementos (prefeitura_id, galpao_id, tipo, rotulo, x, y, largura, profundidade, giro)
      values (app.prefeitura_atual(), p_galpao, v_item ->> 'tipo', nullif(trim(v_item ->> 'rotulo'), ''),
              (v_item ->> 'x')::smallint, (v_item ->> 'y')::smallint, (v_item ->> 'largura')::smallint,
              (v_item ->> 'profundidade')::smallint, coalesce((v_item ->> 'giro')::smallint, 0));
    else
      update public.planta_elementos
         set rotulo = nullif(trim(v_item ->> 'rotulo'), ''), x = (v_item ->> 'x')::smallint,
             y = (v_item ->> 'y')::smallint, largura = (v_item ->> 'largura')::smallint,
             profundidade = (v_item ->> 'profundidade')::smallint, giro = coalesce((v_item ->> 'giro')::smallint, 0),
             ativo = coalesce((v_item ->> 'ativo')::boolean, true)
       where id = (v_item ->> 'id')::uuid and galpao_id = p_galpao;
      get diagnostics v_linhas = row_count;
      if v_linhas = 0 then
        raise exception 'sem permissão' using errcode = '42501';
      end if;
    end if;
  end loop;
end
$$;
revoke execute on function public.salvar_planta(uuid, int, int, text, int, jsonb, jsonb) from public, anon;
grant execute on function public.salvar_planta(uuid, int, int, text, int, jsonb, jsonb) to authenticated;
