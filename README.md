# LicCONT

Arquivo morto de licitações e contratos para prefeituras.

Plano completo: `docs/plano-de-desenvolvimento.md`. Regras: `CLAUDE.md`.

## Rodar na máquina

```bash
npm ci
npm run dev
```

## Checagens

```bash
npm run lint
npm run tipos
npm test
npx playwright install chromium
npm run test:e2e
```

## Ver funcionando sem banco (modo demonstração)

```bash
npm install
LICCONT_DEMO=1 npm run dev
```

Abra http://localhost:3000. Qualquer e-mail e senha entram; os dados são
fictícios e nada é salvo. A faixa amarela no topo troca o perfil
(administrador, coordenador, operador, consulta, equipe). No Claude Code,
a configuração `liccont-demo` de `.claude/launch.json` abre a prévia no
navegador do app. Nunca ligar `LICCONT_DEMO` em Production.

