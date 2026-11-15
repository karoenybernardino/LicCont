-- Planta do galpão em METROS (decisão do responsável, Fase 5). Até aqui a
-- planta guardava células de módulo (inteiros) e uma medida opcional de metros
-- por célula. A partir desta migração tamanho do galpão, posição da entrada,
-- posição das ruas e posição e tamanho dos elementos são metros (numeric, duas
-- casas). planta_metros_celula continua: é a largura de um módulo de estante e
-- dá o tamanho das ruas (módulos x metros); vira obrigatório, padrão 1,20 m.
-- Nada se perde: cada valor antigo é multiplicado pelos metros por célula do
-- seu galpão (1,20 m quando estava vazio), e a conta se desfaz dividindo.
-- RLS, políticas e GRANTs por coluna não mudam (o tipo muda, a coluna é a mesma).

-- 1) Metros por célula obrigatório, antes de converter qualquer coisa. Os
-- gatilhos de usuário (auditoria, planta_confere) ficam de fora: é conversão
-- de unidade, não alteração feita por uma pessoa.
alter table public.galpoes disable trigger user;
alter table public.ruas disable trigger user;
alter table public.planta_elementos disable trigger user;

update public.galpoes set planta_metros_celula = 1.20 where planta_metros_celula is null;
alter table public.galpoes
  alter column planta_metros_celula set default 1.20,
  alter column planta_metros_celula set not null;

-- 2) Troca das regras de faixa (células) pelas de metros.
do $$
declare
  r record;
begin
  for r in
    select c.conrelid::regclass as tabela, c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'c' and array_length(c.conkey, 1) = 1
      and ((c.conrelid = 'public.galpoes'::regclass and a.attname in ('planta_largura', 'planta_profundidade', 'entrada_posicao'))
        or (c.conrelid = 'public.ruas'::regclass and a.attname in ('planta_x', 'planta_y'))
        or (c.conrelid = 'public.planta_elementos'::regclass and a.attname in ('x', 'y', 'largura', 'profundidade')))
  loop
    execute format('alter table %s drop constraint %I', r.tabela, r.conname);
  end loop;
end
$$;

alter table public.galpoes
  alter column planta_largura type numeric(7, 2) using planta_largura::numeric,
  alter column planta_profundidade type numeric(7, 2) using planta_profundidade::numeric,
  alter column entrada_posicao type numeric(7, 2) using entrada_posicao::numeric;
alter table public.ruas
  alter column planta_x type numeric(7, 2) using planta_x::numeric,
  alter column planta_y type numeric(7, 2) using planta_y::numeric;
alter table public.planta_elementos
  alter column x type numeric(7, 2) using x::numeric,
  alter column y type numeric(7, 2) using y::numeric,
  alter column largura type numeric(7, 2) using largura::numeric,
  alter column profundidade type numeric(7, 2) using profundidade::numeric,
  alter column largura set default 1.20,
  alter column profundidade set default 1.20;

-- 3) Conversão: células x metros por célula do galpão (nulo continua nulo).
update public.galpoes
   set planta_largura = round(planta_largura * planta_metros_celula, 2),
       planta_profundidade = round(planta_profundidade * planta_metros_celula, 2),
       entrada_posicao = round(entrada_posicao * planta_metros_celula, 2);
update public.ruas r
   set planta_x = round(r.planta_x * g.planta_metros_celula, 2),
       planta_y = round(r.planta_y * g.planta_metros_celula, 2)
  from public.galpoes g
 where g.id = r.galpao_id and r.planta_x is not null;
update public.planta_elementos e
   set x = round(e.x * g.planta_metros_celula, 2),
       y = round(e.y * g.planta_metros_celula, 2),
       largura = round(e.largura * g.planta_metros_celula, 2),
       profundidade = round(e.profundidade * g.planta_metros_celula, 2)
  from public.galpoes g
 where g.id = e.galpao_id;

-- 4) Regras novas, em metros (4 a 200 células de 0,25 a 5 m = 1 a 1.000 m).
alter table public.galpoes
  add constraint galpoes_planta_largura_m check (planta_largura between 1 and 1000),
  add constraint galpoes_planta_profundidade_m check (planta_profundidade between 1 and 1000),
  add constraint galpoes_entrada_posicao_m check (entrada_posicao between 0 and 1000);
alter table public.ruas
  add constraint ruas_planta_x_m check (planta_x between 0 and 1000),
  add constraint ruas_planta_y_m check (planta_y between 0 and 1000);
alter table public.planta_elementos
  add constraint planta_elementos_x_m check (x between 0 and 1000),
  add constraint planta_elementos_y_m check (y between 0 and 1000),
  add constraint planta_elementos_largura_m check (largura between 0.1 and 1000),
  add constraint planta_elementos_profundidade_m check (profundidade between 0.1 and 1000);

alter table public.galpoes enable trigger user;
alter table public.ruas enable trigger user;
alter table public.planta_elementos enable trigger user;

-- 5) salvar_planta com metros. O gatilho app.planta_confere já conhece as
-- mesmas colunas (os nomes não mudaram). A versão em células sai.
drop function public.salvar_planta(uuid, int, int, text, int, jsonb, jsonb, numeric);

create function public.salvar_planta(p_galpao uuid, p_largura numeric, p_profundidade numeric, p_lado text, p_posicao numeric,
  p_ruas jsonb, p_elementos jsonb, p_metros numeric default null)
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
         entrada_lado = p_lado, entrada_posicao = p_posicao,
         planta_metros_celula = coalesce(p_metros, planta_metros_celula)
   where id = p_galpao;
  get diagnostics v_linhas = row_count;
  if v_linhas = 0 then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_ruas, '[]'::jsonb)) loop
    update public.ruas
       set planta_x = (v_item ->> 'x')::numeric, planta_y = (v_item ->> 'y')::numeric,
           planta_giro = coalesce((v_item ->> 'giro')::smallint, 0),
           planta_lados = coalesce((v_item ->> 'lados')::smallint, 2)
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
              (v_item ->> 'x')::numeric, (v_item ->> 'y')::numeric, (v_item ->> 'largura')::numeric,
              (v_item ->> 'profundidade')::numeric, coalesce((v_item ->> 'giro')::smallint, 0));
    else
      update public.planta_elementos
         set rotulo = nullif(trim(v_item ->> 'rotulo'), ''), x = (v_item ->> 'x')::numeric,
             y = (v_item ->> 'y')::numeric, largura = (v_item ->> 'largura')::numeric,
             profundidade = (v_item ->> 'profundidade')::numeric, giro = coalesce((v_item ->> 'giro')::smallint, 0),
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
revoke execute on function public.salvar_planta(uuid, numeric, numeric, text, numeric, jsonb, jsonb, numeric) from public, anon;
grant execute on function public.salvar_planta(uuid, numeric, numeric, text, numeric, jsonb, jsonb, numeric) to authenticated;
