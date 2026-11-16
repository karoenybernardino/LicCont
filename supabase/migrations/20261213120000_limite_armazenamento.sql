-- Limite de armazenamento por prefeitura (docs/fases/limite-armazenamento.md).
-- Uso = soma de arquivos.tamanho dos ativos. Padrão 10 GB; a equipe ajusta por SQL.
-- Bloqueia no início do envio (gatilho, LC007) e de novo na conferência, com o
-- tamanho medido pelo servidor e a prefeitura travada (motivo sem_espaco).
-- Compatível com o app no ar: coluna nova com padrão, motivo novo, a conferência
-- passa a devolver texto (o app atual ignora o retorno) e o uso ganha uma coluna.

alter table public.prefeituras add column limite_armazenamento_mb integer not null default 10240
  check (limite_armazenamento_mb between 1 and 10000000);

alter table public.arquivos drop constraint arquivos_motivo_recusa_check;
alter table public.arquivos add constraint arquivos_motivo_recusa_check check (motivo_recusa in (
  'nao_pdf', 'com_senha', 'corrompido', 'grande_demais', 'incompleto', 'sem_espaco'));

-- Soma rápida do uso (só os ativos, sem ler a tabela).
create index arquivos_uso_idx on public.arquivos (prefeitura_id) include (tamanho, documento_id) where ativo;

-- Cabe? Conta os ativos da prefeitura, menos o do próprio documento (troca de PDF
-- conta só a diferença). Só funções do banco chamam: ninguém consulta o uso direto.
create function app.armazenamento_cabe(p_prefeitura uuid, p_documento uuid, p_tamanho bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select sum(a.tamanho) from public.arquivos a
                   where a.prefeitura_id = p_prefeitura and a.ativo and a.documento_id <> p_documento), 0) + p_tamanho
         <= (select p.limite_armazenamento_mb::bigint * 1024 * 1024 from public.prefeituras p where p.id = p_prefeitura)
$$;
revoke execute on function app.armazenamento_cabe(uuid, uuid, bigint) from public, anon, authenticated;

-- Início do envio. Só confere quem envia para a própria prefeitura: o resto a
-- política recusa com 42501, sem revelar se outra prefeitura está cheia.
create function app.arquivo_espaco()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.prefeitura_id is distinct from app.prefeitura_atual() then
    return new;
  end if;
  if not coalesce(app.armazenamento_cabe(new.prefeitura_id, new.documento_id, new.tamanho), false) then
    raise exception 'sem espaço de armazenamento' using errcode = 'LC007';
  end if;
  return new;
end
$$;
revoke execute on function app.arquivo_espaco() from public, anon, authenticated;
create trigger arquivos_espaco before insert on public.arquivos
  for each row execute function app.arquivo_espaco();

-- Conferência: mesma função, agora devolve o motivo (ou null) e confere o espaço.
drop function public.concluir_conferencia(uuid, uuid, boolean, text, bigint, int, text, text[], boolean);
create or replace function public.concluir_conferencia(
  p_usuario uuid, p_arquivo uuid, p_pronto boolean, p_sha256 text, p_tamanho bigint, p_paginas int,
  p_motivo text, p_avisos text[], p_miniatura boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.arquivos;
  v_limite_mb int;
begin
  select * into a from public.arquivos x
  where x.id = p_arquivo and x.situacao = 'conferindo' and x.enviado_por = p_usuario
  for update;
  if a.id is null then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  -- Trava o documento: dois envios ao mesmo tempo não disputam o "ativo".
  perform 1 from public.documentos d where d.id = a.documento_id for update;
  -- Só o servidor da aplicação chama esta função (service_role): ele leu o PDF inteiro e
  -- calculou o SHA-256, o tamanho e a verificação do formato. A pessoa já passou por
  -- marcar_conferindo, que checa dono e permissão de cadastro.
  -- Trava a prefeitura: dois envios concluídos juntos não passam do limite juntos.
  -- "no key update": não segura os inserts com chave para prefeituras (auditoria etc.).
  select p.limite_pdf_mb into v_limite_mb from public.prefeituras p where p.id = a.prefeitura_id for no key update;
  if p_pronto and p_tamanho > v_limite_mb::bigint * 1024 * 1024 then
    p_pronto := false;
    p_motivo := 'grande_demais';
  end if;
  -- Tamanho medido pelo servidor (o do início do envio é o que o navegador disse).
  if p_pronto and not coalesce(app.armazenamento_cabe(a.prefeitura_id, a.documento_id, p_tamanho), false) then
    p_pronto := false;
    p_motivo := 'sem_espaco';
  end if;
  if p_pronto then
    update public.arquivos set ativo = false where documento_id = a.documento_id and ativo;
    -- PDF novo no lugar de outro: a conferência anterior não vale mais.
    update public.documentos set conferido_em = null, conferido_por = null
    where id = a.documento_id and conferido_em is not null
      and exists (select 1 from public.arquivos z where z.documento_id = a.documento_id and z.situacao = 'pronto');
    update public.arquivos set
      situacao = 'pronto', ativo = true, sha256 = p_sha256, tamanho = p_tamanho,
      paginas = p_paginas, avisos = coalesce(p_avisos, '{}'), conferido_em = now(),
      miniatura_caminho = case when p_miniatura
        then a.prefeitura_id::text || '/' || a.secretaria_id::text || '/' || a.id::text || '.webp' end
    where id = a.id;
  else
    update public.arquivos set
      situacao = 'recusado', motivo_recusa = coalesce(p_motivo, 'corrompido'), conferido_em = now()
    where id = a.id;
  end if;
  -- null = ficou pronto; senão o motivo (o servidor mostra a mensagem certa).
  return case when p_pronto then null else coalesce(p_motivo, 'corrompido') end;
end
$$;
revoke execute on function public.concluir_conferencia(uuid, uuid, boolean, text, bigint, int, text, text[], boolean)
  from public, anon, authenticated;
grant execute on function public.concluir_conferencia(uuid, uuid, boolean, text, bigint, int, text, text[], boolean)
  to service_role;

-- Equipe: o limite vem junto do uso (coluna nova no fim).
drop function public.equipe_uso_prefeituras();
create or replace function public.equipe_uso_prefeituras()
returns table (
  prefeitura_id uuid, secretarias integer, usuarios integer, documentos integer,
  caixas integer, bytes_pdf bigint, ultimo_acesso timestamptz, logins_mes integer,
  limite_bytes bigint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select app.eh_equipe()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return query
  select p.id,
    (select count(*)::int from public.secretarias s where s.prefeitura_id = p.id),
    (select count(*)::int from public.usuarios u where u.prefeitura_id = p.id and u.ativo),
    (select count(*)::int from public.documentos d where d.prefeitura_id = p.id and d.ativo),
    (select count(*)::int from public.caixas c where c.prefeitura_id = p.id),
    (select coalesce(sum(a.tamanho), 0)::bigint from public.arquivos a where a.prefeitura_id = p.id and a.ativo),
    (select max(x.criado_em) from public.auditoria x where x.prefeitura_id = p.id and x.acao = 'sessao.entrada'),
    (select count(*)::int from public.auditoria x
       where x.prefeitura_id = p.id and x.acao = 'sessao.entrada' and x.criado_em >= date_trunc('month', now())),
    p.limite_armazenamento_mb::bigint * 1024 * 1024
  from public.prefeituras p;
end $$;
revoke execute on function public.equipe_uso_prefeituras() from public, anon;
grant execute on function public.equipe_uso_prefeituras() to authenticated;
