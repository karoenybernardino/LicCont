-- Fase 2 · Estrutura física: galpões, ruas, módulos, níveis e caixas.
-- Plano: docs/fases/fase-2.md. Testes: supabase/tests/estrutura_isolamento.test.sql.
--
-- A estrutura é da prefeitura inteira (uma caixa guarda documentos de várias
-- secretarias): toda a prefeitura lê; só o administrador monta; administrador
-- e coordenador cadastram e desativam caixas. Nada se apaga, só se desativa.
-- Capacidade mora no nível (quantas caixas cabem); a ocupação é calculada
-- (visão estrutura_ocupacao), nunca gravada.
-- Só adiciona objetos: compatível com a versão do app que está no ar.

-- ---------------------------------------------------------------------------
-- Tabelas (chave composta (pai, prefeitura_id): o filho é sempre da mesma
-- prefeitura do pai)
-- ---------------------------------------------------------------------------
create table public.galpoes (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras (id),
  nome text not null check (length(trim(nome)) between 3 and 80),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (prefeitura_id, nome),
  unique (id, prefeitura_id)
);

create table public.ruas (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null,
  galpao_id uuid not null,
  codigo text not null check (codigo ~ '^[A-Z]{1,2}$'),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (galpao_id, codigo),
  unique (id, prefeitura_id),
  foreign key (galpao_id, prefeitura_id) references public.galpoes (id, prefeitura_id)
);

create table public.modulos (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null,
  rua_id uuid not null,
  numero smallint not null check (numero between 1 and 99),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (rua_id, numero),
  unique (id, prefeitura_id),
  foreign key (rua_id, prefeitura_id) references public.ruas (id, prefeitura_id)
);

create table public.niveis (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null,
  modulo_id uuid not null,
  numero smallint not null check (numero between 1 and 20),
  capacidade smallint not null check (capacidade between 1 and 200),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (modulo_id, numero),
  unique (id, prefeitura_id),
  foreign key (modulo_id, prefeitura_id) references public.modulos (id, prefeitura_id)
);

-- O número da caixa é a posição no nível (1 até a capacidade). O único
-- (nivel_id, numero) impede duas caixas na mesma posição, mesmo em
-- inclusões simultâneas.
create table public.caixas (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null,
  nivel_id uuid not null,
  numero smallint not null check (numero between 1 and 200),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (nivel_id, numero),
  unique (id, prefeitura_id),
  foreign key (nivel_id, prefeitura_id) references public.niveis (id, prefeitura_id)
);

create index ruas_galpao_idx on public.ruas (galpao_id);
create index modulos_rua_idx on public.modulos (rua_id);
create index niveis_modulo_idx on public.niveis (modulo_id);

-- ---------------------------------------------------------------------------
-- Papel coordenador (pode cadastrar e desativar caixas)
-- ---------------------------------------------------------------------------
create or replace function app.eh_coordenador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vinculos v
    where v.usuario_id = auth.uid()
      and v.papel = 'coordenador'
      and v.prefeitura_id = app.prefeitura_atual()
  )
$$;
revoke execute on function app.eh_coordenador() from public, anon;
grant execute on function app.eh_coordenador() to authenticated;

-- ---------------------------------------------------------------------------
-- Regras de capacidade (gatilhos). Erros com código próprio, que o app
-- traduz: LC001 sem posição, LC002 capacidade menor que as caixas,
-- LC003 ainda tem caixas ativas, LC004 parte desativada.
-- ---------------------------------------------------------------------------

-- Caixa nova ou reativada: posição dentro da capacidade e toda a cadeia
-- (nível, módulo, rua, galpão) ativa. Trava as linhas da cadeia (FOR SHARE)
-- para não cruzar com redução de capacidade ou desativação ao mesmo tempo.
-- security definer: o coordenador não tem UPDATE nas tabelas da cadeia.
create or replace function app.caixa_confere()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacidade smallint;
  v_ativa boolean;
begin
  if not new.ativo then
    return new;
  end if;
  select n.capacidade, n.ativo and m.ativo and r.ativo and g.ativo
    into v_capacidade, v_ativa
  from public.niveis n
  join public.modulos m on m.id = n.modulo_id
  join public.ruas r on r.id = m.rua_id
  join public.galpoes g on g.id = r.galpao_id
  where n.id = new.nivel_id
  for share;
  if not coalesce(v_ativa, false) then
    raise exception 'parte da estrutura desativada' using errcode = 'LC004';
  end if;
  if new.numero > v_capacidade then
    raise exception 'sem posição livre no nível' using errcode = 'LC001';
  end if;
  return new;
end
$$;
revoke execute on function app.caixa_confere() from public;
create trigger caixas_confere
  before insert or update of ativo, numero on public.caixas
  for each row execute function app.caixa_confere();

