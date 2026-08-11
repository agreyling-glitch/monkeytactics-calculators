const ASCII_SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?";
const SECONDS_PER_YEAR = 31_556_952;
const COLLISION_SAMPLE_SIZE = 1_000_000_000;
export const PWNED_RANGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const PWNED_RANGE_CACHE_MAX_ENTRIES = 100;
const PWNED_RANGE_CACHE_DB = "monkeytactics-password-check";
const PWNED_RANGE_CACHE_STORE = "ranges";
const PWNED_RANGE_CACHE_MAX_RESPONSE_LENGTH = 100_000;

function characterType(character) {
  if (character.codePointAt(0) > 0x7f) return "unicode";
  if (/[a-z]/.test(character)) return "lowercase";
  if (/[A-Z]/.test(character)) return "uppercase";
  if (/[0-9]/.test(character)) return "digits";
  return "symbols";
}

// Numerical Recipes approximation, accurate enough for lightweight diagnostics.
function erfc(value) {
  const z = Math.abs(value);
  const t = 1 / (1 + z / 2);
  const result = t * Math.exp(
    -z * z - 1.26551223 + t * (
      1.00002368 + t * (
        0.37409196 + t * (
          0.09678418 + t * (
            -0.18628806 + t * (
              0.27886807 + t * (
                -1.13520398 + t * (
                  1.48851587 + t * (-0.82215223 + t * 0.17087277)
                )
              )
            )
          )
        )
      )
    )
  );
  return value >= 0 ? result : 2 - result;
}

function chiSquareUpperTail(statistic, degreesOfFreedom) {
  if (degreesOfFreedom <= 0) return 1;
  const transformed = (
    Math.cbrt(statistic / degreesOfFreedom) - (1 - 2 / (9 * degreesOfFreedom))
  ) / Math.sqrt(2 / (9 * degreesOfFreedom));
  return Math.max(0, Math.min(1, 0.5 * erfc(transformed / Math.SQRT2)));
}

function diagnosticStatus(pValue, sufficientData = true) {
  if (!sufficientData) return "needs-data";
  return pValue >= 0.01 ? "pass" : "review";
}

function binaryDiagnostics(value) {
  // Raw UTF-8 contains structural prefix bits, so use the least-significant
  // code-point bit as a balanced binary projection of each character choice.
  const bits = Array.from(value).map((character) => character.codePointAt(0) & 1);
  const bitCount = bits.length;
  const ones = bits.reduce((sum, bit) => sum + bit, 0);
  const zeroes = bitCount - ones;
  const monobitPValue = bitCount
    ? erfc(Math.abs(ones - zeroes) / Math.sqrt(2 * bitCount))
    : 0;
  const proportion = bitCount ? ones / bitCount : 0;
  const balanceSuitable = bitCount > 0 && Math.abs(proportion - 0.5) < 2 / Math.sqrt(bitCount);
  let runs = 0;
  bits.forEach((bit, index) => {
    if (index === 0 || bit !== bits[index - 1]) runs += 1;
  });
  const denominator = 2 * Math.sqrt(2 * bitCount) * proportion * (1 - proportion);
  const expectedRuns = 2 * bitCount * proportion * (1 - proportion);
  const runsPValue = balanceSuitable && denominator > 0
    ? erfc(Math.abs(runs - expectedRuns) / denominator)
    : 0;
  const enoughBits = bitCount >= 100;

  return {
    bitCount,
    ones,
    zeroes,
    monobit: {
      pValue: monobitPValue,
      status: diagnosticStatus(monobitPValue, enoughBits)
    },
    runs: {
      count: runs,
      expected: expectedRuns,
      pValue: runsPValue,
      status: diagnosticStatus(runsPValue, enoughBits && balanceSuitable)
    }
  };
}

function collisionEstimate(log10Space) {
  if (!Number.isFinite(log10Space)) {
    return { sampleSize: COLLISION_SAMPLE_SIZE, probability: 0, log10Probability: -Infinity };
  }
  const log10Pairs = Math.log10(COLLISION_SAMPLE_SIZE * (COLLISION_SAMPLE_SIZE - 1) / 2);
  const log10Lambda = log10Pairs - log10Space;
  if (log10Lambda < -6) {
    return {
      sampleSize: COLLISION_SAMPLE_SIZE,
      probability: 10 ** log10Lambda,
      log10Probability: log10Lambda
    };
  }
  const lambda = log10Lambda > 3 ? Infinity : 10 ** log10Lambda;
  const probability = lambda === Infinity ? 1 : -Math.expm1(-lambda);
  return {
    sampleSize: COLLISION_SAMPLE_SIZE,
    probability,
    log10Probability: probability > 0 ? Math.log10(probability) : -Infinity
  };
}

