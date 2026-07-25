// Pilares de conteúdo do @peoplehub — sempre SOBRE o sistema PeopleHub (SaaS de
// RH). Cada pilar tem um "ângulo" e um exemplo que guiam o Claude; não são
// textos finais.

export const PILARES = [
  {
    id: 'dica-rh',
    nome: 'Dica de RH',
    angulo: 'Ensina algo prático de RH/DP e conecta com um recurso do PeopleHub.',
    exemplo: 'Como calcular o turnover mensal sem erro (e o que o número esconde).',
  },
  {
    id: 'folha',
    nome: 'Folha de pagamento',
    angulo: 'O PeopleHub fecha a folha (INSS/IRRF/FGTS, adicional noturno, HE) em poucos cliques.',
    exemplo: 'Sua folha ainda mora numa planilha? Feche o mês em 1 etapa.',
  },
  {
    id: 'ponto',
    nome: 'Ponto e jornada',
    angulo: 'Ponto online/offline, comprovante Portaria 671 e banco de horas.',
    exemplo: 'Ponto offline no celular, com comprovante legal automático.',
  },
  {
    id: 'recrutamento',
    nome: 'Recrutamento (ATS)',
    angulo: 'Vagas públicas, triagem de currículo por IA e candidato → admissão sem redigitar.',
    exemplo: 'Do currículo à admissão sem digitar os dados duas vezes.',
  },
  {
    id: 'clima',
    nome: 'Clima e eNPS',
    angulo: 'Pesquisas de clima e eNPS para medir e agir sobre o engajamento.',
    exemplo: 'Seu time está engajado? Meça o eNPS em 2 perguntas.',
  },
  {
    id: 'ferias',
    nome: 'Férias e benefícios',
    angulo: 'Programação de férias com alerta de vencimento, custos e benefícios.',
    exemplo: 'Nunca mais deixe passar o vencimento de férias de um colaborador.',
  },
  {
    id: 'dado-mercado',
    nome: 'Dado de mercado',
    angulo: 'Um dado sobre RH/turnover/engajamento que gera reflexão e leva ao PeopleHub.',
    exemplo: 'Substituir um colaborador custa até 2x o salário dele.',
  },
  {
    id: 'novidade',
    nome: 'Novidade do produto',
    angulo: 'Comunica o jeito PeopleHub de resolver um problema de RH.',
    exemplo: 'Ache qualquer coisa no RH em 1 segundo com a paleta de comandos (Ctrl+K).',
  },
  {
    id: 'prova-social',
    nome: 'Resultado / confiança',
    angulo: 'Reforça confiança com tempo economizado e conformidade tranquila.',
    exemplo: 'Times de RH economizam horas por semana automatizando a rotina.',
  },
  {
    id: 'cultura',
    nome: 'Cultura / onboarding',
    angulo: 'Conecta cultura organizacional ao papel do RH e ao PeopleHub.',
    exemplo: 'Onboarding bem feito é o primeiro elogio que a empresa faz ao novo colaborador.',
  },
]

export function sortearPilares(qtd) {
  const copia = [...PILARES]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia.slice(0, Math.min(qtd, copia.length))
}
