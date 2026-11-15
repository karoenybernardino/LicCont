-- Editor da planta ao estilo Revit: janela passa a ser um tipo de elemento.
-- Só muda a lista aceita pelo CHECK; RLS, políticas e GRANTs da tabela
-- planta_elementos ficam como estão (teste de isolamento em
-- supabase/tests/mapa_isolamento.test.sql).
alter table public.planta_elementos drop constraint planta_elementos_tipo_check;
alter table public.planta_elementos
  add constraint planta_elementos_tipo_check check (tipo in ('porta', 'janela', 'pilar', 'parede', 'area'));
