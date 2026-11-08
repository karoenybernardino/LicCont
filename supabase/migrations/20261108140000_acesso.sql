-- Fase 1 · Acesso: prefeituras, secretarias, usuários, vínculos, equipe
-- LicCONT, auditoria e tentativas de login. Plano: docs/fases/fase-1.md.
-- Testes: supabase/tests/acesso_isolamento.test.sql.
--
-- O vínculo do usuário passa a vir das TABELAS (não mais do token):
-- bloquear o usuário ou encerrar as sessões dele corta o acesso na hora.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.status_prefeitura as enum ('implantacao', 'ativa', 'suspensa');
-- Administrador não é papel de vínculo: é a coluna usuarios.administrador,
-- que vale para todas as secretarias da prefeitura.
create type public.papel_vinculo as enum ('coordenador', 'operador', 'consulta');

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
create table public.prefeituras (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) between 3 and 200),
  cnpj text not null unique check (cnpj ~ '^[0-9]{14}$'),
  status public.status_prefeitura not null default 'implantacao',
  criado_em timestamptz not null default now()
);

create table public.secretarias (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras (id),
  nome text not null check (length(trim(nome)) between 2 and 120),
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (prefeitura_id, nome),
  unique (id, prefeitura_id) -- alvo da chave composta de vinculos
);

-- O e-mail fica só em auth.users. Uma pessoa pertence a uma prefeitura.
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  prefeitura_id uuid not null references public.prefeituras (id),
  nome text not null check (length(trim(nome)) between 2 and 200),
  matricula text check (length(matricula) <= 40),
  administrador boolean not null default false,
  ativo boolean not null default true,
  troca_senha_obrigatoria boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (id, prefeitura_id) -- alvo da chave composta de vinculos
);

-- As chaves compostas garantem que usuário e secretaria são da mesma
-- prefeitura do vínculo.
create table public.vinculos (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null,
  usuario_id uuid not null,
  secretaria_id uuid not null,
  papel public.papel_vinculo not null,
  criado_em timestamptz not null default now(),
  unique (usuario_id, secretaria_id),
  foreign key (usuario_id, prefeitura_id)
    references public.usuarios (id, prefeitura_id) on delete cascade,
  foreign key (secretaria_id, prefeitura_id)
    references public.secretarias (id, prefeitura_id)
);
create index vinculos_secretaria_idx on public.vinculos (secretaria_id);

-- Equipe LicCONT: cadastra prefeituras e o primeiro administrador.
-- Não lê acervo. Só entra aqui por SQL do responsável.
create table public.equipe_liccont (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);

-- Só inclusão. Sem chave estrangeira para usuário: apagar a conta não
-- apaga o rastro.
create table public.auditoria (
  id bigint generated always as identity primary key,
  prefeitura_id uuid references public.prefeituras (id),
  usuario_id uuid,
  acao text not null check (acao ~ '^[a-z_]+(\.[a-z_]+)*$'),
  alvo_tabela text check (length(alvo_tabela) <= 63),
  alvo_id text check (length(alvo_id) <= 64),
  antes jsonb check (pg_column_size(antes) <= 8192),
  depois jsonb check (pg_column_size(depois) <= 8192),
  ip inet,
  aparelho text check (length(aparelho) <= 300),
  criado_em timestamptz not null default now()
);
create index auditoria_prefeitura_idx on public.auditoria (prefeitura_id, criado_em desc);

-- Guarda o hash do e-mail, nunca o e-mail.
create table public.tentativas_login (
  id bigint generated always as identity primary key,
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  ip inet,
  sucesso boolean not null,
  criado_em timestamptz not null default now()
);
create index tentativas_email_idx on public.tentativas_login (email_hash, criado_em);
create index tentativas_ip_idx on public.tentativas_login (ip, criado_em);

-- ---------------------------------------------------------------------------
-- Funções de vínculo (esquema app, não exposto pela Data API)
-- ---------------------------------------------------------------------------

-- A sessão do token ainda existe? Encerrar sessões apaga a linha em
-- auth.sessions e o token, mesmo dentro da validade, deixa de valer.
create or replace function app.sessao_valida()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions s
    where s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and s.user_id = auth.uid()
  )
$$;

-- Troca a origem provisória da Fase 0 (app_metadata do token).
create or replace function app.prefeitura_atual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.prefeitura_id
  from public.usuarios u
  where u.id = auth.uid()
    and u.ativo
    and not u.troca_senha_obrigatoria
    and app.sessao_valida()