-- Nível: capacidade não fica abaixo da maior posição ocupada; não desativa
-- com caixa ativa.
create or replace function app.nivel_confere()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_maior smallint;
begin
  select max(c.numero) into v_maior
  from public.caixas c where c.nivel_id = new.id and c.ativo;
  if v_maior is not null and new.capacidade < v_maior then
    raise exception 'capacidade menor que as caixas guardadas' using errcode = 'LC002';
  end if;
  if old.ativo and not new.ativo and v_maior is not null then
    raise exception 'ainda há caixas ativas' using errcode = 'LC003';
  end if;
  return new;
end
$$;
revoke execute on function app.nivel_confere() from public;
create trigger niveis_confere
  before update of capacidade, ativo on public.niveis
  for each row execute function app.nivel_confere();

-- Módulo, rua e galpão: não desativam com caixa ativa embaixo.
create or replace function app.estrutura_desativa_confere()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tem boolean;
begin
  if not (old.ativo and not new.ativo) then
    return new;
  end if;
  select exists (
    select 1
    from public.caixas c
    join public.niveis n on n.id = c.nivel_id
    join public.modulos m on m.id = n.modulo_id
    join public.ruas r on r.id = m.rua_id
    where c.ativo
      and case tg_table_name
            when 'modulos' then m.id = new.id
            when 'ruas' then r.id = new.id
            else r.galpao_id = new.id
          end
  ) into v_tem;
  if v_tem then
    raise exception 'ainda há caixas ativas' using errcode = 'LC003';
  end if;
  return new;
end
$$;
revoke execute on function app.estrutura_desativa_confere() from public;
create trigger modulos_desativa_confere before update of ativo on public.modulos
  for each row execute function app.estrutura_desativa_confere();
create trigger ruas_desativa_confere before update of ativo on public.ruas
  for each row execute function app.estrutura_desativa_confere();
create trigger galpoes_desativa_confere before update of ativo on public.galpoes
  for each row execute function app.estrutura_desativa_confere();

-- Auditoria automática (mesmo gatilho das tabelas de acesso).
create trigger auditar_galpoes after insert or update on public.galpoes
  for each row execute function app.auditar_alteracao();
create trigger auditar_ruas after insert or update on public.ruas
  for each row execute function app.auditar_alteracao();
create trigger auditar_modulos after insert or update on public.modulos
  for each row execute function app.auditar_alteracao();
create trigger auditar_niveis after insert or update on public.niveis
  for each row execute function app.auditar_alteracao();
create trigger auditar_caixas after insert or update on public.caixas
  for each row execute function app.auditar_alteracao();

-- ---------------------------------------------------------------------------
-- RLS e GRANTs (sem anon, sem service_role, sem DELETE)
-- A hierarquia e a prefeitura não mudam depois de criadas: UPDATE só nas
-- colunas de situação e capacidade.
-- ---------------------------------------------------------------------------
alter table public.galpoes enable row level security;
alter table public.ruas enable row level security;
alter table public.modulos enable row level security;
alter table public.niveis enable row level security;
alter table public.caixas enable row level security;

-- O servidor não usa estas tabelas: tira o privilégio padrão do Supabase.
revoke all on public.galpoes, public.ruas, public.modulos, public.niveis, public.caixas
  from service_role;

grant select on public.galpoes, public.ruas, public.modulos, public.niveis, public.caixas
  to authenticated;
grant insert (prefeitura_id, nome), update (nome, ativo) on public.galpoes to authenticated;
grant insert (prefeitura_id, galpao_id, codigo), update (ativo) on public.ruas to authenticated;
grant insert (prefeitura_id, rua_id, numero), update (ativo) on public.modulos to authenticated;
grant insert (prefeitura_id, modulo_id, numero, capacidade), update (capacidade, ativo)
  on public.niveis to authenticated;
grant insert (prefeitura_id, nivel_id, numero), update (ativo) on public.caixas to authenticated;

-- Leitura: toda a prefeitura. Escrita: administrador (caixas: também coordenador).
create policy galpoes_le on public.galpoes for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()));
create policy galpoes_inclui on public.galpoes for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));
create policy galpoes_altera on public.galpoes for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()))
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));

create policy ruas_le on public.ruas for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()));
create policy ruas_inclui on public.ruas for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));
create policy ruas_altera on public.ruas for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()))
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));

create policy modulos_le on public.modulos for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()));
create policy modulos_inclui on public.modulos for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));
create policy modulos_altera on public.modulos for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()))
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));

create policy niveis_le on public.niveis for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()));
create policy niveis_inclui on public.niveis for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));
create policy niveis_altera on public.niveis for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()))
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));

create policy caixas_le on public.caixas for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()));
create policy caixas_inclui on public.caixas for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual())
              and ((select app.eh_admin()) or (select app.eh_coordenador())));
