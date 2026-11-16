# Teste de carga (Fase 9 · 9.16)

Plano curto. Resultado em `docs/desempenho.md`.

1. `supabase/carga/carga.sql`: 100 mil documentos fictícios em 4 prefeituras
   (8 secretarias, 800 caixas e ~20 mil PDFs por prefeitura) e texto de OCR de
   100 a 300 páginas em 1.000 documentos.
2. `supabase/carga/medir.sql`: EXPLAIN ANALYZE, como administrador e com RLS, de
   busca (documentos e `arquivo_textos`), listagem com cursor, `painel_resumo`,
   `painel_caixas`, contagem por secretaria e exportação.
3. Roda no GitHub Actions (`.github/workflows/carga.yml`), no Supabase local do
   runner: sem Docker na máquina de desenvolvimento e sem tocar produção.
4. Metas: busca < 1 s, listagem < 500 ms, painel < 1 s.
5. Pronto quando os números e o "passou / não passou" estão em `docs/desempenho.md`.
   Correção de consulta que não passar fica para outro PR.
