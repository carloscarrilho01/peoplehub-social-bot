// Camada Telegram: envia a arte com botões e lê as decisões (long-polling).

function token() {
  const t = process.env.TELEGRAM_BOT_TOKEN
  if (!t) throw new Error('TELEGRAM_BOT_TOKEN ausente')
  return t
}
function chatId() {
  const c = process.env.TELEGRAM_CHAT_ID
  if (!c) throw new Error('TELEGRAM_CHAT_ID ausente')
  return c
}
function api(method) {
  return `https://api.telegram.org/bot${token()}/${method}`
}

export function telegramConfigurado() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function montarLegenda(post) {
  const tag = post.type === 'story' ? '📱 STORY' : '🖼️ FEED'
  const linhas = [`<b>${tag}</b> · ${escapeHtml(post.tema || '')}`, '', escapeHtml(post.caption)]
  if (post.hashtags) linhas.push('', escapeHtml(post.hashtags))
  const t = linhas.join('\n')
  return t.length > 1024 ? t.slice(0, 1020) + '…' : t
}

// Envia a arte (bytes) com os botões Aprovar/Reprovar. Retorna { chatId, messageId }.
export async function enviarArte(buffer, post) {
  const form = new FormData()
  form.append('chat_id', chatId())
  form.append('caption', montarLegenda(post))
  form.append('parse_mode', 'HTML')
  form.append(
    'reply_markup',
    JSON.stringify({
      inline_keyboard: [
        [
          { text: '✅ Aprovar', callback_data: `ap:${post.id}` },
          { text: '❌ Reprovar', callback_data: `rp:${post.id}` },
        ],
      ],
    })
  )
  form.append('photo', new Blob([new Uint8Array(buffer)], { type: 'image/jpeg' }), `${post.id}.jpg`)

  const r = await fetch(api('sendPhoto'), { method: 'POST', body: form })
  const j = await r.json()
  if (!r.ok || !j.ok) throw new Error(`sendPhoto: ${JSON.stringify(j).slice(0, 200)}`)
  return { chatId: j.result.chat.id, messageId: j.result.message_id }
}

export async function getUpdates(offset) {
  const url = new URL(api('getUpdates'))
  if (offset) url.searchParams.set('offset', String(offset))
  url.searchParams.set('timeout', '0')
  url.searchParams.set('allowed_updates', JSON.stringify(['callback_query', 'message']))
  const r = await fetch(url)
  const j = await r.json()
  if (!j.ok) throw new Error(`getUpdates: ${JSON.stringify(j).slice(0, 200)}`)
  return j.result || []
}

// Painel fixo com o botão "criar arte quando quiser". Os botões inline ficam
// ativos enquanto a mensagem existir no chat, então funcionam como um controle
// permanente. O toque vira um callback (new:feed / new:story / new:ambos) que o
// poll.mjs atende.
export async function enviarPainel() {
  await fetch(api('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId(),
      text: '🎨 <b>Painel PeopleHub</b>\nCrie uma arte quando quiser:',
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🖼️ Nova arte (feed)', callback_data: 'new:feed' },
            { text: '📱 Nova arte (story)', callback_data: 'new:story' },
          ],
          [{ text: '✨ Feed + Story', callback_data: 'new:ambos' }],
        ],
      },
    }),
  }).catch(() => {})
}

// Registra os comandos do bot (aparecem no menu ao lado do campo de texto).
export async function configurarComandos() {
  await fetch(api('setMyCommands'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'menu', description: 'Abrir o painel de criação' },
        { command: 'criar', description: 'Criar 1 feed + 1 story agora' },
        { command: 'feed', description: 'Criar uma arte de feed' },
        { command: 'story', description: 'Criar uma arte de story' },
      ],
    }),
  }).catch(() => {})
}

// Mensagem de texto simples (feedback rápido).
export async function enviarTexto(texto) {
  await fetch(api('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId(), text: texto, parse_mode: 'HTML' }),
  }).catch(() => {})
}

export async function responderCallback(callbackQueryId, texto) {
  await fetch(api('answerCallbackQuery'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: texto, show_alert: false }),
  }).catch(() => {})
}

// Edita a legenda registrando a decisão e remove os botões.
export async function marcarDecisao(chat, messageId, legendaAtual, resultado) {
  const nova = `${legendaAtual}\n\n<b>${escapeHtml(resultado)}</b>`
  await fetch(api('editMessageCaption'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chat,
      message_id: messageId,
      caption: nova.length > 1024 ? nova.slice(0, 1020) + '…' : nova,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [] },
    }),
  }).catch(() => {})
}
