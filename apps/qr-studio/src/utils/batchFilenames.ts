/** Allocate portable, case-insensitively unique base names for one ZIP. */
export function allocateBatchName(base: string, used: Set<string>): string {
  let clean = base.normalize("NFC").replace(/[. ]+$/g, "") || "qrcode";
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(clean)) clean = `qr-${clean}`;
  let candidate = clean;
  let suffix = 2;
  while (used.has(candidate.toLowerCase())) candidate = `${clean}-${suffix++}`;
  used.add(candidate.toLowerCase());
  return candidate;
}
