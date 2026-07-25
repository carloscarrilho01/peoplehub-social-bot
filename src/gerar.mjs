// Converte o alvo do botão ("feed"/"story"/"ambos") em lista de tipos.
export function tiposDoAlvo(alvo) {
  if (alvo === 'feed') return ['feed']
  if (alvo === 'story') return ['story']
  if (alvo === 'ambos') return ['feed', 'story']
  return []
}
