// Publicação no Instagram via "Instagram API with Instagram Login"
// (graph.instagram.com) — o tipo de token da conta @peoplehubrh (IGAA...).
// Fluxo de 2 passos: cria o container de mídia a partir de uma image_url
// PÚBLICA e depois publica. Feed e Stories usam o mesmo fluxo (stories com
// media_type=STORIES).

const GRAPH = 'https://graph.instagram.com/v22.0'

export async function publicarInstagram({ imageUrl, caption, type }) {
  const igUser = process.env.IG_USER_ID
  const token = process.env.IG_ACCESS_TOKEN
  if (!igUser || !token) return { ok: false, error: 'Faltam IG_USER_ID/IG_ACCESS_TOKEN.' }
  if (!imageUrl) return { ok: false, error: 'Sem URL pública da imagem (rode na nuvem/GitHub Actions).' }

  // 1) Criar container
  const p = new URLSearchParams({ image_url: imageUrl, access_token: token })
  if (type === 'story') p.set('media_type', 'STORIES')
  else if (caption) p.set('caption', caption)

  const c = await fetch(`${GRAPH}/${igUser}/media`, { method: 'POST', body: p })
  const cj = await c.json()
  if (!c.ok || !cj.id) return { ok: false, error: `container: ${JSON.stringify(cj).slice(0, 300)}` }

  // 2) Esperar o container ficar pronto (imagens costumam ser instantâneas)
  const pronto = await esperarContainer(cj.id, token)
  if (!pronto.ok) return pronto

  // 3) Publicar
  const pp = new URLSearchParams({ creation_id: cj.id, access_token: token })
  const pub = await fetch(`${GRAPH}/${igUser}/media_publish`, { method: 'POST', body: pp })
  const pj = await pub.json()
  if (!pub.ok || !pj.id) return { ok: false, error: `publish: ${JSON.stringify(pj).slice(0, 300)}` }

  return { ok: true, mediaId: pj.id }
}

async function esperarContainer(creationId, token, tentativas = 10) {
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(`${GRAPH}/${creationId}?fields=status_code&access_token=${token}`)
    const j = await r.json()
    if (j.status_code === 'FINISHED') return { ok: true }
    if (j.status_code === 'ERROR') return { ok: false, error: 'container em ERROR' }
    await new Promise((res) => setTimeout(res, 3000))
  }
  return { ok: false, error: 'container não ficou pronto a tempo' }
}
