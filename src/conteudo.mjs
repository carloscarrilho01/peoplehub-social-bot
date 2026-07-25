// Gera o briefing de um post (texto + prompt de imagem) a partir de um pilar.
// Usa a IA da OpenAI (gpt-4o-mini) quando OPENAI_API_KEY existe; senão cai num
// fallback determinístico baseado no próprio pilar, para o fluxo nunca travar.

const HASHTAGS_BASE = '#RH #GestãoDePessoas #DepartamentoPessoal #PeopleHub #RHtech'

export async function gerarBriefing(pilar, tipo) {
  if (!process.env.OPENAI_API_KEY) return fallback(pilar, tipo)

  const formato =
    tipo === 'story'
      ? 'STORY vertical (9:16). Headline com no máximo 6 palavras, bem direto. CTA curto ("Toque aqui", "Saiba mais").'
      : 'POST de FEED (quadrado). Headline com no máximo 8 palavras. CTA de conversão ("Agende uma demonstração").'

  const prompt = `Você é o social media do PeopleHub, um SaaS de RH brasileiro para empresas médias e grandes (folha de pagamento, ponto, recrutamento, benefícios, férias, clima/eNPS, desempenho). Tom: profissional, próximo, confiante, sem jargão vazio. Português do Brasil. O post é sempre SOBRE o PeopleHub.

Crie UM post de Instagram para este pilar:
- Pilar: ${pilar.nome}
- Ângulo: ${pilar.angulo}
- Exemplo de referência (não copie): ${pilar.exemplo}

Formato: ${formato}

Responda em JSON com estas chaves (todas string):
- "tema": "${pilar.nome}"
- "headline": texto ESTAMPADO na arte, curto e impactante.
- "subheadline": uma linha de apoio (pode ser vazia).
- "cta": chamada para ação curta.
- "caption": legenda do post (2 a 5 linhas), SEM hashtags e SEM repetir a headline literalmente. No máximo 1 emoji.
- "hashtags": 4 a 8 hashtags de RH separadas por espaço, incluindo #PeopleHub.
- "imagePrompt": descrição EM INGLÊS da CENA de fundo, específica e conectada ao tema (1 a 2 frases, concreta e visual). Escolha o formato que melhor combina com ESTE post: use "modern flat vector illustration" para cenas de pessoas/trabalho de RH, OU "abstract geometric composition, no people" para algo mais conceitual/minimalista. Coloque o ponto de interesse na parte de CIMA/centro e deixe a parte de BAIXO calma e vazia (é onde entra o texto). NÃO descreva texto, números, logos nem telas de interface — só a cena.`

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.85,
        max_tokens: 700,
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!resp.ok) {
      console.error('[conteudo] OpenAI', resp.status, (await resp.text()).slice(0, 200))
      return fallback(pilar, tipo)
    }
    const j = await resp.json()
    const content = j.choices?.[0]?.message?.content
    if (!content) return fallback(pilar, tipo)
    const p = JSON.parse(content)
    return {
      tema: p.tema || pilar.nome,
      headline: (p.headline || pilar.exemplo).trim(),
      subheadline: (p.subheadline || '').trim(),
      cta: (p.cta || 'Conheça o PeopleHub').trim(),
      caption: (p.caption || pilar.exemplo).trim(),
      hashtags: (p.hashtags || HASHTAGS_BASE).trim(),
      imagePrompt: (p.imagePrompt || fundoPadrao()).trim(),
    }
  } catch (e) {
    console.error('[conteudo] OpenAI falhou, usando fallback:', e?.message || e)
    return fallback(pilar, tipo)
  }
}

function fundoPadrao() {
  return 'abstract geometric composition, no people, flowing rounded shapes, soft gradients and gentle light, visual interest in the upper area'
}

function fallback(pilar, tipo) {
  return {
    tema: pilar.nome,
    headline: pilar.exemplo,
    subheadline: tipo === 'story' ? '' : 'RH estratégico começa aqui.',
    cta: tipo === 'story' ? 'Saiba mais' : 'Agende uma demonstração',
    caption: `${pilar.exemplo}\n\nO PeopleHub reúne folha, ponto, recrutamento, benefícios e desempenho numa plataforma só. Tire a rotina do RH do modo manual.`,
    hashtags: HASHTAGS_BASE,
    imagePrompt: fundoPadrao(),
  }
}