create policy caixas_altera on public.caixas for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and ((select app.eh_admin()) or (select app.eh_coordenador())))
  with check (prefeitura_id = (select app.prefeitura_atual())
              and ((select app.eh_admin()) or (select app.eh_coordenador())));

-- ---------------------------------------------------------------------------
-- Ocupação calculada: uma linha por nível, com o RLS de quem consulta.
-- ---------------------------------------------------------------------------
create view public.estrutura_ocupacao with (security_invoker = true) as
select
  n.id as nivel_id,
  n.modulo_id,
  m.rua_id,
  r.galpao_id,
  n.prefeitura_id,
  n.capacidade,
  (select count(*) from public.caixas c where c.nivel_id = n.id and c.ativo)::int as caixas
from public.niveis n
join public.modulos m on m.id = n.modulo_id
join public.ruas r on r.id = m.rua_id;
revoke all on public.estrutura_ocupacao from service_role;
grant select on public.estrutura_ocupacao to authenticated;

-- ---------------------------------------------------------------------------
-- Cadastro em lote (security invoker: o RLS de quem chama vale)
-- ---------------------------------------------------------------------------

-- "Adicionar módulos": cria módulos (numerados depois do último) e os níveis
-- de cada um com a capacidade escolhida, numa transação. Devolve o número do
-- primeiro módulo criado.
create or replace function public.adicionar_modulos(
  p_rua uuid, p_modulos int, p_niveis int, p_capacidade int)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_prefeitura uuid;
  v_inicio int;
  v_modulo uuid;
begin
  if p_modulos not between 1 and 20 or p_niveis not between 1 and 10
     or p_capacidade not between 1 and 50 then
    raise exception 'quantidade fora do limite' using errcode = '22023';
  end if;
  -- Trava a rua (só quem pode alterá-la consegue) e serializa a numeração.
  select r.prefeitura_id into v_prefeitura
  from public.ruas r where r.id = p_rua and r.ativo
  for update;
  if v_prefeitura is null then
    raise exception 'rua não encontrada' using errcode = '42501';
  end if;
  select coalesce(max(m.numero), 0) + 1 into v_inicio
  from public.modulos m where m.rua_id = p_rua;
  if v_inicio + p_modulos - 1 > 99 then
    raise exception 'quantidade fora do limite' using errcode = '22023';
  end if;
  for i in 0 .. p_modulos - 1 loop
    insert into public.modulos (prefeitura_id, rua_id, numero)
    values (v_prefeitura, p_rua, v_inicio + i)
    returning id into v_modulo;
    insert into public.niveis (prefeitura_id, modulo_id, numero, capacidade)
    select v_prefeitura, v_modulo, n, p_capacidade from generate_series(1, p_niveis) n;
  end loop;
  return v_inicio;
end
$$;

-- Cadastra caixas num nível: primeiro reativa as desativadas, depois ocupa
-- as posições livres de menor número. Devolve quantas ficaram ativas.
create or replace function public.adicionar_caixas(p_nivel uuid, p_quantidade int)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_prefeitura uuid;
  v_capacidade int;
  v_ativas int;
  v_reativadas int;
begin
  if p_quantidade not between 1 and 50 then
    raise exception 'quantidade fora do limite' using errcode = '22023';
  end if;
  select n.prefeitura_id, n.capacidade into v_prefeitura, v_capacidade
  from public.niveis n where n.id = p_nivel;
  if v_prefeitura is null then
    raise exception 'nível não encontrado' using errcode = '42501';
  end if;
  select count(*) into v_ativas from public.caixas c where c.nivel_id = p_nivel and c.ativo;
  if v_ativas + p_quantidade > v_capacidade then
    raise exception 'sem posição livre no nível' using errcode = 'LC001';
  end if;

  with reativar as (
    select c.id from public.caixas c
    where c.nivel_id = p_nivel and not c.ativo and c.numero <= v_capacidade
    order by c.numero limit p_quantidade
  )
  update public.caixas c set ativo = true from reativar where c.id = reativar.id;
  get diagnostics v_reativadas = row_count;

  insert into public.caixas (prefeitura_id, nivel_id, numero)
  select v_prefeitura, p_nivel, livre.n
  from generate_series(1, v_capacidade) as livre(n)
  where not exists (select 1 from public.caixas c where c.nivel_id = p_nivel and c.numero = livre.n)
  order by livre.n
  limit p_quantidade - v_reativadas;

  return p_quantidade;
end
$$;

revoke execute on function public.adicionar_modulos(uuid, int, int, int),
  public.adicionar_caixas(uuid, int) from public, anon;
grant execute on function public.adicionar_modulos(uuid, int, int, int),
  public.adicionar_caixas(uuid, int) to authenticated;
