interface PasswordOptions {
  size?: number;
  useEspecialCharacters?: boolean;
  useNumbers?: boolean;
  useUppercase?: boolean;
  useSmallCase?: boolean;
}

export function generatePassword(options: PasswordOptions = {}): string {
  const {
    size = 10,
    useEspecialCharacters = true,
    useNumbers = true,
    useUppercase = true,
    useSmallCase = true,
  } = options;

  const chars = "abcdefghijklmnopqrstuvwxyz";
  const specials = "!@#$%^&*()_+{}|:<>?-=[];,./";
  const numbers = "0123456789";
  const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  let allChars = "";
  if (useSmallCase) allChars += chars;
  if (useEspecialCharacters) allChars += specials;
  if (useNumbers) allChars += numbers;
  if (useUppercase) allChars += uppercaseChars;

  if (allChars.length === 0) {
    return "";
  }

  let password = "";
  for (let i = 0; i < size; i++) {
    const randomIndex = Math.floor(Math.random() * allChars.length);
    password += allChars[randomIndex];
  }

  return password;
}
