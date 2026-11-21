-- Correções da revisão de segurança (empresa parceira, convites, sessões).

-- 1. A empresa parceira lia todas as colunas de prefeituras (mensalidade, contrato, CNPJ, TCE) pela
--    Data API. O app lê só por parceira_prefeituras(), que devolve as colunas necessárias.
--    caixas_le_parceira continua: expõe apenas caixas da prefeitura permitida.
drop policy if exists prefeituras_le_parceira on public.prefeituras;

-- 2. Uma conta é de um só mundo: parceira, equipe LicCONT ou prefeitura.
create or replace function public.parceira_incluir_pessoa(p_parceira uuid, p_usuario uuid, p_nome text, p_papel text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not (
       app.eh_equipe()
       or (app.sou_dono_parceira() and app.minha_parceira() = p_parceira and p_papel = 'funcionario')
     ) then
    return null;
  end if;
  if exists (select 1 from public.usuarios u where u.id = p_usuario)
     or exists (select 1 from public.equipe_liccont e where e.usuario_id = p_usuario) then
    raise exception 'conta já tem outro vínculo' using errcode = '22023';
  end if;
  insert into public.parceira_pessoas (parceira_id, usuario_id, nome, papel)
  values (p_parceira, p_usuario, trim(p_nome), p_papel)
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.parceira_incluir_pessoa(uuid, uuid, text, text) from public, anon;
grant execute on function public.parceira_incluir_pessoa(uuid, uuid, text, text) to authenticated;

create or replace function public.equipe_incluir_usuario(
  p_prefeitura uuid, p_usuario uuid, p_nome text, p_matricula text, p_perfil text, p_secretarias uuid[]
)
returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform 1 from public.prefeituras where id = p_prefeitura for update;
  if not app.eh_equipe()
     or p_usuario = auth.uid()
     or exists (select 1 from public.equipe_liccont e where e.usuario_id = p_usuario)
     or exists (select 1 from public.parceira_pessoas pp where pp.usuario_id = p_usuario) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if p_perfil not in ('administrador', 'coordenador', 'operador', 'consulta')
     or (p_perfil <> 'administrador' and coalesce(cardinality(p_secretarias), 0) = 0) then
    raise exception 'perfil inválido' using errcode = '23514';
  end if;
  if p_perfil = 'administrador'
     and (select count(*) from public.usuarios u where u.prefeitura_id = p_prefeitura and u.administrador and u.ativo) >= 5 then
    raise exception 'limite de administradores' using errcode = '23514';
  end if;
  insert into public.usuarios (id, prefeitura_id, nome, matricula, administrador, troca_senha_obrigatoria)
  values (p_usuario, p_prefeitura, p_nome, p_matricula, p_perfil = 'administrador', true);
  perform app.gravar_vinculos(p_prefeitura, p_usuario, p_perfil, p_secretarias);
end $$;
revoke execute on function public.equipe_incluir_usuario(uuid, uuid, text, text, text, uuid[]) from public, anon;
grant execute on function public.equipe_incluir_usuario(uuid, uuid, text, text, text, uuid[]) to authenticated;

-- 3. Só devolve o id de quem é da empresa; de fora (equipe da prefeitura, equipe LicCONT) vem nulo.
create or replace function public.parceira_atividade(p_prefeitura uuid, p_desde date)
returns table (dia date, usuario_id uuid, pessoa text, orgao text, caixas bigint, documentos bigint, etiquetas bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with alvo as (
    select x as id from app.prefeituras_permitidas() x where p_prefeitura is null or x = p_prefeitura
  ),
  linhas as (
    select (c.criado_em at time zone 'America/Fortaleza')::date as dia, c.criado_por as u, c.orgao, 1 as cx, 0 as dc, 0 as et
      from public.caixas c where c.prefeitura_id in (select id from alvo) and c.criado_em >= p_desde
    union all
    select (d.criado_em at time zone 'America/Fortaleza')::date, d.criado_por, d.orgao, 0, 1, 0
      from public.documentos d where d.prefeitura_id in (select id from alvo) and d.criado_em >= p_desde
    union all
    select (i.impresso_em at time zone 'America/Fortaleza')::date, i.impresso_por, null, 0, 0, 1
      from public.etiqueta_impressoes i where i.prefeitura_id in (select id from alvo) and i.impresso_em >= p_desde
  )
  select l.dia, pe.usuario_id, pe.nome, l.orgao, sum(l.cx)::bigint, sum(l.dc)::bigint, sum(l.et)::bigint
  from linhas l
  left join public.parceira_pessoas pe on pe.usuario_id = l.u and pe.parceira_id = app.minha_parceira()
  group by l.dia, pe.usuario_id, pe.nome, l.orgao
  order by l.dia
$$;
revoke execute on function public.parceira_atividade(uuid, date) from public, anon;
grant execute on function public.parceira_atividade(uuid, date) to authenticated;

-- 4. Ao bloquear, as sessões da pessoa caem junto (como equipe_bloquear_usuario).
create or replace function public.parceira_ativar(p_pessoa uuid, p_ativa boolean)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_parceira uuid;
  v_papel text;
  v_usuario uuid;
begin
  select parceira_id, papel, usuario_id into v_parceira, v_papel, v_usuario from public.parceira_pessoas where id = p_pessoa;
  if v_parceira is null then return false; end if;
  if not (app.eh_equipe() or (app.sou_dono_parceira() and app.minha_parceira() = v_parceira and v_papel = 'funcionario')) then
    return false;
  end if;
  update public.parceira_pessoas set ativa = p_ativa where id = p_pessoa;
  if not p_ativa then
    delete from auth.sessions where user_id = v_usuario;
  end if;
  return true;
end $$;
revoke execute on function public.parceira_ativar(uuid, boolean) from public, anon;
grant execute on function public.parceira_ativar(uuid, boolean) to authenticated;

-- 5. Login da parceira confere parceiras.ativa pelo servidor.
grant select on public.parceiras to service_role;
