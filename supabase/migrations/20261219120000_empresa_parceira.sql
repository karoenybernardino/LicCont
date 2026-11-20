-- Empresa parceira com dono e funcionários (passo 8).
-- O dono vê todas as prefeituras vinculadas à empresa (prefeituras.parceira_id); o funcionário só as
-- alocadas a ele. A regra vive em app.prefeituras_permitidas(), usada pelo RLS de caixas/prefeituras
-- e por todas as funções parceira_* (security definer). Documentos e PDF NÃO têm política direta:
-- a empresa só lê documentos pela função parceira_pesquisar.
-- Convenção do projeto: tabela nova nasce com RLS e GRANT explícito (nunca anon).

-- ---------------------------------------------------------------------------
-- Quem registrou a caixa (produção por funcionário)
-- ---------------------------------------------------------------------------
alter table public.caixas
  add column criado_por uuid default auth.uid() references auth.users (id) on delete set null;
create index caixas_criado_por_idx on public.caixas (prefeitura_id, criado_por, criado_em);

-- ---------------------------------------------------------------------------
-- Pessoas da empresa e alocação pessoa-prefeitura
-- ---------------------------------------------------------------------------
-- O e-mail fica só em auth.users (como em usuarios).
create table public.parceira_pessoas (
  id uuid primary key default gen_random_uuid(),
  parceira_id uuid not null references public.parceiras (id),
  usuario_id uuid not null unique references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) between 2 and 200),
  papel text not null check (papel in ('dono', 'funcionario')),
  ativa boolean not null default true,
  troca_senha_obrigatoria boolean not null default true,
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  unique (id, parceira_id)
);
create unique index parceira_um_dono on public.parceira_pessoas (parceira_id) where papel = 'dono';
alter table public.parceira_pessoas enable row level security;
-- Sem GRANT e sem política: tudo pelas funções parceira_* e equipe_parceira_*.

create table public.parceira_alocacoes (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references public.parceira_pessoas (id) on delete cascade,
  prefeitura_id uuid not null references public.prefeituras (id),
  alocado_por uuid not null references auth.users (id),
  alocado_em timestamptz not null default now(),
  unique (pessoa_id, prefeitura_id)
);
create index parceira_alocacoes_prefeitura_idx on public.parceira_alocacoes (prefeitura_id);
alter table public.parceira_alocacoes enable row level security;
-- Sem GRANT e sem política (idem).

-- Só aloca em prefeitura vinculada à empresa da pessoa.
create or replace function app.parceira_alocacao_confere()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.parceira_pessoas pe
    join public.prefeituras pr on pr.parceira_id = pe.parceira_id
    where pe.id = new.pessoa_id and pr.id = new.prefeitura_id
  ) then
    raise exception 'prefeitura de outra empresa' using errcode = '23514';
  end if;
  return new;
end $$;
revoke execute on function app.parceira_alocacao_confere() from public, anon, authenticated;
create trigger a_parceira_alocacao_confere before insert or update on public.parceira_alocacoes
  for each row execute function app.parceira_alocacao_confere();
create trigger auditar_parceira_alocacoes after insert or update or delete on public.parceira_alocacoes
  for each row execute function app.auditar_alteracao();

-- ---------------------------------------------------------------------------
-- Funções de vínculo (esquema app)
-- ---------------------------------------------------------------------------
create or replace function app.minha_pessoa()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.parceira_pessoas p
  join public.parceiras pa on pa.id = p.parceira_id
  where p.usuario_id = auth.uid()
    and p.ativa and pa.ativa
    and not p.troca_senha_obrigatoria
    and app.sessao_valida()
$$;

create or replace function app.minha_parceira()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.parceira_id from public.parceira_pessoas p where p.id = app.minha_pessoa()
$$;

create or replace function app.sou_dono_parceira()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.papel = 'dono' from public.parceira_pessoas p where p.id = app.minha_pessoa()), false)
$$;

-- Prefeituras que a pessoa da empresa pode ver: dono = todas as da empresa; funcionário = as alocadas
-- (e ainda vinculadas à empresa). Quem não é pessoa de empresa não recebe nenhuma.
create or replace function app.prefeituras_permitidas()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select pr.id
  from public.prefeituras pr
  where pr.parceira_id = app.minha_parceira()
    and (
      app.sou_dono_parceira()
      or exists (
        select 1 from public.parceira_alocacoes a
        where a.pessoa_id = app.minha_pessoa() and a.prefeitura_id = pr.id
      )
    )