/**
 * Analyze a generated credential by Unicode code point.
 * Observed entropy is the zero-order Shannon entropy of the sample itself.
 */
export function analyzeCredential(value) {
  const characters = Array.from(String(value || ""));
  const distribution = {
    lowercase: 0,
    uppercase: 0,
    digits: 0,
    symbols: 0,
    unicode: 0
  };
  const frequencies = new Map();
  const unicodeCharacters = new Set();

  characters.forEach((character) => {
    frequencies.set(character, (frequencies.get(character) || 0) + 1);
    const type = characterType(character);
    distribution[type] += 1;
    if (type === "unicode") unicodeCharacters.add(character);
  });

  const observedEntropy = characters.length
    ? [...frequencies.values()].reduce((entropy, count) => {
        const probability = count / characters.length;
        return entropy - probability * Math.log2(probability);
      }, 0)
    : 0;

  let estimatedPoolSize = 0;
  if (distribution.lowercase) estimatedPoolSize += 26;
  if (distribution.uppercase) estimatedPoolSize += 26;
  if (distribution.digits) estimatedPoolSize += 10;
  if (distribution.symbols) estimatedPoolSize += ASCII_SYMBOLS.length;
  if (distribution.unicode) estimatedPoolSize += unicodeCharacters.size;

  const expectedFrequency = estimatedPoolSize ? characters.length / estimatedPoolSize : 0;
  const observedChiSquare = expectedFrequency
    ? [...frequencies.values()].reduce(
        (sum, count) => sum + ((count - expectedFrequency) ** 2) / expectedFrequency,
        0
      ) + (estimatedPoolSize - frequencies.size) * expectedFrequency
    : 0;
  const chiSquarePValue = chiSquareUpperTail(observedChiSquare, Math.max(0, estimatedPoolSize - 1));
  const indexOfCoincidence = characters.length > 1
    ? [...frequencies.values()].reduce((sum, count) => sum + count * (count - 1), 0)
      / (characters.length * (characters.length - 1))
    : 0;
  const expectedCoincidence = estimatedPoolSize ? 1 / estimatedPoolSize : 0;
  const coincidenceNearExpected = expectedCoincidence > 0
    && Math.abs(indexOfCoincidence - expectedCoincidence) <= Math.max(expectedCoincidence * 0.5, 2 / Math.max(1, characters.length));
  const theoreticalEntropy = estimatedPoolSize > 0 ? Math.log2(estimatedPoolSize) : 0;
  const log10Space = estimatedPoolSize > 0 ? characters.length * Math.log10(estimatedPoolSize) : -Infinity;
  const log10SecondsPerYear = Math.log10(SECONDS_PER_YEAR);
  const binary = binaryDiagnostics(String(value || ""));

  return {
    length: characters.length,
    uniqueCharacters: frequencies.size,
    distribution,
    observedEntropy,
    theoreticalEntropy,
    estimatedPoolSize,
    diagnostics: {
      chiSquare: {
        statistic: observedChiSquare,
        degreesOfFreedom: Math.max(0, estimatedPoolSize - 1),
        pValue: chiSquarePValue,
        status: diagnosticStatus(chiSquarePValue, expectedFrequency >= 5)
      },
      monobit: binary.monobit,
      runs: binary.runs,
      indexOfCoincidence: {
        value: indexOfCoincidence,
        expected: expectedCoincidence,
        status: characters.length < 100 ? "needs-data" : (coincidenceNearExpected ? "pass" : "review")
      },
      bitCount: binary.bitCount
    },
    bruteForce: {
      log10Space,
      entropyBits: theoreticalEntropy * characters.length,
      estimates: [
        { guessesPerSecond: 1e12, log10Years: log10Space - 12 - log10SecondsPerYear },
        { guessesPerSecond: 1e18, log10Years: log10Space - 18 - log10SecondsPerYear }
      ]
    },
    collision: collisionEstimate(log10Space),
    heatmap: characters.slice(0, 256).map((character, index) => ({
      character,
      index,
      codePoint: character.codePointAt(0),
      type: characterType(character)
    }))
  };
}

/**
 * Create the uppercase SHA-1 digest required by the Pwned Passwords range API.
 * The password is encoded and hashed entirely in the caller's browser.
 */
export async function sha1Hex(value, cryptoApi = globalThis.crypto) {
  if (!cryptoApi?.subtle) throw new Error("Secure hashing is unavailable in this browser");
  const bytes = new TextEncoder().encode(String(value));
  const digest = await cryptoApi.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Local cache request failed"));
  });
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Local cache transaction failed"));
    transaction.onabort = () => reject(transaction.error || new Error("Local cache transaction was cancelled"));
  });
}

