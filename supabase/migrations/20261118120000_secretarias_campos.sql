-- Fase 5 · Secretarias: sigla, contato, responsável e regras do acervo.
-- Só adiciona colunas opcionais (ou com padrão): compatível com o app anterior.
-- Responsável e rua preferencial usam chave composta com prefeitura_id: não
-- apontam para usuário nem rua de outra prefeitura. As políticas de
-- secretarias não mudam (ler: toda a prefeitura; escrever: administrador).

alter table public.secretarias
  add column sigla text check (sigla ~ '^[A-Z0-9-]{2,12}$'),
  add column telefone text check (length(telefone) <= 30),
  add column email_contato text check (length(email_contato) <= 200 and email_contato ~ '^[^@\s]+@[^@\s]+$'),
  add column responsavel_id uuid,
  add column cargo_responsavel text check (length(trim(cargo_responsavel)) between 1 and 120),
  add column recebe_licitacoes boolean not null default true,
  add column recebe_contratos boolean not null default true,
  add column exige_aprovacao_emprestimo boolean not null default false,
  add column avisar_atrasos boolean not null default true,
  add column prazo_emprestimo_dias smallint not null default 15 check (prazo_emprestimo_dias between 1 and 365),
  add column rua_preferencial_id uuid,
  add constraint secretarias_responsavel_fk
    foreign key (responsavel_id, prefeitura_id) references public.usuarios (id, prefeitura_id),
  add constraint secretarias_rua_preferencial_fk
    foreign key (rua_preferencial_id, prefeitura_id) references public.ruas (id, prefeitura_id);

create unique index secretarias_sigla_uq on public.secretarias (prefeitura_id, sigla);

grant insert (sigla, telefone, email_contato, responsavel_id, cargo_responsavel, recebe_licitacoes,
  recebe_contratos, exige_aprovacao_emprestimo, avisar_atrasos, prazo_emprestimo_dias, rua_preferencial_id)
  on public.secretarias to authenticated;
grant update (sigla, telefone, email_contato, responsavel_id, cargo_responsavel, recebe_licitacoes,
  recebe_contratos, exige_aprovacao_emprestimo, avisar_atrasos, prazo_emprestimo_dias, rua_preferencial_id)
  on public.secretarias to authenticated;
