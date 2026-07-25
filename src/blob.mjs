// Armazenamento no Vercel Blob: hospeda a imagem final (URL pública que o
// Instagram consegue baixar) e um JSON com os dados do post (para a etapa de
// aprovação recuperar legenda/URL/tipo). Substitui o commit no GitHub +
// state.json usados na versão GitHub Actions.
import { put, list } from '@vercel/blob'

export async function subirImagem(id, buffer) {
  const { url } = await put(`posts/${id}.jpg`, buffer, {
    access: 'public',
    contentType: 'image/jpeg',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return url
}

export async function salvarPost(post) {
  await put(`state/${post.id}.json`, JSON.stringify(post), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

export async function carregarPost(id) {
  const { blobs } = await list({ prefix: `state/${id}.json` })
  if (!blobs.length) return null
  const r = await fetch(blobs[0].url + `?t=${Date.now()}`)
  return r.ok ? await r.json() : null
}
