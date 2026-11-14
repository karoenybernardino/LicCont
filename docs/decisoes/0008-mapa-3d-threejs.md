# 0008 — Mapa 3D com three.js e react-three-fiber

Data: 2026-11-14 · Fase 4

## Decisão

Desenhar o mapa 3D do galpão com `three` (MIT), `@react-three/fiber` (MIT),
`@react-three/drei` (MIT) e `camera-controls` (MIT, usada pelo drei para a
câmera). Versões exatas no `package.json`. Os tipos vêm de `@types/three`.

## Por quê

O responsável pediu um 3D bonito e que funcione, com giro de verdade. O SVG
isométrico do protótipo não gira nem tem luz. A planta baixa e o desenho de
reserva (sem WebGL) continuam em SVG.

## Serviço externo?

Não. As bibliotecas rodam no navegador e não enviam dado a ninguém, então
`docs/lgpd/suboperadores.md` não muda. Regras para não virar serviço externo:

- nada de `<Environment preset>`, `<Text>` com fonte padrão ou textura de CDN
  (baixam arquivo de fora); cores e formas saem do código;
- rótulos são HTML por cima do 3D, não o `<Html>` do drei;
- o 3D carrega só em `/mapa` (import dinâmico, sem renderização no servidor).

## Efeitos

- CSP (`src/proxy.ts`): não muda. O three.js não usa worker nem busca arquivo.
- Sem WebGL o mapa abre na planta baixa com o aviso "O 3D não está disponível
  neste computador".
- Caixas, prateleiras e montantes são uma malha instanciada cada
  (`InstancedMesh`) e o desenho é sob demanda (`frameloop="demand"`).
- Atualização segue a decisão 0004. Qualquer biblioteca 3D além destas para e
  pergunta.