function openPwnedRangeCache(indexedDb) {
  if (!indexedDb?.open) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(PWNED_RANGE_CACHE_DB, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.objectStoreNames.contains(PWNED_RANGE_CACHE_STORE)
        ? request.transaction.objectStore(PWNED_RANGE_CACHE_STORE)
        : database.createObjectStore(PWNED_RANGE_CACHE_STORE, { keyPath: "prefix" });
      if (!store.indexNames.contains("lastAccessed")) {
        store.createIndex("lastAccessed", "lastAccessed");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Local cache is unavailable"));
    request.onblocked = () => reject(new Error("Local cache upgrade was blocked"));
  });
}

/**
 * Device-local cache for anonymous Pwned Passwords range responses.
 * It never stores a password, full password hash, or selected match.
 */
export function createPwnedRangeCache(
  indexedDb = globalThis.indexedDB,
  {
    ttlMs = PWNED_RANGE_CACHE_TTL_MS,
    maxEntries = PWNED_RANGE_CACHE_MAX_ENTRIES,
    now = () => Date.now()
  } = {}
) {
  let databasePromise;
  const getDatabase = () => {
    if (!databasePromise) databasePromise = openPwnedRangeCache(indexedDb);
    return databasePromise;
  };

  return {
    async get(prefix) {
      const database = await getDatabase();
      if (!database) return null;
      const transaction = database.transaction(PWNED_RANGE_CACHE_STORE, "readwrite");
      const complete = transactionComplete(transaction);
      const store = transaction.objectStore(PWNED_RANGE_CACHE_STORE);
      const record = await requestResult(store.get(prefix));
      const currentTime = now();
      if (!record || currentTime - record.fetchedAt >= ttlMs || record.fetchedAt > currentTime) {
        if (record) store.delete(prefix);
        await complete;
        return null;
      }
      store.put({ ...record, lastAccessed: currentTime });
      await complete;
      return { responseText: record.responseText, fetchedAt: record.fetchedAt };
    },

    async set(prefix, responseText) {
      if (typeof responseText !== "string" || responseText.length > PWNED_RANGE_CACHE_MAX_RESPONSE_LENGTH) return;
      const database = await getDatabase();
      if (!database) return;
      const transaction = database.transaction(PWNED_RANGE_CACHE_STORE, "readwrite");
      const complete = transactionComplete(transaction);
      const store = transaction.objectStore(PWNED_RANGE_CACHE_STORE);
      const currentTime = now();
      store.put({ prefix, responseText, fetchedAt: currentTime, lastAccessed: currentTime });
      const records = await requestResult(store.getAll());
      records
        .sort((left, right) => right.lastAccessed - left.lastAccessed)
        .slice(Math.max(1, maxEntries))
        .forEach((record) => store.delete(record.prefix));
      await complete;
    }
  };
}

const defaultPwnedRangeCache = createPwnedRangeCache();

/**
 * Check a password with k-anonymity: only the first five SHA-1 characters
 * leave the browser. The returned range is filtered locally to exact matches.
 */
export async function checkPwnedPassword(
  value,
  fetchImpl = globalThis.fetch,
  cryptoApi = globalThis.crypto,
  cache = defaultPwnedRangeCache
) {
  const password = String(value);
  if (!password) throw new Error("Enter a password before checking for a breach");

  const hash = await sha1Hex(password, cryptoApi);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  let cachedRange = null;
  try {
    cachedRange = await cache?.get(prefix);
  } catch {
    cachedRange = null;
  }

  let responseText = cachedRange?.responseText;
  let fetchedAt = cachedRange?.fetchedAt;
  const cacheHit = typeof responseText === "string";
  if (!cacheHit) {
    if (typeof fetchImpl !== "function") throw new Error("Breach checking is unavailable in this browser");
    const response = await fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: "GET",
      headers: { "Add-Padding": "true" }
    });
    if (!response.ok) throw new Error("The breach service is temporarily unavailable");
    responseText = await response.text();
    fetchedAt = Date.now();
    try {
      await cache?.set(prefix, responseText);
    } catch {
      // Browser privacy settings or storage limits can disable caching.
    }
  }

  const matches = responseText
    .split(/\r?\n/)
    .map((line) => line.trim().match(/^([A-F0-9]{35}):(\d+)$/i))
    .filter((match) => match && match[1].toUpperCase() === suffix && Number(match[2]) > 0)
    .map((match) => ({ suffix: match[1].toUpperCase(), count: Number(match[2]) }));

  return { prefix, matches, cacheHit, fetchedAt };
}
