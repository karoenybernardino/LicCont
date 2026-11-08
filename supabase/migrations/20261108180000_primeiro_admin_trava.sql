-- Fase 1 · Usuários (tarefa 6), achado da revisão de segurança: dois envios
-- simultâneos de cadastrar_primeiro_admin passavam juntos pelo "prefeitura
-- sem usuários". A trava na linha da prefeitura põe um depois do outro.
-- Mesma assinatura e regras; compatível com a versão no ar.
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
  perform 1 from public.prefeituras where id = p_prefeitura for update;

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
