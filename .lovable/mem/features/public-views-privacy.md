---
name: Public views for privacy
description: artists_public / entrepreneurs_public views hide email/phone/birth/guardian from anon
type: feature
---
- Views `public.artists_public` e `public.entrepreneurs_public` (security_invoker=true) expõem somente colunas seguras.
- Anônimos não têm mais SELECT direto nas tabelas `artists`/`entrepreneurs` (REVOKE + column-level GRANT como defesa em profundidade).
- Páginas públicas (`Artistas`, `ArtistaDetalhe`, `Empreendedores`, `EmpreendedorDetalhe`) leem via `from("artists_public"|"entrepreneurs_public" as any)`.
- Donos e admins continuam lendo a tabela base normalmente (RLS já existente).
- Ao adicionar colunas sensíveis novas: NÃO incluir nas views; ao adicionar colunas públicas novas: adicionar nas views E no GRANT de colunas para `anon`.
