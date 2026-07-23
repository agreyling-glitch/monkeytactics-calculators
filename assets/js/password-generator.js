/* ========================================================================
   MonkeyTactics.com — Password Generator logic
   Pure functions, fully unit-testable. No DOM access here.
   ======================================================================== */

const CHARSETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}|;:,.<>?"
};

/**
 * Generate a random password using crypto.getRandomValues.
 * @param {object} options
 * @param {number} options.length      - password length (min 4, max 128)
 * @param {boolean} options.uppercase   - include uppercase letters
 * @param {boolean} options.lowercase   - include lowercase letters
 * @param {boolean} options.digits     - include digits
 * @param {boolean} options.symbols     - include symbols
 * @param {boolean} options.excludeAmbiguous - exclude ambiguous chars like l, 1, I, O, 0
 * @returns {string} generated password
 * @throws {Error} if no character sets are selected
 */
export function generatePassword(options) {
  const length = Math.min(128, Math.max(4, options.length || 16));

  const useSets = [];
  if (options.uppercase !== false) useSets.push(CHARSETS.uppercase);
  if (options.lowercase !== false) useSets.push(CHARSETS.lowercase);
  if (options.digits !== false) useSets.push(CHARSETS.digits);
  if (options.symbols) useSets.push(CHARSETS.symbols);

  if (useSets.length === 0) {
    throw new Error("At least one character set must be selected");
  }

  const AMBIGUOUS = new Set("Il1O0");
  let pool = "";
  const requiredChars = []; // one from each set to guarantee inclusion

  for (const set of useSets) {
    const filtered = options.excludeAmbiguous
      ? set.split("").filter((c) => !AMBIGUOUS.has(c)).join("")
      : set;
    if (filtered.length === 0) continue;
    pool += filtered;
    requiredChars.push(filtered);
  }

  if (pool.length === 0) {
    throw new Error("No characters available after filtering");
  }

  // Pick one guaranteed char from each set
  const chars = requiredChars.map((set) =>
    set[cryptoRandom(set.length)]
  );

  // Fill the rest randomly from the full pool
  const remaining = length - chars.length;
  for (let i = 0; i < remaining; i++) {
    chars.push(pool[cryptoRandom(pool.length)]);
  }

  // Fisher-Yates shuffle (crypto-secure swaps)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = cryptoRandom(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

/**
 * Estimate password entropy in bits.
 * @param {number} length
 * @param {number} poolSize - size of the character pool used
 * @returns {number} entropy bits
 */
export function estimateEntropy(length, poolSize) {
  if (poolSize <= 0 || length <= 0) return 0;
  return Math.floor(length * Math.log2(poolSize));
}

/**
 * Return a strength label based on entropy bits.
 * @param {number} bits
 * @returns {{ label: string, color: string, percent: number }}
 */
export function getStrengthLabel(bits) {
  if (bits < 28) return { label: "Very Weak", color: "#dc2626", percent: 10 };
  if (bits < 36) return { label: "Weak", color: "#ea580c", percent: 25 };
  if (bits < 60) return { label: "Fair", color: "#d97706", percent: 50 };
  if (bits < 80) return { label: "Strong", color: "#16a34a", percent: 75 };
  return { label: "Very Strong", color: "#15803d", percent: 100 };
}

/** Crypto-secure random integer in [0, max). */
function cryptoRandom(max) {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}
