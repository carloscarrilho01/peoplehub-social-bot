// Cron semanal da Vercel (e disparo manual): gera 1 feed + 1 story e envia ao
// Telegram para aprovação. Configurado em vercel.json.
import { gerarVarios } from '../src/webhook.mjs'
import { enviarPainel } from '../src/telegram.mjs'

export default async function handler(req, res) {
  // O Cron da Vercel manda Authorization: Bearer <CRON_SECRET> (se definido).
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false })
  }

  const feed = clamp(req.query?.feed, 1)
  const story = clamp(req.query?.story, 1)
  const tipos = [...Array(feed).fill('feed'), ...Array(story).fill('story')]

  const enviados = await gerarVarios(tipos)
  await enviarPainel().catch(() => {})

  res.status(200).json({ ok: true, enviados, pedidos: tipos.length })
}

function clamp(v, def) {
  const n = v === undefined ? def : parseInt(v, 10)
  if (Number.isNaN(n)) return def
  return Math.min(5, Math.max(0, n))
}
