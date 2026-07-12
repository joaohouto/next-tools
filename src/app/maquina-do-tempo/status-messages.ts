export const SEQUENCE_MESSAGES = [
  "Calibrando eixo temporal…",
  "Sincronizando com o contínuo espaço-tempo…",
  "Aquecendo o fluxo capacitor…",
  "Convertendo matéria em plutônio…",
  "Verificando paradoxos…",
  "Ajustando coordenadas espaço-temporais…",
  "Compensando a curvatura do espaço-tempo…",
  "Estabilizando o campo de contenção…",
  "Consultando o almanaque esportivo…",
  "Recalculando a rota (91 km/h detectados)…",
];

export const NOTHING_HAPPENED_MESSAGES = [
  "Nada aconteceu.",
  "Isso não deveria estar aqui.",
  "🤷",
  "Hmm, melhor não mexer nisso de novo.",
  "Você ouviu isso?",
  "Provavelmente não fazia nada mesmo.",
];

export function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
