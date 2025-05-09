export const list = [
  `Comece o dia sorrindo! Essa atitude positiva terá o poder de ultrapassar os pequenos obstáculos diários!`,
  `A prosperidade existe quando mantemos a harmonia entre nossos sentimentos e atitudes.`,
  `A esperança é a melhor companhia, pois quem tem esperança, tem a prosperidade ao seu lado.`,
  `Enfrente os desafios de maneira clara e objetiva, pois o sucesso não conhece barreiras!`,
  `A felicidade deve ser uma conquista diária, e não um objetivo a longo prazo!`,
  `Somos responsáveis pelas coisas que fazemos, e também por aquilo que deixamos de fazer.`,
  `Ao vencer obstáculos você está caminhando em direção  à prosperidade.`,
  `A capacidade de realizar o "agora" é mais forte que a lembrança daquilo que ficou por realizar no "passado".`,
  `Sempre que precisar de um estímulo, olhe para trás e veja todas as suas conquistas.`,
  `A harmonia entre nossos sentimentos e atitudes nos mostra o caminho da prosperidade.`,
  `A verdadeira riqueza consiste no amor e na sabedoria de beneficiar o próximo.`,
  `Sonhos são apenas realidades ainda não concretizadas!`,
  `A felicidade depende apenas de nossa conduta. Deixe a sabedoria guiar seus passos e tenha uma vida feliz!`,
  `Sempre agradeça a todas as coisas, pois tudo é aprendizado!`,
  `Perdoar os erros do outros é a melhor lição de integridade que podemos ter!`,
  `A riqueza das pessoas deve ser avaliada pela qualidade dos seus atos.`,
  `Ter sonhos é saber que nossa capacidade de realização não conhece limites.`,
  `A paz está dentro de nós, não à nossa volta.`,
  `O tempo pode ser lento demais para quem espera, mas para quem ama, ele é eterno.`,
  `Bom humor é contagiante! Espalhe a alegria, e ela retornará em dobro para você!`,
  `Nossos atos presentes serão as marcas do nosso futuro, portanto depende apenas de nós o caminho que vamos seguir.`,
  `Seja feliz consigo mesmo, e todos a sua volta estarão felizes!`,
  `Ocupe seu tempo de maneira positiva: crescendo e desenvolvendo suas habildades!`,
  `Separe dez minutos diários para si mesmo! Aproveite esse momento para elogiar suas conquistas!`,
  `Ter resignação é saber que tudo tem o seu tempo certo para acontecer!`,
  `Nosso bem estar somente estará completo quando promovermos o bem estar dos outros.`,
  `Acredite na força que existe dentro de você e o caminho certo aparecerá.`,
  `Olhe sempre em frente! Os tropeços significam que você caminha e tem a capacidade de se reerguer!`,
  `A força de vontade é o melhor caminho para realizarmos os nossos sonhos.`,
  `Nossa paz interior está diretamente ligada à prática da caridade e na capacidade de entendermos o mundo exterior que nos rodeia.`,
  `O segredo da verdadeira amizade está no respeito mútuo das diferenças!`,
];

export function DailySaying() {
  const date = new Date();
  return <span>{list[date.getDate() - 1]}</span>;
}
