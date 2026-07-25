// Estado persistido em state.json (versionado no repositório). Guarda os posts
// pendentes de aprovação, o histórico e o último update do Telegram processado.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const CAMINHO = 'state.json'

export function carregar() {
  if (!existsSync(CAMINHO)) return { lastUpdateId: 0, pending: {}, history: [] }
  try {
    const s = JSON.parse(readFileSync(CAMINHO, 'utf8'))
    return { lastUpdateId: s.lastUpdateId || 0, pending: s.pending || {}, history: s.history || [] }
  } catch {
    return { lastUpdateId: 0, pending: {}, history: [] }
  }
}

export function salvar(state) {
  // Limita o histórico às 200 entradas mais recentes.
  const history = (state.history || []).slice(-200)
  writeFileSync(CAMINHO, JSON.stringify({ ...state, history }, null, 2) + '\n')
}
