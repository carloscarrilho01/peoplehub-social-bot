# PeopleHub · Robô de posts do Instagram

Automação **independente do sistema PeopleHub** que:

1. Gera posts (feed + stories) **sobre o PeopleHub** — texto e imagem pela **IA da
   OpenAI** (texto no `gpt-4o-mini`, fundo no `gpt-image-1`), com a camada da
   marca (logo, headline, CTA) e as fontes do PeopleHub (Bricolage Grotesque +
   Inter) aplicadas por cima.
2. Manda cada arte no seu **Telegram** com dois botões: **✅ Aprovar** / **❌ Reprovar**.
3. Ao aprovar, **publica sozinho no Instagram** (feed/stories).

Roda na **Vercel** como **webhook** — reage **na hora** do toque (sem espera).

```
Telegram (você toca) ─▶ webhook /api/telegram (Vercel)
   • botão "Nova arte" / /criar,/feed,/story ─▶ gera arte ─▶ Blob ─▶ manda pra aprovar
   • ✅ Aprovar ─▶ publica no Instagram na hora
   • ❌ Reprovar ─▶ descarta
Cron semanal (Vercel) ─▶ /api/gerar ─▶ gera 1 feed + 1 story
```

## Arquitetura

| Peça | O quê |
|---|---|
| `api/telegram.mjs` | Webhook do Telegram (responde na hora; trabalho pesado em `waitUntil`) |
| `api/gerar.mjs` | Cron semanal (segunda 9h BRT) |
| `src/webhook.mjs` | Lógica: gerar / aprovar / reprovar |
| `src/imagem.mjs` | Arte (OpenAI `gpt-image-1` + `@napi-rs/canvas` + fontes da marca) |
| `src/conteudo.mjs` | Texto (OpenAI `gpt-4o-mini`) |
| `src/instagram.mjs` | Publicação (Instagram API com Instagram Login) |
| `src/telegram.mjs` | Enviar arte, botões, painel, comandos |
| `src/blob.mjs` | Hospeda imagem + estado no **Vercel Blob** (URL pública p/ o Instagram) |
| `fonts/` | Bricolage Grotesque + Inter (versionadas; empacotadas via `includeFiles`) |
| `vercel.json` | `maxDuration`, `includeFiles` (fontes) e o Cron |

Sem banco de dados: o estado de cada post fica num JSON no Vercel Blob.

## Como usar (já está no ar)

- **Painel:** no Telegram, `/menu` abre os botões 🖼️ feed / 📱 story / ✨ ambos.
- **Comandos:** `/criar` (feed + story), `/feed`, `/story`.
- **Aprovar/Reprovar:** botões embaixo de cada arte. Aprovar publica na hora.
- **Automático:** toda segunda 9h (BRT) gera 1 feed + 1 story pra você aprovar.

## Variáveis de ambiente (na Vercel)

| Variável | Para quê |
|---|---|
| `OPENAI_API_KEY` | texto + imagem |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | enviar/receber no Telegram |
| `TELEGRAM_WEBHOOK_SECRET` | valida que o webhook veio do Telegram |
| `IG_USER_ID` / `IG_ACCESS_TOKEN` | publicar no Instagram (@peoplehubrh) |
| `IG_HANDLE` | aparece na arte (`@peoplehub`) |
| `CRON_SECRET` | protege a rota do cron |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (injetado pela integração) |

## Manutenção

- **Deploy:** `git push` na `main` → a Vercel faz deploy automático. Ou `vercel deploy --prod`.
- **Trocar o webhook** (se o domínio mudar):
  `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram&secret_token=<SECRET>`
- **Renovar o token do Instagram** (a cada ~60 dias):
  `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=<TOKEN_ATUAL>`
  e atualizar `IG_ACCESS_TOKEN` na Vercel (`vercel env rm` + `vercel env add`).
- **Temas dos posts:** `src/pilares.mjs`. **Visual:** `src/imagem.mjs`.

## Testar localmente (opcional)

```bash
npm install
cp .env.example .env   # preencha as chaves
npm run preview        # gera 1 feed + 1 story em posts/_preview_*.jpg (não publica)
```
