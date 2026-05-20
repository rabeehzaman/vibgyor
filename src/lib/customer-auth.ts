// ─── CUSTOMER AUTH UTILITIES ─────────────────

export function generateCustomerUserId(): string {
  return `cu_${Date.now()}`;
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(
  password: string,
  salt: string,
  storedHash: string
): Promise<boolean> {
  const hash = await hashPassword(password, salt);
  return hash === storedHash;
}

// PIN uses the same salted-SHA-256 scheme as the password, with a separate salt.
export const hashPin = hashPassword;
export const verifyPin = verifyPassword;

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
