-- Credor pessoa física: CPF numa coluna própria, separada do CNPJ.
-- Minimização (LGPD): o CPF não entra na busca (texto_busca não o usa) e sai da
-- auditoria, que copia a linha inteira do documento. Quem lê é quem já enxerga
-- o documento (RLS de sempre); escreve quem já edita o documento.
alter table public.documentos
  add column cpf_credor text check (cpf_credor is null or cpf_credor ~ '^[0-9]{11}$'),
  add constraint documentos_credor_unico check (cpf_credor is null or cnpj is null);

grant insert (cpf_credor) on public.documentos to authenticated;
grant update (cpf_credor) on public.documentos to authenticated;

create or replace function app.auditar_documento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) - 'texto_busca' - 'nome_original' - 'cpf_credor' end;
  v_depois jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) - 'texto_busca' - 'nome_original' - 'cpf_credor' end;
  v_linha jsonb := coalesce(v_depois, v_antes);
begin
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id, antes, depois)
  values ((v_linha ->> 'prefeitura_id')::uuid, auth.uid(), tg_table_name || '.' || lower(tg_op),
          tg_table_name, v_linha ->> 'id', v_antes, v_depois);
  return null;
end
$$;
revoke execute on function app.auditar_documento() from public;
