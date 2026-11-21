-- Permissões: só a equipe LicCONT cadastra e edita secretarias e usuários.
-- O administrador da prefeitura continua LENDO (secretarias_le, usuarios_le,
-- vinculos_le não mudam), mas perde a escrita. A equipe não tem
-- prefeitura_atual, então grava por funções security definer (public.equipe_*),
-- que exigem app.eh_equipe() (segundo fator + sessão válida) e a prefeitura
-- pelo parâmetro. Nenhuma função devolve e-mail; a auditoria não leva nome.

drop policy secretarias_inclui on public.secretarias;
drop policy secretarias_altera on public.secretarias;
drop policy usuarios_inclui on public.usuarios;
drop policy usuarios_altera on public.usuarios;
drop policy vinculos_inclui on public.vinculos;
drop policy vinculos_altera on public.vinculos;
drop policy vinculos_remove on public.vinculos;

-- Revogar no nível da tabela também retira os GRANTs de coluna. Só o servidor
-- (service_role) e as funções abaixo escrevem. Nada além destas gravações usa
-- a Data API (conferido: login e troca de senha passam pelo service_role).
revoke insert, update on public.secretarias, public.usuarios, public.vinculos from authenticated;
revoke delete on public.vinculos from authenticated;

-- Perfil e vínculos de uma pessoa. Grava primeiro os novos e só depois apaga
-- os que saíram. As chaves compostas recusam secretaria de outra prefeitura.
create or replace function app.gravar_vinculos(p_prefeitura uuid, p_usuario uuid, p_perfil text, p_secretarias uuid[])
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_manter uuid[] := '{}';
begin
  if p_perfil <> 'administrador' then
    select coalesce(array_agg(distinct s), '{}') into v_manter from unnest(p_secretarias) s;
    insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel)
    select p_prefeitura, p_usuario, s, p_perfil::public.papel_vinculo from unnest(v_manter) s
    on conflict (usuario_id, secretaria_id) do update set papel = excluded.papel;
  end if;
  delete from public.vinculos
   where usuario_id = p_usuario and prefeitura_id = p_prefeitura
     and not (secretaria_id = any (v_manter));
