// Geração da arte (híbrido): fundo por IA (OpenAI gpt-image-1) + camada da marca
// por cima (wordmark, headline, CTA, @handle), composta com @napi-rs/canvas.
// Sem OPENAI_API_KEY, o fundo vira um gradiente da marca. Retorna um Buffer
// JPEG (o Instagram exige JPEG para publicação por image_url).
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import { existsSync } from 'node:fs'

// Cores da identidade PeopleHub
const NAVY = '#0f1c2e'
const NAVY_600 = '#1e3a5f'
const CORAL = '#ff6b57'
const CORAL_LIGHT = '#ff9d88'

// Identidade visual do PeopleHub: títulos/wordmark em Bricolage Grotesque
// (display) e apoio/UI em Inter — as mesmas fontes do app. Os arquivos ficam
// versionados em fonts/. Se faltarem, cai em sans-serif.
let FONT_DISPLAY = 'sans-serif'
let FONT_BODY = 'sans-serif'
try {
  if (existsSync('fonts/BricolageGrotesque.ttf')) {
    GlobalFonts.registerFromPath('fonts/BricolageGrotesque.ttf', 'Bricolage Grotesque')
    FONT_DISPLAY = 'Bricolage Grotesque'
  }
  if (existsSync('fonts/Inter.ttf')) {
    GlobalFonts.registerFromPath('fonts/Inter.ttf', 'Inter')
    FONT_BODY = 'Inter'
  }
} catch { /* fontes opcionais */ }

const HANDLE = () => process.env.IG_HANDLE || '@peoplehub'

// Gera o fundo com a IA de imagem da OpenAI (gpt-image-1). Retorna Buffer ou
// null. Tenta algumas vezes porque a API às vezes devolve erro transitório
// (ex: 520 do Cloudflare).
async function gerarFundoIA(imagePrompt, tipo, tentativas = 3) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const size = tipo === 'story' ? '1024x1536' : '1024x1024'

  for (let i = 1; i <= tentativas; i++) {
    try {
      const resp = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-image-1', prompt: imagePrompt, size, n: 1, output_format: 'jpeg', quality: 'medium' }),
        signal: AbortSignal.timeout(120_000),
      })
      if (resp.ok) {
        const json = await resp.json()
        const item = json.data?.[0]
        let buf = null
        if (item?.b64_json) buf = Buffer.from(item.b64_json, 'base64')
        else if (item?.url) buf = Buffer.from(await (await fetch(item.url)).arrayBuffer())
        // Remove metadados C2PA/XMP: o @napi-rs/canvas confunde o SVG embutido
        // nesses metadados e recusa a imagem ("Invalid SVG image").
        return buf ? stripJpegMetadata(buf) : null
      }
      // 4xx (menos 429) é erro definitivo — não adianta repetir.
      if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
        console.error('[imagem] OpenAI', resp.status, (await resp.text()).slice(0, 200))
        return null
      }
      console.error(`[imagem] OpenAI ${resp.status} (tentativa ${i}/${tentativas})`)
    } catch (e) {
      console.error(`[imagem] OpenAI falhou (tentativa ${i}/${tentativas}):`, e?.message || e)
    }
    if (i < tentativas) await new Promise((r) => setTimeout(r, 2500 * i))
  }
  return null
}

// Remove segmentos APPn (0xE0-0xEF, incluindo XMP/C2PA) e COM (0xFE) de um
// JPEG, preservando os dados de imagem. Necessário porque o gpt-image-1 embute
// credenciais de conteúdo (C2PA) que contêm SVG, e o decodificador do canvas
// confunde isso com uma imagem SVG.
function stripJpegMetadata(buf) {
  if (!(buf[0] === 0xff && buf[1] === 0xd8)) return buf
  const out = [0xff, 0xd8]
  let i = 2
  while (i < buf.length) {
    if (buf[i] !== 0xff) { out.push(buf[i]); i++; continue }
    const marker = buf[i + 1]
    if (marker === 0xda) { for (let k = i; k < buf.length; k++) out.push(buf[k]); break }
    const len = (buf[i + 2] << 8) | buf[i + 3]
    if ((marker >= 0xe0 && marker <= 0xef) || marker === 0xfe) { i += 2 + len; continue }
    for (let k = i; k < i + 2 + len; k++) out.push(buf[k])
    i += 2 + len
  }
  return Buffer.from(out)
}