$$;

-- Administrador só tem poderes com o segundo fator (aal2).
create or replace function app.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (
      select 1 from public.usuarios u
      where u.id = auth.uid()
        and u.administrador
        and u.prefeitura_id = app.prefeitura_atual()
    )
$$;

create or replace function app.eh_equipe()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and app.sessao_valida()
    and exists (select 1 from public.equipe_liccont e where e.usuario_id = auth.uid())
$$;

-- Secretarias cujo acervo o usuário pode ver: as dos vínculos; para o
-- administrador, todas as da prefeitura. Modelo para as tabelas de acervo.
create or replace function app.secretarias_permitidas()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.secretarias s
  where s.prefeitura_id = app.prefeitura_atual()
    and (
      (select app.eh_admin())
      or exists (
        select 1 from public.vinculos v
        where v.secretaria_id = s.id and v.usuario_id = auth.uid()
      )
    )
$$;

revoke execute on function app.sessao_valida(), app.prefeitura_atual(), app.eh_admin(),
  app.eh_equipe(), app.secretarias_permitidas() from public, anon;
grant execute on function app.sessao_valida(), app.prefeitura_atual(), app.eh_admin(),
  app.eh_equipe(), app.secretarias_permitidas() to authenticated;

-- Auditoria imutável: nem o dono da tabela altera ou apaga.
create or replace function app.auditoria_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'auditoria é só inclusão';
end
$$;
revoke execute on function app.auditoria_imutavel() from public;

create trigger auditoria_sem_update_delete
  before update or delete on public.auditoria
  for each row execute function app.auditoria_imutavel();
create trigger auditoria_sem_truncate
  before truncate on public.auditoria
  for each statement execute function app.auditoria_imutavel();

-- Pela Data API ninguém altera o próprio "administrador" nem "ativo": evita
-- se bloquear, se rebaixar ou deixar a prefeitura sem administrador.
create or replace function app.usuarios_protege_proprio()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.id = auth.uid()
     and (new.administrador is distinct from old.administrador
          or new.ativo is distinct from old.ativo) then
    raise exception 'não é permitido alterar o próprio acesso' using errcode = '42501';
  end if;
  return new;
end
$$;
revoke execute on function app.usuarios_protege_proprio() from public;
create trigger usuarios_protege_proprio
  before update on public.usuarios
  for each row execute function app.usuarios_protege_proprio();

-- Auditoria automática das tabelas de acesso: não depende do app e não dá
-- para forjar. Nome e matrícula não entram (dado pessoal).
create or replace function app.auditar_alteracao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) - 'nome' - 'matricula' end;
  v_depois jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) - 'nome' - 'matricula' end;
  v_linha jsonb := coalesce(v_depois, v_antes);
begin
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id, antes, depois)
  values (
    case when tg_table_name = 'prefeituras' then (v_linha ->> 'id')::uuid
         else (v_linha ->> 'prefeitura_id')::uuid end,
    auth.uid(),
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    coalesce(v_linha ->> 'id', v_linha ->> 'usuario_id'),
    v_antes,
    v_depois
  );
  return null;
end
$$;
revoke execute on function app.auditar_alteracao() from public;
create trigger auditar_prefeituras after insert or update on public.prefeituras
  for each row execute function app.auditar_alteracao();
create trigger auditar_secretarias after insert or update on public.secretarias
  for each row execute function app.auditar_alteracao();
create trigger auditar_usuarios after insert or update on public.usuarios
  for each row execute function app.auditar_alteracao();
create trigger auditar_vinculos after insert or update or delete on public.vinculos
  for each row execute function app.auditar_alteracao();

-- ---------------------------------------------------------------------------
-- RLS e GRANTs (nada automático: ver migração da convenção)
-- ---------------------------------------------------------------------------
alter table public.prefeituras enable row level security;
alter table public.secretarias enable row level security;
alter table public.usuarios enable row level security;
alter table public.vinculos enable row level security;
alter table public.equipe_liccont enable row level security;
alter table public.auditoria enable row level security;
alter table public.tentativas_login enable row level security;

-- service_role: usado só no servidor (criar conta no Auth, login).
grant select, insert, update on public.prefeituras, public.secretarias,
  public.usuarios, public.vinculos to service_role;
grant delete on public.vinculos to service_role;

