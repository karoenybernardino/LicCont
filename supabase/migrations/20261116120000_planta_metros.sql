-- Planta do galpão em metros: quanto mede uma célula de módulo no galpão real.
-- Opcional (vazio = 1,20 m, largura usual de um módulo de estante). A migração
-- só adiciona: uma coluna, o gatilho que protege as colunas da planta passa a
-- conhecê-la e salvar_planta ganha um parâmetro com valor padrão.

alter table public.galpoes
  add column planta_metros_celula numeric(4, 2) check (planta_metros_celula between 0.25 and 5);

grant update (planta_metros_celula) on public.galpoes to authenticated;

create or replace function app.planta_confere()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_planta text[] := case tg_table_name
    when 'galpoes' then array['planta_largura', 'planta_profundidade', 'entrada_lado', 'entrada_posicao', 'planta_metros_celula']
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

-- Mesma função, com p_metros no fim (valor padrão: chamadas antigas continuam
-- valendo e limpam a medida). A versão de 7 parâmetros sai.
drop function public.salvar_planta(uuid, int, int, text, int, jsonb, jsonb);

create function public.salvar_planta(p_galpao uuid, p_largura int, p_profundidade int, p_lado text, p_posicao int,
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
revoke execute on function public.salvar_planta(uuid, int, int, text, int, jsonb, jsonb, numeric) from public, anon;
grant execute on function public.salvar_planta(uuid, int, int, text, int, jsonb, jsonb, numeric) to authenticated;
