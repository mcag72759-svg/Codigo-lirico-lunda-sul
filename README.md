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


## Publicações administrativas

- A área de composição está em `/admin/publicar`.
- A API administrativa é `POST /api/admin/content`; verifica uma sessão ativa em `platform_admin_sessions`, confirma que a conta está ativa e exige a permissão `content.publish` (ou `*`).
- O token de sessão é procurado no cookie `cl_admin_session`; o valor guardado na base de dados deve ser o SHA-256 desse token. O cookie deve ser emitido pelo futuro fluxo de autenticação como `HttpOnly`, `Secure` em produção e `SameSite=Lax` ou mais restritivo.
- Cada publicação é gravada em `published_content` e gera um registo em `platform_audit_log`.
- Os últimos 12 conteúdos são apresentados na página inicial através de `GET /api/content`.
- Tipos suportados: artigo, música, vídeo, comunicado, poesia, evento, oportunidade e galeria. Os links externos só aceitam HTTPS.

**Limite actual:** a interface e a verificação de sessão da publicação estão preparadas, mas o fluxo de início de sessão que emite o cookie `cl_admin_session` ainda tem de ser integrado com o método de autenticação e os hashes já existentes. Não criar uma nova palavra-passe nem substituir o mecanismo actual sem validar primeiro os dados existentes.

## Redes sociais do criador

Configurar os endereços oficiais no ambiente da Vercel (e localmente, se necessário):
- `NEXT_PUBLIC_SOCIAL_FACEBOOK_URL`
- `NEXT_PUBLIC_SOCIAL_X_URL`
- `NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL`
- `NEXT_PUBLIC_SOCIAL_YOUTUBE_URL`

Sem um endereço configurado, a rede aparece identificada como pendente em vez de apontar para um perfil inventado.


## Área administrativa e publicações

- Entrada administrativa: `/admin/publicar`.
- Login: `POST /api/admin/login`; usa a conta activa em `platform_admins`, valida a palavra-passe com o segredo administrativo existente no ambiente (quando configurado) ou com o hash scrypt guardado na base de dados, e cria uma sessão aleatória.
- Sessão: cookie `cl_admin_session`, HttpOnly, SameSite=Lax, Secure em produção, com validade de sete dias. A base guarda apenas SHA-256 do token.
- Limite de tentativas: oito tentativas falhadas por endereço de origem em quinze minutos; o endereço é guardado apenas como hash.
- Publicações: `POST /api/admin/content`; listar/gerir: `GET /api/admin/content`; apagar: `DELETE /api/admin/content`. Todas as operações de gestão exigem sessão e permissões.
- Feed público: `GET /api/content`, junta as publicações antigas de música/podcast às novas publicações editoriais.
- Tipos editoriais: artigo, música, vídeo, comunicado, poesia, evento, oportunidade e galeria. Os links de media e externos só aceitam HTTPS.
- Novas tabelas: `platform_publications` e `platform_admin_login_attempts`; a migração aditiva está em `drizzle/0001_admin_publications.sql`.

**Limite de armazenamento:** esta versão aceita URLs HTTPS para áudio, vídeo e imagens; não aceita upload de ficheiros binários ainda. O token de armazenamento existente foi sinalizado pela Vercel com um alerta de exposição e deve ser rodado antes de voltar a ser usado. Não publicar o token nem incluí-lo no código.

## Redes sociais de MC AG EIGI

A página apresenta Facebook (Aguinaldo AG Eigi), YouTube (MC AG EIGI), TikTok (MC AG EIGI), X/Twitter (MC AG) e Instagram (Aguinaldo AG mudico). Como foram fornecidos nomes de exibição e não URLs de perfil, os acessos actuais abrem a pesquisa da plataforma — não fingem ser links directos para contas verificadas. Substituir pelos URLs exactos dos perfis quando forem confirmados.

## Segurança e dependências

- A CI executa auditoria de dependências, testes, lint, typecheck e build.
- O projecto foi actualizado para versões corrigidas do Next.js, React, Drizzle ORM e Vitest. Drizzle Kit foi removido temporariamente até existir uma versão segura compatível com a cadeia de ferramentas.