-- prefeituras
grant select on public.prefeituras to authenticated;
grant insert (nome, cnpj, status), update (nome, cnpj, status) on public.prefeituras to authenticated;
create policy prefeituras_le on public.prefeituras for select to authenticated
  using (id = (select app.prefeitura_atual()) or (select app.eh_equipe()));
create policy prefeituras_inclui on public.prefeituras for insert to authenticated
  with check ((select app.eh_equipe()));
create policy prefeituras_altera on public.prefeituras for update to authenticated
  using ((select app.eh_equipe())) with check ((select app.eh_equipe()));

-- secretarias (nome é visível a toda a prefeitura; o acervo é que é filtrado)
grant select on public.secretarias to authenticated;
grant insert (prefeitura_id, nome, ativa), update (nome, ativa) on public.secretarias to authenticated;
create policy secretarias_le on public.secretarias for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()));
create policy secretarias_inclui on public.secretarias for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));
create policy secretarias_altera on public.secretarias for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()))
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));

-- usuarios
-- troca_senha_obrigatoria e id: só o servidor (service_role) altera.
grant select on public.usuarios to authenticated;
grant insert (id, prefeitura_id, nome, matricula, administrador),
  update (nome, matricula, administrador, ativo) on public.usuarios to authenticated;
create policy usuarios_le on public.usuarios for select to authenticated
  using (
    (id = (select auth.uid()) and ativo and (select app.sessao_valida()))
    or (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()))
  );
-- A equipe não inclui por aqui (ver public.cadastrar_primeiro_admin).
-- Ninguém inclui a si mesmo nem alguém da equipe; todo usuário novo nasce
-- com senha provisória.
create policy usuarios_inclui on public.usuarios for insert to authenticated
  with check (
    prefeitura_id = (select app.prefeitura_atual())
    and (select app.eh_admin())
    and id <> (select auth.uid())
    and troca_senha_obrigatoria
    and not exists (select 1 from public.equipe_liccont e where e.usuario_id = id)
  );
create policy usuarios_altera on public.usuarios for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()))
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));

-- vinculos
grant select, delete on public.vinculos to authenticated;
grant insert (prefeitura_id, usuario_id, secretaria_id, papel), update (papel)
  on public.vinculos to authenticated;
create policy vinculos_le on public.vinculos for select to authenticated
  using (
    prefeitura_id = (select app.prefeitura_atual())
    and (usuario_id = (select auth.uid()) or (select app.eh_admin()))
  );
create policy vinculos_inclui on public.vinculos for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));
create policy vinculos_altera on public.vinculos for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()))
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));
create policy vinculos_remove on public.vinculos for delete to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));

-- equipe_liccont: nenhum GRANT. Só as funções app.* (security definer) leem.

-- auditoria: o administrador lê a da própria prefeitura; inclusão só pelas
-- funções abaixo.
grant select on public.auditoria to authenticated;
create policy auditoria_le on public.auditoria for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));

-- tentativas_login: nenhum GRANT. Só as funções do servidor abaixo.

-- ---------------------------------------------------------------------------
-- Funções chamadas pelo app (public = expostas como RPC, cada uma com GRANT)
-- ---------------------------------------------------------------------------

