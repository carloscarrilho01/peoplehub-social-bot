// Geração compartilhada: usada tanto pelo agendamento (generate.mjs) quanto
// pelo botão "criar arte" do Telegram (poll.mjs). Para cada tipo pedido, cria o
// briefing (texto), a arte, salva o JPG, monta a URL pública e envia ao Telegram
// para aprovação, registrando como pendente no state.
import { writeFileSync } from 'node:fs'
import { idCurto, baseImagens } from './util.mjs'
import { sortearPilares } from './pilares.mjs'
import { gerarBriefing } from './conteudo.mjs'
import { comporArte } from './imagem.mjs'
import { enviarArte } from './telegram.mjs'

export async function gerarEEnviar(tipos, state) {
  if (!tipos.length) return { criados: 0, enviados: 0 }
  const base = baseImagens()
  const pilares = sortearPilares(tipos.length)
  let enviados = 0

  for (let i = 0; i < tipos.length; i++) {
    const tipo = tipos[i]
    const pilar = pilares[i % pilares.length]
    try {
      console.log(`▶ ${tipo} — pilar "${pilar.nome}"`)
      const briefing = await gerarBriefing(pilar, tipo)
      const jpeg = await comporArte(briefing, tipo)

      const id = idCurto()
      writeFileSync(`posts/${id}.jpg`, jpeg)
      const imageUrl = base ? `${base}/${id}.jpg` : null

      const post = {
        id,
        type: tipo,
        tema: briefing.tema,
        headline: briefing.headline,
        caption: briefing.caption,
        hashtags: briefing.hashtags,
        imageUrl,
        createdAt: new Date().toISOString(),
      }

      const { chatId, messageId } = await enviarArte(jpeg, post)
      state.pending[id] = { ...post, chatId, messageId }
      enviados++
      console.log(`  ✔ enviado (${id})`)
    } catch (e) {
      console.error(`  ✖ falhou (${tipo}/${pilar.nome}):`, e?.message || e)
    }
  }
  return { criados: tipos.length, enviados }
}

// Converte "feed"/"story"/"ambos" (do botão) em lista de tipos.
export function tiposDoAlvo(alvo) {
  if (alvo === 'feed') return ['feed']
  if (alvo === 'story') return ['story']
  if (alvo === 'ambos') return ['feed', 'story']
  return []
}
