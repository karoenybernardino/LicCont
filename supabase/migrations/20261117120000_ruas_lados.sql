-- Rua de um lado só: a rua encostada na parede tem estante de um lado (uma
-- fileira de caixas, 1 célula de fundo) em vez de dois (2 células). A migração
-- só adiciona: uma coluna com valor padrão 2 (comportamento de hoje), o gatilho
-- que protege as colunas da planta passa a conhecê-la e salvar_planta lê "lados".

alter table public.ruas
  add column planta_lados smallint not null default 2 check (planta_lados in (1, 2));

grant update (planta_lados) on public.ruas to authenticated;

create or replace function app.planta_confere()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_planta text[] := case tg_table_name
    when 'galpoes' then array['planta_largura', 'planta_profundidade', 'entrada_lado', 'entrada_posicao', 'planta_metros_celula']
    else array['planta_x', 'planta_y', 'planta_giro', 'planta_lados']
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

create or replace function public.salvar_planta(p_galpao uuid, p_largura int, p_profundidade int, p_lado text, p_posicao int,
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
         planta_metros_celula = p_metros
   where id = p_galpao;
  get diagnostics v_linhas = row_count;
  if v_linhas = 0 then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_ruas, '[]'::jsonb)) loop
    update public.ruas
       set planta_x = (v_item ->> 'x')::smallint, planta_y = (v_item ->> 'y')::smallint,
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
revoke execute on function public.salvar_planta(uuid, int, int, text, int, jsonb, jsonb, numeric) from public, anon;
