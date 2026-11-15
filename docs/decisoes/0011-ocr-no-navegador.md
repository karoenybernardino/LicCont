# 0011 — OCR no navegador com tesseract.js, sem serviço externo

Data: 2026-11-15 · Fase 3 (pendência fechada)

## Decisão

Ler o texto dos PDFs (OCR) no **navegador de quem envia**, com `tesseract.js`
(Apache-2.0) e o idioma português (`@tesseract.js-data/por`, Apache-2.0). O motor
e o idioma são copiados de `node_modules` para `public/ocr/` no `postinstall`
(`scripts/copiar-ocr.mjs`) e servidos pelo próprio site: nenhum CDN, nenhum
serviço de OCR. Versões exatas no `package.json`.

## Por quê

Serviço de OCR é pago ou envia o documento a terceiros (dado pessoal no papel).
Rodando no computador da prefeitura não há custo, suboperador novo nem
transferência. Contrapartida: demora (alguns segundos por página) e depende da
máquina; por isso é opcional e limitado a 40 páginas por PDF.

## Dados

- O PDF e as imagens das páginas não saem do navegador. Só o texto resultante vai
  ao servidor (`public.salvar_texto_pdf`), que confere papel, secretaria e se o
  arquivo está pronto e ativo.
- O texto fica em `arquivo_textos`, com o mesmo isolamento do documento (RLS por
  prefeitura e secretaria; só leitura pela Data API). **Não entra na auditoria
  nem em log**; a auditoria registra só `arquivos.ocr` com o id do arquivo.
- O texto pode conter dado pessoal de terceiros que está no papel; vale a mesma
  base legal da guarda do PDF (`docs/lgpd/registro-operacoes.md`).

## Segurança

`/ocr/*` fica fora do proxy (sem CSP) para o worker e o WebAssembly carregarem; são só
arquivos estáticos públicos do motor, sem dado. O resto do site mantém a CSP.

## Custo

Gratuito. Sem chave.
