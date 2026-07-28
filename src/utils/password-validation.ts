export type PasswordValidation = {
  isSecure: boolean;
  minLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
};

export function validatePassword(password: string): PasswordValidation {
  const minLength = password.length >= 6;
  const hasLetter = /[A-Za-zÀ-ÿ]/.test(password);
  const hasNumber = /\d/.test(password);

  return {
    isSecure: minLength && hasLetter && hasNumber,
    minLength,
    hasLetter,
    hasNumber,
  };
}

export function getPasswordSecurityMessage(password: string): string | null {
  if (!password) {
    return null;
  }

  const validation = validatePassword(password);
  if (validation.isSecure) {
    return null;
  }

  if (!validation.minLength) {
    return 'A senha deve ter pelo menos 6 caracteres';
  }
  if (!validation.hasLetter) {
    return 'A senha deve conter pelo menos uma letra';
  }
  if (!validation.hasNumber) {
    return 'A senha deve conter pelo menos um número';
  }

  return 'A senha não é segura';
}

export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}

export function getConfirmPasswordMessage(
  password: string,
  confirmPassword: string
): string | null {
  if (!confirmPassword) {
    return null;
  }
  if (!passwordsMatch(password, confirmPassword)) {
    return 'A senha e a confirmação devem ser iguais';
  }
  return null;
}

export const PASSWORD_MATCH_SUCCESS_MESSAGE = 'A senha e a confirmação são iguais';