// Compõe a arte final e devolve um Buffer JPEG.
export async function comporArte(briefing, tipo) {
  const W = 1080
  const H = tipo === 'story' ? 1920 : 1080
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  // 1) Fundo por IA (OpenAI); se falhar/sem chave, gradiente da marca
  const bgBuffer = await gerarFundoIA(briefing.imagePrompt, tipo)
  if (bgBuffer) {
    try {
      const img = await loadImage(bgBuffer)
      drawCover(ctx, img, W, H)
    } catch {
      pintarGradiente(ctx, W, H)
    }
  } else {
    pintarGradiente(ctx, W, H)
  }

  // 2) Scrim para legibilidade (mais escuro embaixo)
  const scrim = ctx.createLinearGradient(0, 0, 0, H)
  scrim.addColorStop(0, 'rgba(15,28,46,0.20)')
  scrim.addColorStop(0.48, 'rgba(15,28,46,0.55)')
  scrim.addColorStop(1, 'rgba(15,28,46,0.94)')
  ctx.fillStyle = scrim
  ctx.fillRect(0, 0, W, H)

  const pad = tipo === 'story' ? 96 : 84

  // 3) Wordmark (topo)
  desenharWordmark(ctx, pad, pad)

  // 4) Bloco de texto (embaixo)
  const headlineSize = tipo === 'story' ? 92 : 76
  const subSize = tipo === 'story' ? 40 : 36
  const maxW = W - pad * 2

  ctx.textBaseline = 'alphabetic'

  ctx.font = `800 ${headlineSize}px ${FONT_DISPLAY}`
  const linhas = wrap(ctx, briefing.headline, maxW)
  const lhHead = headlineSize * 1.08

  const ctaH = 68
  const gapAcimaCTA = 44

  let y = H - pad - ctaH

  // CTA + handle
  desenharCtaEhandle(ctx, pad, y, briefing.cta, tipo)

  // Subheadline
  if (briefing.subheadline) {
    y -= gapAcimaCTA
    ctx.font = `500 ${subSize}px ${FONT_BODY}`
    ctx.fillStyle = CORAL_LIGHT
    const subLinhas = wrap(ctx, briefing.subheadline, maxW)
    for (let i = subLinhas.length - 1; i >= 0; i--) {
      ctx.fillText(subLinhas[i], pad, y)
      y -= subSize * 1.25
    }
    y -= 28
  } else {
    y -= gapAcimaCTA
  }

  // Headline (de baixo para cima)
  ctx.font = `800 ${headlineSize}px ${FONT_DISPLAY}`
  ctx.fillStyle = '#ffffff'
  for (let i = linhas.length - 1; i >= 0; i--) {
    ctx.fillText(linhas[i], pad, y)
    y -= lhHead
  }

  // Barrinha coral acima da headline
  y -= 8
  ctx.fillStyle = CORAL
  roundRect(ctx, pad, y - 20, 96, 8, 4)
  ctx.fill()

  return await canvas.encode('jpeg', 92)
}

// ---- helpers de desenho ----

function pintarGradiente(ctx, W, H) {
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, W, H)
  const g = ctx.createRadialGradient(W * 0.72, H * 0.24, 0, W * 0.72, H * 0.24, W * 1.1)
  g.addColorStop(0, NAVY_600)
  g.addColorStop(1, NAVY)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

function drawCover(ctx, img, W, H) {
  const r = Math.max(W / img.width, H / img.height)
  const w = img.width * r
  const h = img.height * r
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
}

function desenharWordmark(ctx, x, y) {
  const s = 68
  ctx.fillStyle = CORAL
  roundRect(ctx, x, y, s, s, 18)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 40px ${FONT_DISPLAY}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText('P', x + s / 2, y + s / 2 + 2)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.font = `800 46px ${FONT_DISPLAY}`
  const tx = x + s + 18
  const ty = y + s / 2 + 16
  ctx.fillStyle = '#ffffff'
  ctx.fillText('People', tx, ty)
  const wPeople = ctx.measureText('People').width
  ctx.fillStyle = CORAL
  ctx.fillText('Hub', tx + wPeople, ty)
}

function desenharCtaEhandle(ctx, x, y, cta, _tipo) {
  let cursor = x
  if (cta) {
    ctx.font = `600 32px ${FONT_BODY}`
    const padX = 34
    const w = ctx.measureText(cta).width + padX * 2
    const h = 68
    ctx.fillStyle = CORAL
    roundRect(ctx, x, y, w, h, h / 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'middle'
    ctx.fillText(cta, x + padX, y + h / 2 + 2)
    ctx.textBaseline = 'alphabetic'
    cursor = x + w + 24
  }
  ctx.font = `600 30px ${FONT_BODY}`
  ctx.fillStyle = 'rgba(255,255,255,0.78)'
  ctx.fillText(HANDLE(), cursor, y + 44)
}

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