$$;

revoke execute on function app.minha_pessoa(), app.minha_parceira(), app.sou_dono_parceira(), app.prefeituras_permitidas() from public, anon;
grant execute on function app.minha_pessoa(), app.minha_parceira(), app.sou_dono_parceira(), app.prefeituras_permitidas() to authenticated;

-- Leitura direta (RLS): a empresa lê a própria prefeitura permitida e suas caixas. Soma-se às políticas existentes.
create policy prefeituras_le_parceira on public.prefeituras for select to authenticated
  using (id in (select app.prefeituras_permitidas()));
create policy caixas_le_parceira on public.caixas for select to authenticated
  using (prefeitura_id in (select app.prefeituras_permitidas()));

-- ---------------------------------------------------------------------------
-- Leitura (todas conferem app.prefeituras_permitidas)
-- ---------------------------------------------------------------------------
-- Quem sou eu: funciona mesmo antes de trocar a senha provisória.
create or replace function public.parceira_eu()
returns table (pessoa_id uuid, nome text, papel text, parceira_id uuid, parceira_nome text, troca_senha boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nome, p.papel, p.parceira_id, pa.nome, p.troca_senha_obrigatoria
  from public.parceira_pessoas p
  join public.parceiras pa on pa.id = p.parceira_id
  where p.usuario_id = auth.uid() and p.ativa and pa.ativa and app.sessao_valida()
$$;
revoke execute on function public.parceira_eu() from public, anon;
grant execute on function public.parceira_eu() to authenticated;

-- Panorama por prefeitura: caixas (por órgão), documentos, caixas a etiquetar, pessoas, ocupação e última atividade.
create or replace function public.parceira_prefeituras()
returns table (
  id uuid, nome text, tipo text, caixas bigint, caixas_prefeitura bigint, caixas_camara bigint, documentos bigint,
  a_etiquetar bigint, funcionarios bigint, modulos bigint, caixas_por_modulo smallint, ultima_atividade timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select pr.id, pr.nome, pr.tipo,
         (select count(*) from public.caixas c where c.prefeitura_id = pr.id and c.ativo),
         (select count(*) from public.caixas c where c.prefeitura_id = pr.id and c.ativo and c.orgao = 'prefeitura'),
         (select count(*) from public.caixas c where c.prefeitura_id = pr.id and c.ativo and c.orgao = 'camara'),
         (select count(*) from public.documentos d where d.prefeitura_id = pr.id and d.ativo),
         (select count(*) from public.caixas c where c.prefeitura_id = pr.id and c.ativo
            and not exists (select 1 from public.etiqueta_impressoes i where i.caixa_id = c.id)),
         (select count(*) from public.parceira_alocacoes a join public.parceira_pessoas pe on pe.id = a.pessoa_id
            where a.prefeitura_id = pr.id and pe.ativa and pe.papel = 'funcionario'),
         (select count(*) from public.modulos m where m.prefeitura_id = pr.id and m.ativo),
         pr.caixas_por_modulo,
         greatest(
           (select max(c.criado_em) from public.caixas c where c.prefeitura_id = pr.id),
           (select max(d.criado_em) from public.documentos d where d.prefeitura_id = pr.id),
           (select max(i.impresso_em) from public.etiqueta_impressoes i where i.prefeitura_id = pr.id))
  from public.prefeituras pr
  where pr.id in (select app.prefeituras_permitidas())
  order by pr.nome
$$;
revoke execute on function public.parceira_prefeituras() from public, anon;
grant execute on function public.parceira_prefeituras() to authenticated;

-- Atividade por dia, quem fez e órgão: caixas e documentos criados e etiquetas impressas desde p_desde.
-- p_prefeitura nulo = todas as permitidas; uma prefeitura fora da permissão devolve nada.
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
  select l.dia, l.u, pe.nome, l.orgao, sum(l.cx)::bigint, sum(l.dc)::bigint, sum(l.et)::bigint
  from linhas l
  left join public.parceira_pessoas pe on pe.usuario_id = l.u and pe.parceira_id = app.minha_parceira()
  group by l.dia, l.u, pe.nome, l.orgao
  order by l.dia
$$;
revoke execute on function public.parceira_atividade(uuid, date) from public, anon;
grant execute on function public.parceira_atividade(uuid, date) to authenticated;

-- Capacidade (mesma forma de capacidade_arquivo) de uma prefeitura permitida.
create or replace function public.parceira_capacidade(p_prefeitura uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with alvo as (select p_prefeitura as id where p_prefeitura in (select app.prefeituras_permitidas())),
  m as (
    select r.codigo as rua, mo.numero as modulo, mo.id
    from public.modulos mo
    join public.ruas r on r.id = mo.rua_id
    join public.galpoes g on g.id = r.galpao_id
    where mo.prefeitura_id in (select id from alvo) and mo.ativo and r.ativo and g.ativo
  ),
  x as (
    select m.rua, m.modulo, n.numero as nivel, count(c.id) as ocup
    from m
    join public.niveis n on n.modulo_id = m.id and n.ativo
    left join public.caixas c on c.nivel_id = n.id and c.ativo
    group by m.rua, m.modulo, n.numero
  )
  select jsonb_build_object(
    'caixas_por_modulo', (select p.caixas_por_modulo from public.prefeituras p where p.id in (select id from alvo)),
    'por_modulo', coalesce((
      select jsonb_agg(jsonb_build_object('rua', q.rua, 'modulo', q.modulo, 'ocupadas', q.o) order by q.rua, q.modulo)
      from (select m.rua, m.modulo, coalesce(sum(x.ocup), 0)::int as o
            from m left join x on x.rua = m.rua and x.modulo = m.modulo
            group by m.rua, m.modulo) q), '[]'::jsonb),
    'por_nivel', coalesce((
      select jsonb_agg(jsonb_build_object('nivel', q.nivel, 'ocupadas', q.o) order by q.nivel)
      from (select x.nivel, sum(x.ocup)::int as o from x group by x.nivel) q), '[]'::jsonb))
$$;
revoke execute on function public.parceira_capacidade(uuid) from public, anon;
grant execute on function public.parceira_capacidade(uuid) to authenticated;

-- Pesquisa de documentos (sem empréstimo, sem PDF): só prefeitura permitida.
create or replace function public.parceira_pesquisar(p_prefeitura uuid, p_q text)
returns table (id uuid, tipo text, numero text, ano smallint, objeto text, orgao text, caixa_orgao text, caixa_sequencial integer)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.tipo, d.numero, d.ano, d.objeto, d.orgao, c.orgao, c.sequencial
  from public.documentos d
  left join public.caixas c on c.id = d.caixa_id
  where d.prefeitura_id = p_prefeitura
    and p_prefeitura in (select app.prefeituras_permitidas())
    and d.ativo
    and (coalesce(trim(p_q), '') = '' or d.texto_busca like '%' || app.sem_acento(trim(p_q)) || '%')
  order by d.ano desc, d.numero
  limit 50
$$;
revoke execute on function public.parceira_pesquisar(uuid, text) from public, anon;
grant execute on function public.parceira_pesquisar(uuid, text) to authenticated;

-- Caixas sem etiqueta impressa, mais antigas primeiro.
create or replace function public.parceira_a_etiquetar(p_prefeitura uuid)
returns table (id uuid, orgao text, sequencial integer, tipo text, prefeitura_nome text, criado_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.orgao, c.sequencial, c.tipo, pr.nome, c.criado_em
  from public.caixas c
  join public.prefeituras pr on pr.id = c.prefeitura_id
  where c.prefeitura_id = p_prefeitura
    and p_prefeitura in (select app.prefeituras_permitidas())
    and c.ativo
    and not exists (select 1 from public.etiqueta_impressoes i where i.caixa_id = c.id)
  order by c.criado_em
  limit 100
$$;
revoke execute on function public.parceira_a_etiquetar(uuid) from public, anon;
grant execute on function public.parceira_a_etiquetar(uuid) to authenticated;

-- Pessoas da empresa com as prefeituras alocadas. Dono: todas da empresa dele. Funcionário: só ele.
-- Equipe LicCONT: informa p_parceira. Ninguém mais lê.
create or replace function public.parceira_equipe(p_parceira uuid default null)
returns table (
  pessoa_id uuid, usuario_id uuid, nome text, papel text, ativa boolean, troca_senha boolean,
  prefeituras jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select pe.id, pe.usuario_id, pe.nome, pe.papel, pe.ativa, pe.troca_senha_obrigatoria,
         coalesce((
           select jsonb_agg(jsonb_build_object('id', pr.id, 'nome', pr.nome, 'alocado_por', coalesce(q.nome, 'Equipe LicCONT'))
                            order by pr.nome)
           from public.parceira_alocacoes a
           join public.prefeituras pr on pr.id = a.prefeitura_id
           left join public.parceira_pessoas q on q.usuario_id = a.alocado_por
           where a.pessoa_id = pe.id), '[]'::jsonb)
  from public.parceira_pessoas pe
  where (
          (app.eh_equipe() and pe.parceira_id = p_parceira)
          or (app.sou_dono_parceira() and pe.parceira_id = app.minha_parceira())
          or pe.id = app.minha_pessoa()
        )
  order by (pe.papel = 'dono') desc, pe.nome
$$;
revoke execute on function public.parceira_equipe(uuid) from public, anon;
grant execute on function public.parceira_equipe(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Escrita: dono (na própria empresa) ou equipe LicCONT
-- ---------------------------------------------------------------------------
-- A conta no Auth é criada pelo servidor antes; aqui só o vínculo. O dono só inclui funcionário.
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
  insert into public.parceira_pessoas (parceira_id, usuario_id, nome, papel)
  values (p_parceira, p_usuario, trim(p_nome), p_papel)
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.parceira_incluir_pessoa(uuid, uuid, text, text) from public, anon;
grant execute on function public.parceira_incluir_pessoa(uuid, uuid, text, text) to authenticated;

-- Troca toda a alocação de um funcionário. O dono só mexe em gente da empresa dele; a equipe, em qualquer uma.
-- O dono não tem alocação: vê todas as da empresa pelo papel.
create or replace function public.parceira_alocar(p_pessoa uuid, p_prefeituras uuid[])
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_parceira uuid;
  v_papel text;
begin
  select parceira_id, papel into v_parceira, v_papel from public.parceira_pessoas where id = p_pessoa;
  if v_parceira is null or v_papel <> 'funcionario' then return false; end if;
  if not (app.eh_equipe() or (app.sou_dono_parceira() and app.minha_parceira() = v_parceira)) then
    return false;
  end if;
  delete from public.parceira_alocacoes
    where pessoa_id = p_pessoa and not (prefeitura_id = any(coalesce(p_prefeituras, '{}')));
  insert into public.parceira_alocacoes (pessoa_id, prefeitura_id, alocado_por)
  select p_pessoa, x, auth.uid() from unnest(coalesce(p_prefeituras, '{}')) x
  on conflict (pessoa_id, prefeitura_id) do nothing;
  return true;
end $$;
revoke execute on function public.parceira_alocar(uuid, uuid[]) from public, anon;
grant execute on function public.parceira_alocar(uuid, uuid[]) to authenticated;

-- Bloqueia ou libera a pessoa (o dono não bloqueia a si mesmo nem outro dono).
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
begin
  select parceira_id, papel into v_parceira, v_papel from public.parceira_pessoas where id = p_pessoa;
  if v_parceira is null then return false; end if;
  if not (app.eh_equipe() or (app.sou_dono_parceira() and app.minha_parceira() = v_parceira and v_papel = 'funcionario')) then
    return false;
  end if;
  update public.parceira_pessoas set ativa = p_ativa where id = p_pessoa;
  return true;
end $$;
revoke execute on function public.parceira_ativar(uuid, boolean) from public, anon;
grant execute on function public.parceira_ativar(uuid, boolean) to authenticated;

-- service_role (só no servidor): confere o vínculo no login e dispensa a troca da senha provisória.
-- authenticated e anon não recebem nada nas tabelas.
grant select on public.parceira_pessoas to service_role;
grant update (troca_senha_obrigatoria) on public.parceira_pessoas to service_role;