-- Listas da tela de login. Liberadas para anon: nome de órgão cliente e de
-- suas secretarias é informação pública (motivo registrado em
-- docs/fases/fase-1.md). Não devolvem nada de usuário.
create or replace function public.prefeituras_para_login()
returns table (id uuid, nome text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nome from public.prefeituras p
  where p.status = 'ativa'
  order by p.nome
$$;

create or replace function public.secretarias_para_login(p_prefeitura uuid)
returns table (id uuid, nome text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.nome
  from public.secretarias s
  join public.prefeituras p on p.id = s.prefeitura_id
  where s.prefeitura_id = p_prefeitura and s.ativa and p.status = 'ativa'
  order by s.nome
$$;

grant execute on function public.prefeituras_para_login(),
  public.secretarias_para_login(uuid) to anon, authenticated;

-- Registro pelo próprio usuário logado, só de eventos de sessão (lista
-- fechada). Quem e de qual prefeitura vêm do banco. O IP é informado pelo
-- servidor do app; quem chamar a RPC direto pode mentir o próprio IP.
-- Alterações de cadastro são auditadas por gatilho (app.auditar_alteracao).
create or replace function public.registrar_auditoria(
  p_acao text,
  p_alvo_tabela text default null,
  p_alvo_id text default null,
  p_antes jsonb default null,
  p_depois jsonb default null,
  p_ip inet default null,
  p_aparelho text default null
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.auditoria
    (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id, antes, depois, ip, aparelho)
  select u.prefeitura_id, u.id, p_acao, p_alvo_tabela, p_alvo_id, p_antes, p_depois, p_ip,
    left(p_aparelho, 300)
  from public.usuarios u
  where u.id = auth.uid()
    and u.ativo
    and app.sessao_valida()
    and p_acao in ('sessao.entrada', 'sessao.saida', 'sessao.inatividade',
                   'sessao.troca_secretaria', 'mfa.ativado', 'senha.trocada')
$$;
revoke execute on function public.registrar_auditoria(text, text, text, jsonb, jsonb, inet, text)
  from public, anon;
grant execute on function public.registrar_auditoria(text, text, text, jsonb, jsonb, inet, text)
  to authenticated;

-- Registro pelo servidor quando não há sessão (ex.: falha de login).
create or replace function public.registrar_auditoria_sistema(
  p_prefeitura uuid,
  p_usuario uuid,
  p_acao text,
  p_ip inet default null,
  p_aparelho text default null,
  p_depois jsonb default null
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.auditoria (prefeitura_id, usuario_id, acao, depois, ip, aparelho)
  values (p_prefeitura, p_usuario, p_acao, p_depois, p_ip, left(p_aparelho, 300))
$$;
revoke execute on function public.registrar_auditoria_sistema(uuid, uuid, text, inet, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.registrar_auditoria_sistema(uuid, uuid, text, inet, text, jsonb)
  to service_role;

-- Força bruta: 5 falhas em 15 min por conta ou 20 por IP bloqueiam por 15 min.
create or replace function public.registrar_tentativa_login(
  p_email_hash text,
  p_ip inet,
  p_sucesso boolean
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from public.tentativas_login where criado_em < now() - interval '1 day';
  insert into public.tentativas_login (email_hash, ip, sucesso)
  values (p_email_hash, p_ip, p_sucesso);
$$;

create or replace function public.login_bloqueado(p_email_hash text, p_ip inet)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.tentativas_login t
      where t.email_hash = p_email_hash and not t.sucesso
        and t.criado_em > now() - interval '15 minutes') >= 5
    or
    (select count(*) from public.tentativas_login t
      where t.ip is not distinct from p_ip and not t.sucesso
        and t.criado_em > now() - interval '15 minutes') >= 20
$$;

revoke execute on function public.registrar_tentativa_login(text, inet, boolean),
  public.login_bloqueado(text, inet) from public, anon, authenticated;
grant execute on function public.registrar_tentativa_login(text, inet, boolean),
  public.login_bloqueado(text, inet) to service_role;

-- Encerrar sessões de um usuário da própria prefeitura (administrador com
-- segundo fator). O acesso cai na hora por app.sessao_valida().
create or replace function public.encerrar_sessoes(p_usuario uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not app.eh_admin() or not exists (
    select 1 from public.usuarios u
    where u.id = p_usuario and u.prefeitura_id = app.prefeitura_atual()
  ) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  delete from auth.sessions where user_id = p_usuario;
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id)
  values (app.prefeitura_atual(), auth.uid(), 'usuarios.sessoes_encerradas', 'usuarios', p_usuario::text);
end
$$;
revoke execute on function public.encerrar_sessoes(uuid) from public, anon;
grant execute on function public.encerrar_sessoes(uuid) to authenticated;

-- Equipe LicCONT cadastra o primeiro administrador de uma prefeitura sem
-- usuários. A conta no Auth é criada antes pelo servidor. A equipe não pode
-- cadastrar a si mesma nem outro membro da equipe.
create or replace function public.cadastrar_primeiro_admin(
  p_prefeitura uuid,
  p_usuario uuid,
  p_nome text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not app.eh_equipe()
     or p_usuario = auth.uid()
     or exists (select 1 from public.equipe_liccont e where e.usuario_id = p_usuario)
     or exists (select 1 from public.usuarios u where u.prefeitura_id = p_prefeitura) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria)
  values (p_usuario, p_prefeitura, p_nome, true, true);
end
$$;
revoke execute on function public.cadastrar_primeiro_admin(uuid, uuid, text) from public, anon;
grant execute on function public.cadastrar_primeiro_admin(uuid, uuid, text) to authenticated;
