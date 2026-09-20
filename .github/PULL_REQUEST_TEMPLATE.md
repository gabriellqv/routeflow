## Objetivo

<!-- Descreva o problema ou a funcionalidade e o porquê desta mudança. -->

## O que foi feito

<!-- Liste as mudanças principais. -->

-

## Como validar

<!-- Passo a passo reproduzível para o revisor. -->

```bash
npm install
npm run docker:up
npm run lint
npm run format:check
npm run typecheck
```

## Issue relacionada

<!-- Use "Closes #123" para fechar automaticamente. -->

Closes #

## Checklist (Definition of Done)

- [ ] `npm run lint` passando
- [ ] `npm run format:check` passando
- [ ] `npm run typecheck` passando
- [ ] Build do(s) workspace(s) afetado(s) OK
- [ ] Testes unitários e e2e (quando aplicável) passando
- [ ] Migrations versionadas (se aplicável)
- [ ] Contratos de `@routeflow/contracts` respeitados
- [ ] Documentação/README atualizados (se aplicável)
- [ ] Sem `console.log`/debris de desenvolvimento

## Observações

<!-- Riscos, trade-offs, breaking changes, follow-ups. -->
