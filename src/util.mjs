// Utilitários pequenos: leitura de .env local, id curto e parse de args.
import { readFileSync, existsSync } from 'node:fs'

// Carrega um .env simples (KEY=VALUE) para process.env, sem dependência externa.
// Em GitHub Actions as variáveis já vêm do ambiente, então isto é só para uso local.
export function carregarEnvLocal(caminho = '.env') {
  if (!existsSync(caminho)) return
  const txt = readFileSync(caminho, 'utf8')
  for (const linha of txt.split('\n')) {
    const l = linha.trim()
    if (!l || l.startsWith('#')) continue
    const i = l.indexOf('=')
    if (i === -1) continue
    const k = l.slice(0, i).trim()
    const v = l.slice(i + 1).trim()
    if (k && process.env[k] === undefined) process.env[k] = v
  }
}

export function idCurto() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// Lê --feed N --story M da linha de comando.
export function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2)
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'
      out[key] = val
    }
  }
  return out
}

// Base pública das imagens. Em Actions, derivada do repositório; localmente,
// pode ser definida em REPO_RAW_BASE (senão fica null → publicação no IG
// avisará que precisa rodar na nuvem).
export function baseImagens() {
  if (process.env.REPO_RAW_BASE) return process.env.REPO_RAW_BASE.replace(/\/$/, '')
  const repo = process.env.GITHUB_REPOSITORY
  if (repo) {
    const branch = process.env.GITHUB_REF_NAME || 'main'
    return `https://raw.githubusercontent.com/${repo}/${branch}/posts`
  }
  return null
}
