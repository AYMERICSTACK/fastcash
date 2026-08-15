import bcrypt from "bcryptjs";

const MIN_PASSWORD_LENGTH = 8;

export function normalizeCustomerEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function validateCustomerPassword(password: unknown) {
  const value = String(password || "");
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  }
  return null;
}

export async function hashCustomerPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyCustomerPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
