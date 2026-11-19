# Código Lírico — Lunda Sul

Plataforma cultural e comunidade digital para artistas independentes, começando pela Lunda Sul, Angola. Criada por MC AG EIGI.

## Objetivo

Reunir num único espaço perfis de artistas, candidaturas, publicações multimédia, seguidores, mensagens, eventos, oportunidades culturais, parcerias e administração da comunidade.

## Arquitetura inicial

- **Aplicação:** Next.js + TypeScript, preparada para web responsiva e instalação como PWA.
- **Base de dados:** Neon PostgreSQL.
- **Acesso a dados:** Drizzle ORM, apenas no servidor.
- **Publicação:** Vercel.
- **Qualidade:** GitHub Actions para testes, lint, verificação TypeScript e build.
- **Dependências:** Dependabot para atualizações e alertas.

## Dados existentes

A base Neon associada ao projeto já contém tabelas de artistas, candidaturas, sessões, conteúdos publicados, comunidade, mensagens, eventos, oportunidades, administração e auditoria. A implementação deve reutilizar o esquema e os registos existentes. Não executar resets nem migrações destrutivas.

O ficheiro `src/lib/db/schema.ts` começa por mapear as tabelas centrais utilizadas pela aplicação. A introspecção e o alinhamento integral do esquema devem ser concluídos antes de aplicar migrações.

## Segurança obrigatória

1. A ligação à base de dados nunca é exposta ao browser.
2. A autenticação e a autorização são verificadas no servidor em cada operação protegida.
3. A interface não é uma fronteira de segurança: esconder botões não substitui a verificação de permissões.
4. Operações administrativas devem ser auditáveis.
5. Segredos, palavras-passe e tokens não podem ser guardados no Git.
6. Migrações são revistas e testadas antes de chegar à base de dados de produção.

## Desenvolvimento

Requisitos: Node.js 20.9+ e npm.

```bash
npm install
npm run dev
```

Configurar `DATABASE_URL` apenas no ambiente de servidor para executar operações de base de dados e Drizzle Kit. Nunca colocar valores reais de segredos em ficheiros versionados.

## Verificações

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Estado

A estrutura inicial está em desenvolvimento na branch `codex/platform-foundation`. Ainda não é uma versão de produção nem representa a conclusão das funcionalidades sociais, de autenticação ou de administração.
