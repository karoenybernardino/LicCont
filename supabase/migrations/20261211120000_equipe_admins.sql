-- Fase 9 · extra da 9.18: mais de um administrador por prefeitura.
-- A equipe inclui outro administrador (até 5 ativos) e desativa um existente.
-- Só equipe com 2º fator; nunca a si mesma nem alguém da equipe; a auditoria
-- dos gatilhos de usuarios registra quem fez, sem nome ou e-mail.
create or replace function public.equipe_incluir_admin(p_prefeitura uuid, p_usuario uuid, p_nome text)
returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform 1 from public.prefeituras where id = p_prefeitura for update;
  if not app.eh_equipe()
     or p_usuario = auth.uid()
     or exists (select 1 from public.equipe_liccont e where e.usuario_id = p_usuario) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if (select count(*) from public.usuarios u where u.prefeitura_id = p_prefeitura and u.administrador and u.ativo) >= 5 then
    raise exception 'limite de administradores' using errcode = '23514';
  end if;
  insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria)
  values (p_usuario, p_prefeitura, p_nome, true, true);
end $$;
revoke execute on function public.equipe_incluir_admin(uuid, uuid, text) from public, anon;
grant execute on function public.equipe_incluir_admin(uuid, uuid, text) to authenticated;

create or replace function public.equipe_desativar_admin(p_prefeitura uuid, p_usuario uuid)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not app.eh_equipe() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  update public.usuarios set ativo = false
   where id = p_usuario and prefeitura_id = p_prefeitura and administrador and ativo;
  return found;
end $$;
revoke execute on function public.equipe_desativar_admin(uuid, uuid) from public, anon;
grant execute on function public.equipe_desativar_admin(uuid, uuid) to authenticated;
