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

const COMMON_WORDS = Object.freeze((
  "acorn actor airfield almond anchor animal apple apron archer arrow artist " +
  "autumn badge baker bamboo banana basket beach beacon berry bicycle bird " +
  "blanket blossom blue boat bottle branch brave breeze bridge brook button " +
  "cabin cactus candle canyon captain castle cedar cherry circle cloud clover " +
  "coast comet coral cotton creek cricket crown crystal daisy dancer dawn " +
  "desert diamond dolphin dragon dream eagle earth ember engine falcon feather " +
  "field firefly flame flower forest fox frost garden giant ginger glacier " +
  "globe grape green guitar harbor hazel heron hill honey horse island ivory " +
  "jacket jasmine jewel journey jungle kettle kiwi lantern lemon lighthouse " +
  "lilac lion lotus maple meadow melon meteor mint mirror monkey moon mountain " +
  "mouse muffin mushroom ocean olive orange orchid otter owl panda paper peach " +
  "pearl pebble pepper phoenix piano pine planet plum pocket pond poppy pumpkin " +
  "rabbit rainbow raven river robin rocket rose sail salmon shadow shell silver " +
  "sky sparrow spice spring star stone storm summit sunflower sunset tiger " +
  "timber train tulip turtle valley velvet violet walnut waterfall wave whale " +
  "willow wind winter wolf woodland zebra"
).split(" "));

const OFFENSIVE_WORDS = new Set([
  "arse", "ass", "bastard", "bitch", "bollock", "crap", "damn", "dick",
  "fuck", "hell", "penis", "piss", "prick", "shit", "slut", "vagina", "whore"
]);

const dictionaryCache = new Map();
const DICTIONARY_BASE = "/assets/data/words/";
const DICTIONARY_SUFFIX = ".enable-sowpods.v1.txt.gz";

/**
 * Generate a random password using crypto.getRandomValues.
 * @param {object} options
 * @param {number} options.length      - password length (min 4, max 2048)
 * @param {boolean} options.uppercase   - include uppercase letters
 * @param {boolean} options.lowercase   - include lowercase letters
 * @param {boolean} options.digits     - include digits
 * @param {boolean} options.symbols     - include symbols
 * @param {number} options.minDigits    - minimum digit count (1–10 when enabled)
 * @param {number} options.minSymbols   - minimum symbol count (1–10 when enabled)
 * @param {boolean} options.excludeAmbiguous - exclude ambiguous chars like l, 1, I, O, 0
 * @param {boolean} options.noDuplicates - prevent repeated characters
 * @param {string} options.word          - include this contiguous word
 * @param {string} options.beginsWith    - begin the password with this text
 * @param {string} options.endsWith      - end the password with this text
 * @returns {string} generated password
 * @throws {Error} if no character sets are selected
 */
