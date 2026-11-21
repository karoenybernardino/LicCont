# Prompt para o Claude Code — atualizar telas e planos (Fases 8, 9, 10 e site inicial)

Cole o texto abaixo no Claude Code, na raiz do repositório, depois de extrair este zip.

---

Atualize o repositório com os quadros novos do canvas e registre os planos das próximas fases. Nada de código de funcionalidade nesta tarefa. Siga o CLAUDE.md (fluxo de cada tarefa, uma branch, nada direto no main, sem custo, sem pedir segredo no chat).

1. Branch `docs-telas-fases-8-9-10-site`.
2. (Inclui os quadros novos de etiquetas e empresas parceiras: EtiquetasEscuro/Claro substituem os antigos; EtqPapelCaixa, EtqPapelDocumento, EtqPapelConteudo, EquipeParceirasEscuro/Claro; plano em `docs/fases/etiquetas.md`; painel da empresa parceira: quadros PartPainelDono, PartPainelFunc, PartPesquisa, PartMapa, PartEtiquetas, PartEquipe e EquipeParceiraDetalhe, plano em `docs/fases/empresa-parceira.md`; os dois planos entram no índice de fases.) Os arquivos de `docs/telas/html/` e `docs/telas/png/` já estão extraídos. Junte os itens de `docs/telas/telas-novas.json` ao fim de `docs/telas/telas.json` (sem duplicar quadro que já exista; se existir, atualize o item) e apague `telas-novas.json`.
3. Planos: `docs/fases/fase-9.md` (importação, TCE-CE, painel e relatórios, numa fase só) já está no zip. Confira se o `docs/fases/fase-8.md` do PR 54 ainda diz que faltam quadros de aceite, /privacidade, /termos, painel de uso e relatórios; se disser, troque por "quadros no canvas e em docs/telas/" apontando para os quadros AceiteEscuro/Claro, PrivacidadeEscuro/Claro, TermosEscuro/Claro, EquipeUsoEscuro/Claro, RelatorioExportarEscuro/Claro e RelatorioPdfEscuro/Claro.
4. Crie `docs/fases/site-inicial.md` curto: rota `/` para visitante sem login (quem já está logado continua indo ao sistema), quadros SiteInicialEscuro e SiteInicialClaro, formulário "Pedir demonstração" validado com Zod no servidor, sem serviço de e-mail por enquanto (em demonstração devolve `AVISO_DEMO`), contatos em variáveis `NEXT_PUBLIC_*` com "a definir", links para /privacidade e /termos, sem preço, sem números inventados, frase "Dados guardados no Brasil" só se for verdade e a validar com o advogado.
5. Atualize o índice de fases em `docs/plano-de-desenvolvimento.md` (e `docs/fases/fase-0.md` se ele listar fases) com: Fase 9 (importação, TCE-CE, painel e relatórios, antes do piloto), Site inicial, e Fase 8 por último (conferência geral).
6. Rode `npm run telas:comparar` apenas para confirmar que o script lê o `telas.json` novo (sem exigir telas implementadas ainda). Corrija o script só se ele quebrar com os quadros novos.
7. Abra um PR com o modelo do repositório: o que mudou, como testar, chaves que faltam (nenhuma), e as decisões em aberto de cada fase (Fase 9: espaço dos PDFs no plano gratuito, regra de duplicadas, mensalidade ou módulo, anos anteriores no TCE, PDFs do PNCP e relatórios mais pedidos; site: número de WhatsApp, e-mail e domínio).

Não implemente as telas agora. Quando eu pedir cada fase, siga o plano dela, uma tarefa por branch, e rode `npm run telas:comparar -- <QuadroEscuro> <QuadroClaro>` antes de cada PR de tela.
