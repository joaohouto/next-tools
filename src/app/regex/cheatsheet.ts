export interface CheatsheetToken {
  token: string;
  label: string;
  description: string;
}

export interface CheatsheetGroup {
  title: string;
  tokens: CheatsheetToken[];
}

export const CHEATSHEET_GROUPS: CheatsheetGroup[] = [
  {
    title: "Classes",
    tokens: [
      { token: "\\d", label: "\\d", description: "Dígito (0-9)" },
      { token: "\\D", label: "\\D", description: "Não-dígito" },
      { token: "\\w", label: "\\w", description: "Letra, número ou _" },
      { token: "\\W", label: "\\W", description: "Não é letra/número/_" },
      { token: "\\s", label: "\\s", description: "Espaço em branco" },
      { token: "\\S", label: "\\S", description: "Não é espaço" },
      { token: ".", label: ".", description: "Qualquer caractere (exceto quebra de linha)" },
    ],
  },
  {
    title: "Quantificadores",
    tokens: [
      { token: "*", label: "*", description: "0 ou mais" },
      { token: "+", label: "+", description: "1 ou mais" },
      { token: "?", label: "?", description: "0 ou 1" },
      { token: "{n}", label: "{n}", description: "Exatamente n vezes" },
      { token: "{n,}", label: "{n,}", description: "n ou mais vezes" },
      { token: "{n,m}", label: "{n,m}", description: "Entre n e m vezes" },
    ],
  },
  {
    title: "Âncoras",
    tokens: [
      { token: "^", label: "^", description: "Início da linha/string" },
      { token: "$", label: "$", description: "Fim da linha/string" },
      { token: "\\b", label: "\\b", description: "Fronteira de palavra" },
      { token: "\\B", label: "\\B", description: "Não é fronteira de palavra" },
    ],
  },
  {
    title: "Grupos e classes",
    tokens: [
      { token: "()", label: "( )", description: "Grupo de captura" },
      { token: "(?:)", label: "(?: )", description: "Grupo sem captura" },
      { token: "(?<nome>)", label: "(?<nome> )", description: "Grupo nomeado" },
      { token: "[]", label: "[ ]", description: "Classe de caracteres" },
      { token: "[^]", label: "[^ ]", description: "Negação de classe" },
      { token: "|", label: "|", description: "Alternância (ou)" },
    ],
  },
];