end $$;
revoke execute on function app.gravar_vinculos(uuid, uuid, text, uuid[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Leitura pela equipe (uma prefeitura por vez)
-- ---------------------------------------------------------------------------
create or replace function public.equipe_listar_secretarias(p_prefeitura uuid)
returns table (
  id uuid, nome text, ativa boolean, sigla text, telefone text, email_contato text,
  responsavel_id uuid, cargo_responsavel text, recebe_licitacoes boolean, recebe_contratos boolean,
  exige_aprovacao_emprestimo boolean, avisar_atrasos boolean, prazo_emprestimo_dias smallint,
  rua_preferencial_id uuid, documentos bigint
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not app.eh_equipe() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return query
    select s.id, s.nome, s.ativa, s.sigla, s.telefone, s.email_contato, s.responsavel_id, s.cargo_responsavel,
           s.recebe_licitacoes, s.recebe_contratos, s.exige_aprovacao_emprestimo, s.avisar_atrasos,
           s.prazo_emprestimo_dias, s.rua_preferencial_id,
           (select count(*) from public.documentos d where d.secretaria_id = s.id and d.ativo)
      from public.secretarias s
     where s.prefeitura_id = p_prefeitura
     order by s.nome;
end $$;
revoke execute on function public.equipe_listar_secretarias(uuid) from public, anon;
grant execute on function public.equipe_listar_secretarias(uuid) to authenticated;

create or replace function public.equipe_listar_ruas(p_prefeitura uuid)
returns table (id uuid, codigo text, galpao text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not app.eh_equipe() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return query
    select r.id, r.codigo, g.nome
      from public.ruas r join public.galpoes g on g.id = r.galpao_id
     where r.prefeitura_id = p_prefeitura and r.ativo
     order by r.codigo;
end $$;
revoke execute on function public.equipe_listar_ruas(uuid) from public, anon;
grant execute on function public.equipe_listar_ruas(uuid) to authenticated;

-- Sem e-mail: ele fica só no Auth e o servidor o busca depois de exigir a equipe.
create or replace function public.equipe_listar_usuarios(p_prefeitura uuid)
returns table (
  id uuid, nome text, matricula text, perfil text, ativo boolean,
  troca_senha_obrigatoria boolean, secretarias uuid[]
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not app.eh_equipe() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return query
    select u.id, u.nome, u.matricula,
           case when u.administrador then 'administrador'
                else coalesce((select min(v.papel::text) from public.vinculos v where v.usuario_id = u.id), 'consulta') end,
           u.ativo, u.troca_senha_obrigatoria,
           coalesce((select array_agg(v.secretaria_id) from public.vinculos v where v.usuario_id = u.id), '{}')
      from public.usuarios u
     where u.prefeitura_id = p_prefeitura
     order by u.nome;
end $$;
revoke execute on function public.equipe_listar_usuarios(uuid) from public, anon;
grant execute on function public.equipe_listar_usuarios(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Secretarias: p_id nulo cria; com id, altera (só dentro da prefeitura).
-- ---------------------------------------------------------------------------
create or replace function public.equipe_salvar_secretaria(
  p_prefeitura uuid, p_id uuid, p_nome text, p_sigla text, p_ativa boolean, p_telefone text,
  p_email_contato text, p_responsavel_id uuid, p_cargo text, p_recebe_licitacoes boolean,
  p_recebe_contratos boolean, p_exige_aprovacao boolean, p_avisar_atrasos boolean,
  p_prazo smallint, p_rua uuid
)
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not app.eh_equipe() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if p_id is null then
    insert into public.secretarias (prefeitura_id, nome, sigla, ativa, telefone, email_contato, responsavel_id,
      cargo_responsavel, recebe_licitacoes, recebe_contratos, exige_aprovacao_emprestimo, avisar_atrasos,
      prazo_emprestimo_dias, rua_preferencial_id)
    values (p_prefeitura, p_nome, p_sigla, p_ativa, p_telefone, p_email_contato, p_responsavel_id, p_cargo,
      p_recebe_licitacoes, p_recebe_contratos, p_exige_aprovacao, p_avisar_atrasos, p_prazo, p_rua)
    returning id into v_id;
  else
    update public.secretarias set nome = p_nome, sigla = p_sigla, ativa = p_ativa, telefone = p_telefone,
      email_contato = p_email_contato, responsavel_id = p_responsavel_id, cargo_responsavel = p_cargo,
      recebe_licitacoes = p_recebe_licitacoes, recebe_contratos = p_recebe_contratos,
      exige_aprovacao_emprestimo = p_exige_aprovacao, avisar_atrasos = p_avisar_atrasos,
      prazo_emprestimo_dias = p_prazo, rua_preferencial_id = p_rua
     where id = p_id and prefeitura_id = p_prefeitura
    returning id into v_id;
  end if;
  return v_id; -- nulo: a secretaria não é dessa prefeitura
end $$;
revoke execute on function public.equipe_salvar_secretaria(uuid, uuid, text, text, boolean, text, text, uuid, text, boolean, boolean, boolean, boolean, smallint, uuid) from public, anon;
grant execute on function public.equipe_salvar_secretaria(uuid, uuid, text, text, boolean, text, text, uuid, text, boolean, boolean, boolean, boolean, smallint, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Usuários (a conta no Auth é criada antes, pelo servidor)
-- ---------------------------------------------------------------------------
create or replace function public.equipe_incluir_usuario(
  p_prefeitura uuid, p_usuario uuid, p_nome text, p_matricula text, p_perfil text, p_secretarias uuid[]
)
returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform 1 from public.prefeituras where id = p_prefeitura for update;
  if not app.eh_equipe()
     or p_usuario = auth.uid()
     or exists (select 1 from public.equipe_liccont e where e.usuario_id = p_usuario) then
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

create or replace function public.equipe_salvar_usuario(
  p_prefeitura uuid, p_usuario uuid, p_nome text, p_matricula text, p_perfil text, p_secretarias uuid[]
)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform 1 from public.prefeituras where id = p_prefeitura for update;
  if not app.eh_equipe() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if p_perfil not in ('administrador', 'coordenador', 'operador', 'consulta')
     or (p_perfil <> 'administrador' and coalesce(cardinality(p_secretarias), 0) = 0) then
    raise exception 'perfil inválido' using errcode = '23514';
  end if;
  if p_perfil = 'administrador'
     and not exists (select 1 from public.usuarios u where u.id = p_usuario and u.administrador)
     and (select count(*) from public.usuarios u where u.prefeitura_id = p_prefeitura and u.administrador and u.ativo) >= 5 then
    raise exception 'limite de administradores' using errcode = '23514';
  end if;
  update public.usuarios set nome = p_nome, matricula = p_matricula, administrador = (p_perfil = 'administrador')
   where id = p_usuario and prefeitura_id = p_prefeitura;
  if not found then
    return false;
  end if;
  perform app.gravar_vinculos(p_prefeitura, p_usuario, p_perfil, p_secretarias);
  return true;
end $$;
revoke execute on function public.equipe_salvar_usuario(uuid, uuid, text, text, text, uuid[]) from public, anon;
grant execute on function public.equipe_salvar_usuario(uuid, uuid, text, text, text, uuid[]) to authenticated;

-- Bloqueia ou desbloqueia. Ao bloquear, as sessões caem junto.
create or replace function public.equipe_bloquear_usuario(p_prefeitura uuid, p_usuario uuid, p_bloquear boolean)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not app.eh_equipe() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  update public.usuarios set ativo = not p_bloquear where id = p_usuario and prefeitura_id = p_prefeitura;
  if not found then
    return false;
  end if;
  if p_bloquear then
    delete from auth.sessions where user_id = p_usuario;
  end if;
  return true;
end $$;
revoke execute on function public.equipe_bloquear_usuario(uuid, uuid, boolean) from public, anon;
grant execute on function public.equipe_bloquear_usuario(uuid, uuid, boolean) to authenticated;

create or replace function public.equipe_encerrar_sessoes(p_prefeitura uuid, p_usuario uuid)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not app.eh_equipe() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if not exists (select 1 from public.usuarios u where u.id = p_usuario and u.prefeitura_id = p_prefeitura) then
    return false;
  end if;
  delete from auth.sessions where user_id = p_usuario;
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id)
  values (p_prefeitura, auth.uid(), 'usuarios.sessoes_encerradas', 'usuarios', p_usuario::text);
  return true;
end $$;
revoke execute on function public.equipe_encerrar_sessoes(uuid, uuid) from public, anon;
grant execute on function public.equipe_encerrar_sessoes(uuid, uuid) to authenticated;

-- Antes de trocar a senha no Auth: exige troca no próximo acesso e registra.
create or replace function public.equipe_marcar_troca_senha(p_prefeitura uuid, p_usuario uuid)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not app.eh_equipe() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  update public.usuarios set troca_senha_obrigatoria = true where id = p_usuario and prefeitura_id = p_prefeitura;
  if not found then
    return false;
  end if;
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id)
  values (p_prefeitura, auth.uid(), 'usuarios.senha_redefinida', 'usuarios', p_usuario::text);
  return true;
end $$;
revoke execute on function public.equipe_marcar_troca_senha(uuid, uuid) from public, anon;
grant execute on function public.equipe_marcar_troca_senha(uuid, uuid) to authenticated;
