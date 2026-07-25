// ENTRADA (agendado / manual): gera os posts e envia ao Telegram para aprovação.
//
// Uso: node src/generate.mjs --feed 1 --story 1
import { carregarEnvLocal, parseArgs } from './util.mjs'
import { carregar, salvar } from './state.mjs'
import { gerarEEnviar } from './gerar.mjs'
import { enviarPainel, telegramConfigurado } from './telegram.mjs'

carregarEnvLocal()

const args = parseArgs(process.argv.slice(2))
const feed = clamp(args.feed, 1)
const story = clamp(args.story, 1)
const tipos = [...Array(feed).fill('feed'), ...Array(story).fill('story')]

const state = carregar()
const r = await gerarEEnviar(tipos, state)

// Garante que o painel com o botão "criar arte" esteja sempre disponível.
if (telegramConfigurado()) {
  await enviarPainel().catch(() => {})
}

salvar(state)
console.log(`\nConcluído: ${r.enviados}/${r.criados} enviados para aprovação.`)
if (!process.env.GITHUB_REPOSITORY && !process.env.REPO_RAW_BASE) {
  console.log('⚠ Sem URL pública das imagens (rode no GitHub Actions p/ o Instagram conseguir publicar).')
}

function clamp(v, def) {
  const n = v === undefined ? def : parseInt(v, 10)
  if (Number.isNaN(n)) return def
  return Math.min(5, Math.max(0, n))
}
