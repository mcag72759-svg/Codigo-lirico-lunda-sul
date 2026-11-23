# Código Lírico — Lunda Sul

Plataforma cultural independente criada por MC AG EIGI, com foco em artistas, música, poesia, eventos e oportunidades na Lunda Sul e em Angola.

## O que esta versão entrega
- Página pública responsiva, com identidade editorial em preto, prata e cobre.
- Área administrativa com sessão protegida, permissões, auditoria, publicação, edição e remoção de conteúdos.
- Upload directo de ficheiros do telemóvel ou computador para Vercel Blob (até 200 MB por ficheiro, conforme os tipos aceites no formulário).
- Biblioteca pública de downloads para ficheiros publicados.
- Registo de artistas com apenas telefone e palavra-passe obrigatórios; os dados adicionais do perfil são opcionais e podem ser preenchidos no cadastro.
- Login do estúdio em `/artista` através de telefone e palavra-passe, com suporte a números angolanos nacionais e internacionais.
- Contas e perfis guardados em Neon PostgreSQL; palavras-passe protegidas com scrypt e salt individual, sessões guardadas por hash e recuperação com código de utilização única.
- Estúdio privado do artista: envio de áudio/vídeo, lista de envios e cancelamento de ficheiros pendentes.
- Moderação administrativa de ficheiros de artistas; apenas material aprovado e autorizado aparece no feed público.
- Comunidade de artistas aprovados em `/comunidade`: feed público e para seguidores, comentários, reacções, seguir criadores, denúncias e moderação administrativa de publicações pendentes.
- Secções públicas com perfis de artistas aprovados, eventos e oportunidades lidos da base Neon.
- Base de dados Neon PostgreSQL e acesso pelo Drizzle ORM, exclusivamente no servidor.
- Registos administrativos de auditoria e limitação de tentativas de login.

## Endereços
- Página principal: `/`
- Administração: `/admin/publicar`
- Estúdio do artista: `/artista`
- Biblioteca de downloads: `/downloads`
- Conteúdo público: `/api/content`
- Artistas, eventos e oportunidades: `/api/discovery`

## Segurança e armazenamento
- As páginas administrativas e do artista usam cookies de sessão HttpOnly, Secure em produção e SameSite=Lax.
- A base guarda hashes dos tokens de sessão, não os tokens em claro.
- As operações de administração verificam a sessão e a permissão no servidor.
- O envio de ficheiros é autorizado por sessão e utiliza tokens temporários de upload do Blob.
- A palavra-passe administrativa e a ligação à base de dados são segredos de ambiente da Vercel. Nunca as colocar no Git.
- Conteúdos enviados pelo artista ficam pendentes até revisão administrativa; o feed público só mostra conteúdo aprovado.
- Um índice único na base de dados impede que o mesmo telefone seja registado novamente com pontuação ou indicativo diferente.
- Links externos só são aceites quando usam HTTPS.

## Desenvolvimento
Requisitos: Node.js 20.9+ e npm.

```bash
npm install
npm run dev
```

Verificações:
```bash
npm test
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=high
```

## Funcionalidades da versão integrada
- Candidatura pública de artistas, revisão administrativa e activação individual da conta.
- Estúdio do artista com categorias para música, vídeo, poesia, eventos, organizações, parcerias, anúncios, artigos e galerias.
- Upload de ficheiros de áudio/vídeo, reprodução nativa e downloads públicos quando autorizados.
- Feed comunitário com seguir, gostos, comentários, mensagens privadas e moderação.
- Métricas para artistas e administração: seguidores, gostos, comentários e visualizações únicas por publicação.
- Eventos com data, local, organização, preço e ligação externa de bilhetes/inscrição.
- Agendamento de publicações, respeitando a aprovação administrativa.

## Limites claros desta versão
A bilheteira encaminha para um serviço externo; não processa pagamentos no próprio Código Lírico. O agendamento não substitui a revisão administrativa: uma publicação só fica visível depois de aprovada e de chegar a hora definida.

Os links das redes sociais do criador usam pesquisas públicas enquanto os URLs directos dos perfis não forem configurados. A lista de eventos e oportunidades depende de registos mantidos na base de dados; cada entidade externa deve ser confirmada na sua fonte antes de qualquer participação.
