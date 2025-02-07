export function generatePassword(options: any) {
  // Definindo as opções padrão caso não sejam fornecidas
  const defaultOptions = {
    size: 10,
    useEspecialCharacters: true,
    useNumbers: true,
    useUppercase: true,
    useSmallCase: true,
  };

  // Mesclando as opções fornecidas com as opções padrão
  options = { ...defaultOptions, ...options };

  // Criando os conjuntos de caracteres possíveis com base nas opções
  let chars = "abcdefghijklmnopqrstuvwxyz";
  let specials = "!@#$%^&*()_+{}|:<>?-=[];,./";
  let numbers = "0123456789";
  let uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  let allChars = "";
  if (options.useSmallCase) allChars += chars;
  if (options.useEspecialCharacters) allChars += specials;
  if (options.useNumbers) allChars += numbers;
  if (options.useUppercase) allChars += uppercaseChars;

  if (allChars.length === 0) {
    return "😝";
  }

  // Gerando a senha
  let password = "";
  for (let i = 0; i < options.size; i++) {
    const randomIndex = Math.floor(Math.random() * allChars.length);
    password += allChars[randomIndex];
  }

  return password;
}
