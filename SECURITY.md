# Segurança — Código Lírico

## Regras obrigatórias

- Credenciais e tokens nunca entram no Git.
- A ligação à base de dados é exclusivamente do lado do servidor.
- A autorização é verificada no servidor em cada operação protegida.
- Nenhuma permissão administrativa depende apenas de elementos escondidos na interface.
- Operações administrativas devem gerar registos de auditoria.
- Alterações ao esquema devem ser feitas por migrações revistas e testadas.
- Segredos expostos devem ser revogados e substituídos.

## Comunicação de vulnerabilidades

Não publiques detalhes de uma vulnerabilidade explorável em issues públicas. Contacta primeiro o responsável pelo projeto através dos canais privados da conta GitHub.

## Autenticação, conteúdo e cópias

- Os logins de artistas e administradores têm limitação de tentativas; a identificação de origem é guardada como hash, não como endereço IP em texto simples.
- Comentários públicos são validados no servidor: autor deve ser artista aprovado ou administrador activo e o conteúdo alvo deve estar efectivamente disponível.
- Ao remover conteúdo, os comentários, reacções, visualizações e denúncias associadas devem ser tratados na mesma operação transaccional.
- O plano Neon actual limita a recuperação temporal a 6 horas e não permite criar uma rotina automática de snapshots neste projecto. O snapshot manual antes da migração não substitui cópias independentes regulares. Nunca anunciar retenção eterna sem uma política de backup comprovada.
