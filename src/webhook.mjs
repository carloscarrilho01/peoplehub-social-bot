// Cérebro do webhook: processa UM update do Telegram na hora.
//  - botão "Nova arte" / comandos → gera e envia para aprovação
//  - ✅ Aprovar → publica no Instagram na hora
//  - ❌ Reprovar → descarta
// Usa Vercel Blob para hospedar a imagem (URL pública) e o estado do post.
import { idCurto } from './util.mjs'
import { sortearPilares } from './pilares.mjs'
import { gerarBriefing } from './conteudo.mjs'
import { comporArte } from './imagem.mjs'
import { tiposDoAlvo } from './gerar.mjs'
import {
  enviarArte, responderCallback, marcarDecisao, enviarPainel, enviarTexto,
} from './telegram.mjs'
import { publicarInstagram } from './instagram.mjs'
import { subirImagem, salvarPost, carregarPost } from './blob.mjs'

export async function processarUpdate(update) {
  if (update?.callback_query) return tratarCallback(update.callback_query)
  if (update?.message?.text) return tratarComando(update.message.text.trim())
}

// Gera uma arte, hospeda no Blob e envia ao Telegram para aprovação.
async function gerarUmPost(tipo) {
  const [pilar] = sortearPilares(1)
  const briefing = await gerarBriefing(pilar, tipo)
  const jpeg = await comporArte(briefing, tipo)
  const id = idCurto()
  const imageUrl = await subirImagem(id, jpeg)
  const post = {
    id, type: tipo, tema: briefing.tema, headline: briefing.headline,
    caption: briefing.caption, hashtags: briefing.hashtags, imageUrl,
    createdAt: new Date().toISOString(),
  }
  const { chatId, messageId } = await enviarArte(jpeg, post)
  await salvarPost({ ...post, chatId, messageId })
  return post
}

// Gera vários em paralelo (mais rápido, cabe no tempo da função serverless).
export async function gerarVarios(tipos) {
  const resultados = await Promise.allSettled(tipos.map((t) => gerarUmPost(t)))
  for (let i = 0; i < resultados.length; i++) {
    if (resultados[i].status === 'rejected') {
      console.error('gerar', tipos[i], resultados[i].reason)
      await enviarTexto(`⚠️ Falha ao gerar ${tipos[i]}: ${resultados[i].reason?.message || resultados[i].reason}`)
    }
  }
  return resultados.filter((r) => r.status === 'fulfilled').length
}

async function tratarCallback(cb) {
  const [acao, arg] = String(cb.data || '').split(':')

  if (acao === 'new') {
    const tipos = tiposDoAlvo(arg)
    await responderCallback(cb.id, tipos.length > 1 ? '🎨 Gerando feed + story...' : '🎨 Gerando sua arte...')
    await gerarVarios(tipos)
    return
  }

  const id = arg
  const post = id ? await carregarPost(id) : null
  if (!post) {
    await responderCallback(cb.id, 'Post não encontrado ou já processado.')
    return
  }
  const legenda = cb.message?.caption || ''

  if (acao === 'ap') {
    await responderCallback(cb.id, '⏳ Publicando...')
    const caption = post.type === 'story' ? '' : [post.caption, post.hashtags].filter(Boolean).join('\n\n')
    const pub = await publicarInstagram({ imageUrl: post.imageUrl, caption, type: post.type })
    const msg = pub.ok ? '✅ Publicado no Instagram.' : `⚠️ Aprovado, mas a publicação falhou: ${pub.error}`
    await marcarDecisao(post.chatId, post.messageId, legenda, msg)
    console.log(`Post ${id}: ${pub.ok ? 'publicado ' + pub.mediaId : 'ERRO ' + pub.error}`)
  } else if (acao === 'rp') {
    await responderCallback(cb.id, '❌ Reprovado.')
    await marcarDecisao(post.chatId, post.messageId, legenda, '❌ Reprovado.')
  }
}

async function tratarComando(texto) {
  const cmd = texto.toLowerCase().split(/\s|@/)[0]
  if (cmd === '/menu' || cmd === '/start') {
    await enviarPainel()
  } else if (cmd === '/criar') {
    await enviarTexto('🎨 Gerando feed + story...')
    await gerarVarios(['feed', 'story'])
  } else if (cmd === '/feed') {
    await enviarTexto('🎨 Gerando um feed...')
    await gerarVarios(['feed'])
  } else if (cmd === '/story') {
    await enviarTexto('🎨 Gerando um story...')
    await gerarVarios(['story'])
  }
}
