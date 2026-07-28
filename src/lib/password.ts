const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*()-_=+";

export type PasswordChecks = {
  length: boolean;
  lowercase: boolean;
  uppercase: boolean;
  digit: boolean;
  symbol: boolean;
};

export function checkPassword(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function passwordRequirementError(password: string): string | null {
  const checks = checkPassword(password);
  const missing: string[] = [];
  if (!checks.length) missing.push("8+ characters");
  if (!checks.lowercase) missing.push("a lowercase letter");
  if (!checks.uppercase) missing.push("an uppercase letter");
  if (!checks.digit) missing.push("a number");
  if (!checks.symbol) missing.push("a symbol");

  if (missing.length === 0) return null;
  return `Password needs ${missing.join(", ")}.`;
}

export type PasswordStrength = {
  score: number; // 0-4
  label: string;
  color: string;
};

const STRENGTH_LEVELS: Array<{ label: string; color: string }> = [
  { label: "Very weak", color: "#EF4444" },
  { label: "Weak", color: "#F97316" },
  { label: "Fair", color: "#EAB308" },
  { label: "Good", color: "#84CC16" },
  { label: "Strong", color: "#22C55E" },
];

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, ...STRENGTH_LEVELS[0] };

  const checks = checkPassword(password);
  let score = Object.values(checks).filter(Boolean).length - 1;
  if (password.length >= 12) score += 1;
  score = Math.max(0, Math.min(4, score));

  return { score, ...STRENGTH_LEVELS[score] };
}

export function generateSecurePassword(length = 16): string {
  const pools = [LOWER, UPPER, DIGITS, SYMBOLS];
  const all = pools.join("");
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  // Guarantee at least one character from each required pool, then fill the
  // rest randomly, then shuffle so the guaranteed picks aren't predictably
  // in the first four positions.
  const chars = pools.map(
    (pool, i) => pool[randomValues[i] % pool.length] as string,
  );
  for (let i = pools.length; i < length; i++) {
    chars.push(all[randomValues[i] % all.length] as string);
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomValues[i] % (i + 1);
    const tmp = chars[i] as string;
    chars[i] = chars[j] as string;
    chars[j] = tmp;
  }
  return chars.join("");
}
