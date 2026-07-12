export interface RegexPreset {
  id: string;
  label: string;
  pattern: string;
  flags: string;
  description: string;
  sample: string;
}

export const REGEX_PRESETS: RegexPreset[] = [
  {
    id: "email",
    label: "E-mail",
    pattern: "[\\w.+-]+@[\\w-]+\\.[\\w.-]+",
    flags: "g",
    description: "Endereços de e-mail",
    sample: "Contato: contato@exemplo.com.br ou suporte@empresa.com",
  },
  {
    id: "url",
    label: "URL",
    pattern: "https?:\\/\\/[\\w.-]+(?:\\.[\\w.-]+)+[\\w\\-._~:/?#[\\]@!$&'()*+,;=.]*",
    flags: "g",
    description: "URLs http/https",
    sample: "Acesse https://exemplo.com/pagina?x=1 para mais informações.",
  },
  {
    id: "cpf",
    label: "CPF",
    pattern: "\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}",
    flags: "g",
    description: "CPF formatado (000.000.000-00)",
    sample: "CPF: 123.456.789-00",
  },
  {
    id: "cnpj",
    label: "CNPJ",
    pattern: "\\d{2}\\.\\d{3}\\.\\d{3}\\/\\d{4}-\\d{2}",
    flags: "g",
    description: "CNPJ formatado (00.000.000/0000-00)",
    sample: "CNPJ: 12.345.678/0001-99",
  },
  {
    id: "phone-br",
    label: "Telefone BR",
    pattern: "\\(?\\d{2}\\)?\\s?9?\\d{4}-?\\d{4}",
    flags: "g",
    description: "Telefone brasileiro com DDD",
    sample: "Ligue para (11) 91234-5678 ou 11 3456-7890",
  },
  {
    id: "cep",
    label: "CEP",
    pattern: "\\d{5}-?\\d{3}",
    flags: "g",
    description: "CEP brasileiro (00000-000)",
    sample: "CEP: 01310-100",
  },
  {
    id: "hex-color",
    label: "Cor hexadecimal",
    pattern: "#(?:[0-9a-fA-F]{3}){1,2}\\b",
    flags: "g",
    description: "Cores em hexadecimal (#fff ou #ffffff)",
    sample: "cor: #1a2b3c; fundo: #FFF;",
  },
  {
    id: "ipv4",
    label: "IPv4",
    pattern: "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b",
    flags: "g",
    description: "Endereços IPv4",
    sample: "Servidor em 192.168.0.1, DNS 8.8.8.8",
  },
  {
    id: "date-br",
    label: "Data (DD/MM/AAAA)",
    pattern: "\\d{2}\\/\\d{2}\\/\\d{4}",
    flags: "g",
    description: "Datas no formato brasileiro",
    sample: "Entrega prevista para 10/07/2026",
  },
];
