# Dono da Pelada

PWA mobile-first para administrar peladas, jogadores, presencas, sorteio de times balanceados, estatisticas e enquete de craque da pelada.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL via `DATABASE_URL`
- Auth.js/NextAuth com login por email/senha para admins e provedores sociais
- Supabase Storage para fotos/selfies
- PWA com manifest e service worker

## Configuracao

1. Instale as dependencias:

```bash
npm install
```

2. Crie o `.env` a partir do exemplo:

```bash
cp .env.example .env
```

3. Configure pelo menos:

```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="gere-um-segredo-forte"
MASTER_ADMIN_NAME="Administrador Master"
MASTER_ADMIN_EMAIL="admin@donodapelada.com"
MASTER_ADMIN_PASSWORD="admin123"
```

Como voce nao tem PostgreSQL local, use um banco gratuito/remoto no Railway ou Neon. Depois, se quiser limpar dados de teste, rode deletes controlados pelo painel do banco ou recrie o banco.

## Fotos em nuvem

Para cerca de 50 imagens, Supabase Storage atende bem no plano gratuito.

1. Crie um projeto no Supabase.
2. Crie um bucket publico chamado `player-photos`.
3. Copie a URL do projeto e a service role key para:

```env
SUPABASE_URL="https://xxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
SUPABASE_STORAGE_BUCKET="player-photos"
```

## Notificacoes push

Gere as chaves VAPID:

```bash
npm run push:keys
```

Copie os valores para o `.env`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:admin@donodapelada.com"
```

Depois rode a migration para criar a tabela de dispositivos:

```bash
npx prisma migrate dev --name add_push_subscriptions
```

O app mostra um card para o usuario ativar notificacoes. Os disparos acontecem quando uma pelada e criada, quando a votacao de craque e aberta e quando o admin avisa a abertura dos lancamentos de gols/defesas.

## Login social

Configure somente os provedores que quiser usar:

```env
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""
INSTAGRAM_CLIENT_ID=""
INSTAGRAM_CLIENT_SECRET=""
```

Sem essas chaves, o app mostra o login por email/senha para o admin master.

## Banco

Rode:

```bash
npx prisma migrate dev
npx prisma db seed
```

O seed cria o administrador master com as variaveis `MASTER_ADMIN_*`.

## Desenvolvimento

```bash
npm run dev
```

Acesse:

```text
http://localhost:3000
```

Em redes corporativas no Windows, o Node pode nao confiar na cadeia TLS usada por proxy/inspecao HTTPS. Os scripts `dev`, `build` e `start` ja usam `node --use-system-ca` para aproveitar os certificados instalados no Windows.

Admin master inicial:

```text
Email: admin@donodapelada.com
Senha: admin123
```

Use os valores reais do seu `.env` caso tenha alterado.

## Build

```bash
npm run build
npm start
```

## Mercado Pago e renovacao automatica

O Plano Pro usa a API de Assinaturas (`/preapproval`) com cartao, quatro dias de teste gratis e renovacao automatica conforme o plano mensal, trimestral ou anual.

Configure no ambiente de deploy:

```env
MERCADOPAGO_ACCESS_TOKEN="SEU_ACCESS_TOKEN"
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="SUA_PUBLIC_KEY"
MERCADOPAGO_WEBHOOK_SECRET="..."
CRON_SECRET="..."
```

No painel **Suas integracoes > Webhooks** do Mercado Pago, cadastre a URL publica abaixo e habilite obrigatoriamente os tres eventos:

```text
https://SEU_DOMINIO/api/mercadopago/webhook

subscription_preapproval
subscription_authorized_payment
payment
```

Agende uma chamada pelo menos a cada hora para a rota de conciliacao. Ela recupera webhooks perdidos e continua liquidando autorizacoes criadas pela versao antiga do app:

```http
GET /api/mercadopago/capture-due
Authorization: Bearer SEU_CRON_SECRET
```

Antes de liberar producao, aplique as migrations e execute uma assinatura completa com credenciais e cartao de teste: criacao, cancelamento durante o teste gratis, primeira cobranca e renovacao.

## Deploy Railway

1. Crie o projeto no Railway.
2. Configure as variaveis de ambiente do `.env`.
3. Aponte `DATABASE_URL` para PostgreSQL Railway ou Neon.
4. Rode migrations no ambiente ou localmente contra o banco remoto.
5. Faça deploy do app Next.js.

## Fluxo recomendado

1. Admin master entra por email/senha.
2. Admin cria pelada.
3. Admin marca presencas.
4. Admin sorteia times.
5. Ao fim da pelada, admin registra gols, participacoes e defesas dificeis.
6. Admin cria/encerra enquete de craque.
7. Jogadores entram por login social, fazem onboarding com selfie e podem votar.

## Observacoes

- O app esta preparado para PostgreSQL remoto; nao usa SQLite.
- Fotos nao sao salvas no banco, apenas URLs publicas do Supabase Storage.
- Instagram Login exige configuracao correta no app da Meta e pode ter restricoes de permissao conforme o tipo de conta/app.
