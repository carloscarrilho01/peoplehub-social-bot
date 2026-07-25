// ENTRADA (agendado a cada ~10 min): lê o Telegram e reage:
//  - ✅/❌ nos posts pendentes → publica no Instagram / descarta
//  - botões "Nova arte" ou comandos /criar /feed /story → gera na hora
//  - /menu ou /start → reabre o painel de botões
// Atualiza o state.json (o workflow faz o commit depois).
import { carregarEnvLocal } from './util.mjs'
import {
  getUpdates, responderCallback, marcarDecisao,
  enviarPainel, enviarTexto, configurarComandos,
} from './telegram.mjs'
import { publicarInstagram } from './instagram.mjs'
import { gerarEEnviar, tiposDoAlvo } from './gerar.mjs'
import { carregar, salvar } from './state.mjs'

carregarEnvLocal()

const state = carregar()
let updates = []
try {
  updates = await getUpdates(state.lastUpdateId + 1)
} catch (e) {
  console.error('Falha ao ler updates do Telegram:', e?.message || e)
  process.exit(1)
}

// Mantém os comandos do bot atualizados (barato, idempotente).
await configurarComandos()

if (updates.length === 0) {
  console.log('Nenhuma novidade.')
  process.exit(0)
}

let maxId = state.lastUpdateId
let acoes = 0

for (const u of updates) {
  if (typeof u.update_id === 'number') maxId = Math.max(maxId, u.update_id)

  try {
    if (u.callback_query) {
      await tratarCallback(u.callback_query)
      acoes++
    } else if (u.message?.text) {
      await tratarComando(u.message.text.trim())
      acoes++
    }
  } catch (e) {
    console.error('Erro ao processar update:', e?.message || e)
  }
}

state.lastUpdateId = maxId
salvar(state)
console.log(`Concluído: ${acoes} ação(ões).`)

// ---- handlers ----

async function tratarCallback(cb) {
  const [acao, arg] = String(cb.data || '').split(':')

  // Criar arte sob demanda
  if (acao === 'new') {
    const tipos = tiposDoAlvo(arg)
    await responderCallback(cb.id, tipos.length > 1 ? '🎨 Gerando feed + story...' : '🎨 Gerando sua arte...')
    await gerarEEnviar(tipos, state)
    return
  }

  // Aprovar / reprovar um post pendente
  const id = arg
  const post = id ? state.pending[id] : null
  if (!post) {
    await responderCallback(cb.id, 'Este post já foi processado ou expirou.')
    return
  }
  const legendaAtual = cb.message?.caption || ''

  if (acao === 'ap') {
    await responderCallback(cb.id, '⏳ Publicando...')
    const caption = post.type === 'story' ? '' : [post.caption, post.hashtags].filter(Boolean).join('\n\n')
    const pub = await publicarInstagram({ imageUrl: post.imageUrl, caption, type: post.type })
    const mensagem = pub.ok ? '✅ Publicado no Instagram.' : `⚠️ Aprovado, mas a publicação falhou: ${pub.error}`
    await marcarDecisao(post.chatId, post.messageId, legendaAtual, mensagem)
    state.history.push({
      id, type: post.type, tema: post.tema, decision: 'aprovado',
      igMediaId: pub.mediaId || null, error: pub.ok ? null : pub.error, at: new Date().toISOString(),
    })
    delete state.pending[id]
    console.log(`Post ${id}: aprovado → ${pub.ok ? 'publicado ' + pub.mediaId : 'ERRO ' + pub.error}`)
  } else if (acao === 'rp') {
    await responderCallback(cb.id, '❌ Reprovado.')
    await marcarDecisao(post.chatId, post.messageId, legendaAtual, '❌ Reprovado.')
    state.history.push({ id, type: post.type, tema: post.tema, decision: 'reprovado', at: new Date().toISOString() })
    delete state.pending[id]
    console.log(`Post ${id}: reprovado`)
  }
}

async function tratarComando(texto) {
  const cmd = texto.toLowerCase().split(/\s|@/)[0] // "/criar@bot arg" -> "/criar"
  if (cmd === '/menu' || cmd === '/start') {
    await enviarPainel()
  } else if (cmd === '/criar') {
    await enviarTexto('🎨 Gerando feed + story...')
    await gerarEEnviar(['feed', 'story'], state)
  } else if (cmd === '/feed') {
    await enviarTexto('🎨 Gerando um feed...')
    await gerarEEnviar(['feed'], state)
  } else if (cmd === '/story') {
    await enviarTexto('🎨 Gerando um story...')
    await gerarEEnviar(['story'], state)
  }
}
