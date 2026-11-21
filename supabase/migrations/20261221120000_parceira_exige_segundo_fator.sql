-- Empresa parceira (dono e funcionário) também precisa do segundo fator (aal2),
-- como o administrador da prefeitura. Tudo da parceira passa por app.minha_pessoa():
-- sem aal2 (com a chave app.configuracao ligada) ela devolve nulo e o banco nega.
-- public.parceira_eu() continua respondendo em aal1 só para o app saber quem é
-- a pessoa e mandá-la a /segundo-fator; não entrega dado de prefeitura.
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
    and app.segundo_fator_ok()
    and app.sessao_valida()
$$;
