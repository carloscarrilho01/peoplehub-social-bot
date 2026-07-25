// Webhook do Telegram (Vercel). Reage NA HORA a cada toque/comando: responde
// 200 imediatamente e faz o trabalho pesado (gerar arte / publicar) em segundo
// plano com waitUntil, para o Telegram não reenviar o update.
import { waitUntil } from '@vercel/functions'
import { processarUpdate } from '../src/webhook.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('ok')
  }

  // Valida o segredo que o Telegram envia (configurado no setWebhook).
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (secret && req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    return res.status(401).json({ ok: false })
  }

  const update = typeof req.body === 'string' ? safeParse(req.body) : req.body || {}

  // Responde já; o processamento continua em background.
  res.status(200).json({ ok: true })
  waitUntil(processarUpdate(update).catch((e) => console.error('[webhook]', e)))
}

function safeParse(s) {
  try { return JSON.parse(s) } catch { return {} }
}