export function generatePassword(options) {
  const length = Math.min(2048, Math.max(4, options.length || 16));
  const minDigits = Math.min(10, Math.max(1, Math.floor(Number(options.minDigits) || 1)));
  const minSymbols = Math.min(10, Math.max(1, Math.floor(Number(options.minSymbols) || 1)));
  const beginsWith = String(options.beginsWith || "").slice(0, 32);
  const endsWith = String(options.endsWith || "").slice(0, 32);
  const word = String(options.word || "").trim().slice(0, 32);
  const fixedText = beginsWith + word + endsWith;
  const noDuplicates = Boolean(options.noDuplicates);

  const useSets = [];
  if (options.uppercase !== false) useSets.push({ name: "uppercase letters", characters: CHARSETS.uppercase, minimum: 1 });
  if (options.lowercase !== false) useSets.push({ name: "lowercase letters", characters: CHARSETS.lowercase, minimum: 1 });
  if (options.digits !== false) useSets.push({ name: "numbers", characters: CHARSETS.digits, minimum: minDigits });
  if (options.symbols) useSets.push({ name: "special characters", characters: CHARSETS.symbols, minimum: minSymbols });

  if (useSets.length === 0) {
    throw new Error("At least one character set must be selected");
  }

  const AMBIGUOUS = new Set("Il1O0");
  if (options.excludeAmbiguous && [...fixedText].some((character) => AMBIGUOUS.has(character))) {
    throw new Error("Begins With, Ends With, and Add Word cannot contain similar characters while that option is enabled");
  }
  if (noDuplicates && new Set(fixedText).size !== fixedText.length) {
    throw new Error("Begins With, Ends With, and Add Word contain duplicate characters");
  }
  if (fixedText.length > length) {
    throw new Error("Password length is too short for Begins With, Ends With, and Add Word");
  }

  let pool = "";
  const requiredSets = [];

  for (const set of useSets) {
    const filtered = options.excludeAmbiguous
      ? set.characters.split("").filter((c) => !AMBIGUOUS.has(c)).join("")
      : set.characters;
    if (filtered.length === 0) continue;
    pool += filtered;
    const alreadyIncluded = [...fixedText].filter((character) => filtered.includes(character)).length;
    requiredSets.push({
      name: set.name,
      characters: filtered,
      minimum: Math.max(0, set.minimum - alreadyIncluded)
    });
  }

  if (pool.length === 0) {
    throw new Error("No characters available after filtering");
  }

  const randomLength = length - fixedText.length;
  const requiredCount = requiredSets.reduce((total, set) => total + set.minimum, 0);
  if (requiredCount > randomLength) {
    throw new Error(`Password length must be at least ${fixedText.length + requiredCount} for the selected options`);
  }

  const chars = [];
  const usedCharacters = new Set(fixedText);
  requiredSets.forEach((set) => {
    for (let index = 0; index < set.minimum; index += 1) {
      const available = noDuplicates
        ? [...set.characters].filter((character) => !usedCharacters.has(character))
        : [...set.characters];
      if (!available.length) {
        throw new Error(`Not enough unique ${set.name} for the selected minimum`);
      }
      const character = randomItem(available);
      chars.push(character);
      usedCharacters.add(character);
    }
  });

  const remaining = randomLength - chars.length;
  for (let i = 0; i < remaining; i++) {
    const available = noDuplicates
      ? [...pool].filter((character) => !usedCharacters.has(character))
      : [...pool];
    if (!available.length) {
      throw new Error("Password length exceeds the available unique characters");
    }
    const character = randomItem(available);
    chars.push(character);
    usedCharacters.add(character);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = cryptoRandom(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  if (word) {
    const insertAt = cryptoRandom(chars.length + 1);
    chars.splice(insertAt, 0, word);
  }
  return beginsWith + chars.join("") + endsWith;
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
  if (!Number.isSafeInteger(max) || max < 1) {
    throw new Error("Random range must be a positive integer");
  }
  const arr = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do {
    crypto.getRandomValues(arr);
  } while (arr[0] >= limit);
  return arr[0] % max;
}

function randomItem(items) {
  if (!items.length) throw new Error("No words are available with these filters");
  return items[cryptoRandom(items.length)];
}

function titleCase(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function filterDictionaryWords(words, options = {}) {
  const excludeOffensive = options.excludeOffensive !== false;
  return words.filter((word) => {
    const normalized = word.trim().toLowerCase();
    return /^[a-z]{4,10}$/.test(normalized) &&
      (!excludeOffensive || !OFFENSIVE_WORDS.has(normalized));
  });
}

async function decodeDictionaryResponse(response) {
  if (!response.ok) {
    throw new Error(`Dictionary request failed with status ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (!isGzip) return new TextDecoder().decode(bytes);
  if (!("DecompressionStream" in window)) {
    throw new Error("This browser does not support the bundled dictionary format");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

async function loadDictionaryChunk(letter) {
  if (!dictionaryCache.has(letter)) {
    const request = fetch(`${DICTIONARY_BASE}${letter}${DICTIONARY_SUFFIX}`)
      .then(decodeDictionaryResponse)
      .then((text) => text.split(/\r?\n/).map((word) => word.trim().toLowerCase()).filter(Boolean));
    dictionaryCache.set(letter, request);
  }
  return dictionaryCache.get(letter);
}

/**
 * Return a passphrase word pool. The default curated pool removes extremely
 * obscure terms; disabling that filter draws from bundled ENABLE/SOWPODS data.
 */
export async function getPassphraseWordPool(options = {}) {
  if (options.excludeObscure !== false) {
    return filterDictionaryWords(COMMON_WORDS, options);
  }

  const letters = "abcdefghijklmnopqrstuvwxyz".split("");
  const selected = [];
  while (selected.length < 5) {
    const letter = randomItem(letters);
    if (!selected.includes(letter)) selected.push(letter);
  }
  const chunks = await Promise.all(selected.map(loadDictionaryChunk));
  return filterDictionaryWords(chunks.flat(), options);
}

/**
 * Generate an XKCD-style passphrase from a supplied word pool.
 */
export function generatePassphrase(options, wordPool) {
  const count = Math.min(12, Math.max(3, Number(options.wordCount) || 4));
  const separator = String(options.separator ?? "-").slice(0, 3);
  const words = [];
  for (let index = 0; index < count; index += 1) {
    let word = randomItem(wordPool);
    if (options.capitalize) word = titleCase(word);
    words.push(word);
  }
  if (options.includeNumber) {
    words.push(String(cryptoRandom(10000)).padStart(4, "0"));
  }
  return words.join(separator);
}

export function estimatePassphraseEntropy(wordCount, poolSize, includeNumber) {
  if (poolSize < 1) return 0;
  return Math.floor((wordCount * Math.log2(poolSize)) + (includeNumber ? Math.log2(10000) : 0));
}

export function generateRandomUsername(options = {}, wordPool = COMMON_WORDS) {
  let username = randomItem(filterDictionaryWords(wordPool, { excludeOffensive: true }));
  if (options.capitalize) username = titleCase(username);
  if (options.includeNumber) username += String(cryptoRandom(10000)).padStart(4, "0");
  return username;
}

export function generatePlusAddress(email, wordPool = COMMON_WORDS) {
  const value = String(email || "").trim();
  const match = value.match(/^([^@\s]+)@([^@\s]+\.[^@\s]+)$/);
  if (!match) throw new Error("Enter a valid email address");
  const baseLocalPart = match[1].split("+")[0];
  const tag = randomItem(filterDictionaryWords(wordPool, { excludeOffensive: true }));
  return `${baseLocalPart}+${tag}${String(cryptoRandom(100)).padStart(2, "0")}@${match[2].toLowerCase()}`;
}

export function generateCatchAllEmail(domain, wordPool = COMMON_WORDS) {
  const normalized = String(domain || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^@/, "");
  if (!/^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(normalized)) {
    throw new Error("Enter a valid domain name, such as example.com");
  }
  return `${generateRandomUsername({ includeNumber: true }, wordPool)}@${normalized}`;
}
