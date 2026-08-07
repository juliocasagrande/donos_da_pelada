const COMMON_MASTER_PASSWORDS = new Set(["admin123", "password", "123456789", "dono-da-pelada"]);

export function getMasterPasswordIssues(password?: string | null) {
  if (!password) return ["variável não definida"];

  const issues: string[] = [];
  if (password.length < 12) issues.push("mínimo de 12 caracteres");
  if (!/\p{Ll}/u.test(password)) issues.push("uma letra minúscula");
  if (!/\p{Lu}/u.test(password)) issues.push("uma letra maiúscula");
  if (!/\p{N}/u.test(password)) issues.push("um número");
  if (!/[^\p{L}\p{N}]/u.test(password)) issues.push("um símbolo");
  if (COMMON_MASTER_PASSWORDS.has(password.toLowerCase())) issues.push("uma senha que não seja padrão");
  return issues;
}

export function isStrongMasterPassword(password?: string | null) {
  return getMasterPasswordIssues(password).length === 0;
}
