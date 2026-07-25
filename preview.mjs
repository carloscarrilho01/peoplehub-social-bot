// Prévia local: gera 1 feed + 1 story REAIS (texto + fundo pela IA do Claude)
// e salva em posts/_preview_*.jpg, SEM enviar ao Telegram nem publicar no IG.
// Serve para conferir o visual antes de ligar tudo.
//
// Uso: preencha ANTHROPIC_API_KEY no .env e rode: npm run preview
import { writeFileSync } from 'node:fs'
import { carregarEnvLocal } from './src/util.mjs'
import { sortearPilares } from './src/pilares.mjs'
import { gerarBriefing } from './src/conteudo.mjs'
import { comporArte } from './src/imagem.mjs'

carregarEnvLocal()

if (!process.env.OPENAI_API_KEY) {
  console.log('⚠ Sem OPENAI_API_KEY no .env — texto de fallback e fundo gradiente da marca (sem IA).')
}

for (const tipo of ['feed', 'story']) {
  const [pilar] = sortearPilares(1)
  console.log(`\n▶ ${tipo} — pilar "${pilar.nome}"`)
  const briefing = await gerarBriefing(pilar, tipo)
  console.log(`  headline: ${briefing.headline}`)
  const jpeg = await comporArte(briefing, tipo)
  const arquivo = `posts/_preview_${tipo}.jpg`
  writeFileSync(arquivo, jpeg)
  console.log(`  ✔ salvo em ${arquivo} (${jpeg.length} bytes)`)
}

console.log('\nPronto. Abra os arquivos posts/_preview_*.jpg para ver as artes.')
