# PeopleHub · Robô de posts do Instagram

Automação **independente do sistema PeopleHub**. Ela:

1. Gera posts (feed + stories) **sobre o PeopleHub** — texto e imagem pela **IA
   da OpenAI** (texto no `gpt-4o-mini`, fundo no `gpt-image-1`), com a camada da
   marca (logo, headline, CTA) aplicada por cima.
2. Manda cada arte no seu **Telegram** com dois botões: **✅ Aprovar** / **❌ Reprovar**.
3. Ao aprovar, **publica sozinho no Instagram** (feed/stories via Instagram API).

Roda **na nuvem, de graça, no GitHub Actions** — não depende do seu PC ligado.

```
┌─ Gerar (seg 9h) ──────────────────────────────────────────────┐
│ OpenAI escreve o texto + cria o fundo → arte composta (JPG)    │
│ → salva em posts/ (vira URL pública) → Telegram (foto+botões)  │
└────────────────────────────────────────────────────────────────┘
┌─ Aprovar (a cada 15 min) ─────────────────────────────────────┐
│ lê os botões → ✅ publica no Instagram · ❌ descarta            │
└────────────────────────────────────────────────────────────────┘
```

O estado (posts pendentes, histórico) fica no `state.json`, versionado no
próprio repositório — por isso nada precisa de banco de dados nem servidor.

---

## Por que o repositório precisa ser PÚBLICO

- **Actions grátis e ilimitado** em repositório público.
- As artes em `posts/*.jpg` ganham uma URL pública
  (`raw.githubusercontent.com/...`) que o **Instagram consegue baixar** na hora
  de publicar (a Graph API exige uma `image_url` pública).

Nenhum segredo fica no repositório — tokens e chaves vão em **GitHub → Settings
→ Secrets and variables → Actions**. As imagens são material de marketing.

---

## Setup (uma vez)

### 1. Subir para um repositório público no GitHub
```bash
cd peoplehub-social-bot
git init && git add . && git commit -m "robô de posts do PeopleHub"
# crie um repo PÚBLICO no GitHub e:
git remote add origin https://github.com/SEU_USUARIO/peoplehub-social-bot.git
git push -u origin main
```

### 2. Bot do Telegram
1. No Telegram, fale com **@BotFather** → `/newbot` → copie o **token**.
2. Mande uma mensagem qualquer ao seu bot.
3. Pegue seu **chat id**: abra `https://api.telegram.org/bot<TOKEN>/getUpdates`
   e copie `message.chat.id`.

### 3. Instagram (API with Instagram Login)
Usa a conta **@peoplehubrh** (`graph.instagram.com`). Você precisa de:
- **IG_USER_ID** — id da conta (obtido em `graph.instagram.com/me?fields=user_id`).
- **IG_ACCESS_TOKEN** — token de acesso do Instagram (`IGAA...`), de longa duração,
  gerado no painel do App na Meta em **Instagram → API setup with Instagram login**.

> Renovar o token (a cada ~60 dias):
> `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=<TOKEN_ATUAL>`

### 4. Cadastrar os Secrets no GitHub
Em **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Obrigatório | Para quê |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | enviar/ler no Telegram |
| `TELEGRAM_CHAT_ID` | ✅ | seu chat |
| `IG_USER_ID` | ✅ (p/ publicar) | conta Instagram |
| `IG_ACCESS_TOKEN` | ✅ (p/ publicar) | publicar no IG |
| `OPENAI_API_KEY` | recomendado | texto + fundo da arte pela IA (sem ele: texto de fallback + fundo gradiente) |

E em **Variables** (aba ao lado), opcional: `IG_HANDLE` = `@peoplehub`.

### 5. Pronto
- Toda **segunda 9h (BRT)** o robô gera 1 feed + 1 story e te manda no Telegram.
- A cada **15 min** ele processa suas aprovações e publica os aprovados.
- Para gerar na hora: aba **Actions → "Gerar posts" → Run workflow** (dá pra
  escolher quantos feed/story).

---

## Testar localmente (opcional)

```bash
npm install
cp .env.example .env    # preencha as chaves
node src/generate.mjs --feed 1 --story 1   # gera e manda no Telegram
node src/poll.mjs                          # processa as decisões
```

> Local, o Instagram **não publica** (a imagem só fica pública quando está no
> GitHub). O envio e a aprovação no Telegram funcionam normalmente.

---

## Ajustes rápidos

- **Frequência / quantidade:** `cron` e `--feed/--story` em
  `.github/workflows/gerar.yml`.
- **Rapidez da aprovação:** `cron` em `.github/workflows/aprovar.yml` (padrão 15 min).
- **Temas:** `src/pilares.mjs`.
- **Visual da arte:** `src/imagem.mjs` (cores, layout, fontes).

> O GitHub pausa workflows agendados após 60 dias sem atividade no repo — se
> ficar muito tempo parado, rode um workflow manualmente para reativar.
