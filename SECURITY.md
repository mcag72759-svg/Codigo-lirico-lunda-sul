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
