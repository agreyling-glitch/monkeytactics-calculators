const REVEAL_SIZE = Object.freeze([960, 540]);
const DURATIONS = Object.freeze({ calm: 8000, normal: 6500, dramatic: 5200 });
const LOOP_PAUSE_MS = 1500;
const BRAND_NAME = "Anagram Architect";
const BRAND_URL = "https://monkeytactics.com/tools/anagram-architect";

function lettersWithIdentity(text) {
  const counts = new Map();
  return [...text].flatMap((glyph, textIndex) => {
    if (!/[a-z]/i.test(glyph)) return [];
    const key = glyph.toLowerCase();
    const occurrence = counts.get(key) || 0;
    counts.set(key, occurrence + 1);
    return [{ key, occurrence, identity: `${key}-${occurrence}`, glyph, textIndex }];
  });
}

export function mapExactAnagramLetters(source, result) {
  const destinations = new Map();
  lettersWithIdentity(result).forEach((letter) => destinations.set(letter.identity, letter));
  return lettersWithIdentity(source).map((letter) => ({ ...letter, destination: destinations.get(letter.identity) || null }));
}

function ease(value) { return value < .5 ? 4 * value ** 3 : 1 - ((-2 * value + 2) ** 3) / 2; }
function clamp(value, low = 0, high = 1) { return Math.min(high, Math.max(low, value)); }
function seeded(identity) { return [...identity].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 997, 17) / 997; }

function fitFont(context, text, width, height) {
  let size = Math.min(height * .115, width * .095);
  context.font = `800 ${size}px Inter, system-ui, sans-serif`;
  while (size > 30 && context.measureText(text).width > width * .86) {
    size -= 2; context.font = `800 ${size}px Inter, system-ui, sans-serif`;
  }
  return size;
}

function glyphLayout(context, text, width, centerY, fontSize) {
  context.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
  const totalWidth = context.measureText(text).width;
  let x = (width - totalWidth) / 2;
  const positions = new Map();
  [...text].forEach((glyph, index) => {
    const glyphWidth = context.measureText(glyph).width;
    positions.set(index, { x: x + glyphWidth / 2, y: centerY, glyph });
    x += glyphWidth;
  });
  return positions;
}

function wrapText(context, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) { lines.push(line); line = word; }
    else line = candidate;
  });
  if (line) lines.push(line);
  return lines;
}

function drawFinalText(context, text, width, centerY, fontSize, alpha = 1) {
  context.save(); context.globalAlpha = alpha; context.fillStyle = "#f8fafc"; context.textAlign = "center"; context.textBaseline = "middle";
  context.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
  const lines = wrapText(context, text, width * .86);
  const lineHeight = fontSize * 1.14;
  lines.forEach((line, index) => context.fillText(line, width / 2, centerY + (index - (lines.length - 1) / 2) * lineHeight));
  context.restore();
}

function drawBackdrop(context, width, height) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#071421"); gradient.addColorStop(.58, "#102038"); gradient.addColorStop(1, "#0f172a");
  context.fillStyle = gradient; context.fillRect(0, 0, width, height);
}

function drawBranding(context, width, height) {
  context.save();
  context.fillStyle = "rgba(153,246,228,.78)";
  context.font = `700 ${Math.max(13, Math.round(width * .018))}px Inter, system-ui, sans-serif`;
  context.textAlign = "right";
  context.textBaseline = "bottom";
  context.fillText(BRAND_NAME, width - width * .035, height - height * .04);
  context.restore();
}

function drawParticles(context, x, y, identity, amount, width, height) {
  if (amount <= 0 || amount >= 1) return;
  const seed = seeded(identity);
  context.save();
  for (let index = 0; index < 6; index += 1) {
    const phase = seed * 19 + index * 1.73;
    const distance = (1 - amount) * width * (.008 + index * .003);
    const radius = Math.max(1.5, width * (.0017 + index * .00025)) * (1 - amount * .5);
    context.globalAlpha = .26 + (1 - Math.abs(.5 - amount) * 2) * .48;
    context.fillStyle = index % 2 ? "#f5b942" : "#5eead4";
    context.beginPath();
    context.arc(x + Math.cos(phase + amount * 7) * distance, y + Math.sin(phase + amount * 6) * distance + height * .012 * (1 - amount), radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function wandPoint(progress, width, height, centerY) {
  return {
    x: width * (.08 + progress * .84),
    y: centerY - height * (.16 + Math.sin(progress * Math.PI) * .16)
  };
}

function drawWand(context, progress, width, height, centerY) {
  const point = wandPoint(progress, width, height, centerY);
  const trailStart = Math.max(0, progress - .28);
  context.save();
  context.lineCap = "round";
  context.beginPath();
  for (let step = 0; step <= 18; step += 1) {
    const trailProgress = trailStart + (progress - trailStart) * step / 18;
    const trailPoint = wandPoint(trailProgress, width, height, centerY);
    if (!step) context.moveTo(trailPoint.x, trailPoint.y); else context.lineTo(trailPoint.x, trailPoint.y);
  }
  context.shadowColor = "#5eead4"; context.shadowBlur = width * .025;
  context.strokeStyle = "rgba(153,246,228,.58)"; context.lineWidth = Math.max(2, width * .004); context.stroke();
  context.shadowColor = "#f5b942"; context.shadowBlur = width * .018;
  context.strokeStyle = "rgba(254,240,138,.9)"; context.lineWidth = Math.max(1, width * .0015); context.stroke();
  context.shadowBlur = width * .02; context.fillStyle = "#fff7cc";
  context.beginPath(); context.arc(point.x, point.y, Math.max(4, width * .006), 0, Math.PI * 2); context.fill();
  context.shadowBlur = width * .012; context.strokeStyle = "#cbd5e1"; context.lineWidth = Math.max(4, width * .006);
  context.beginPath(); context.moveTo(point.x - width * .055, point.y + height * .09); context.lineTo(point.x - width * .008, point.y + height * .014); context.stroke();
  context.strokeStyle = "#8b5e3c"; context.lineWidth = Math.max(5, width * .008);
  context.beginPath(); context.moveTo(point.x - width * .08, point.y + height * .13); context.lineTo(point.x - width * .054, point.y + height * .09); context.stroke();
  for (let spark = 0; spark < 10; spark += 1) {
    const angle = spark * 2.399 + progress * 8;
    const radius = width * (.008 + (spark % 4) * .006);
    context.globalAlpha = .35 + (spark % 3) * .2;
    context.fillStyle = spark % 2 ? "#f5b942" : "#99f6e4";
    context.beginPath(); context.arc(point.x + Math.cos(angle) * radius, point.y + Math.sin(angle) * radius, Math.max(1.5, width * .0025), 0, Math.PI * 2); context.fill();
  }
  context.restore();
}

function drawWandFlash(context, progress, width, height, centerY) {
  const strength = 1 - clamp(Math.abs(progress - .7) / .055);
  if (strength <= 0) return;
  const gradient = context.createRadialGradient(width / 2, centerY, 0, width / 2, centerY, width * .34);
  gradient.addColorStop(0, `rgba(255,247,204,${strength * .24})`);
  gradient.addColorStop(.45, `rgba(94,234,212,${strength * .1})`);
  gradient.addColorStop(1, "rgba(94,234,212,0)");
  context.fillStyle = gradient; context.fillRect(0, 0, width, height);
}

function drawBlueprintGrid(context, width, height, progress) {
  const fade = progress < .82 ? clamp(progress / .14) : 1 - clamp((progress - .82) / .12);
  if (fade <= 0) return;
  const spacing = Math.max(28, Math.round(width / 24));
  context.save(); context.globalAlpha = fade;
  context.strokeStyle = "rgba(96,165,250,.12)"; context.lineWidth = 1;
  for (let x = spacing; x < width; x += spacing) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = spacing; y < height; y += spacing) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
  context.strokeStyle = "rgba(94,234,212,.22)"; context.lineWidth = 1.5;
  context.beginPath(); context.moveTo(width / 2, 0); context.lineTo(width / 2, height); context.moveTo(0, height / 2); context.lineTo(width, height / 2); context.stroke();
  context.restore();
}

function drawBlueprintGuides(context, mapping, sourcePositions, targetPositions, progress, width) {
  context.save(); context.setLineDash([5, 6]); context.lineWidth = Math.max(1, width * .0012);
  mapping.forEach((letter, index) => {
    if (!letter.destination) return;
    const from = sourcePositions.get(letter.textIndex); const to = targetPositions.get(letter.destination.textIndex);
    const laneY = from.y + context.canvas.height * (index % 2 ? -.18 : .18) * (.55 + index % 4 * .12);
    context.globalAlpha = .08 + (index % 3) * .035; context.strokeStyle = index % 2 ? "#60a5fa" : "#2dd4bf";
    context.beginPath(); context.moveTo(from.x, from.y); context.lineTo(from.x, laneY); context.lineTo(to.x, laneY); context.lineTo(to.x, to.y); context.stroke();
  });
  context.setLineDash([]); context.globalAlpha = .7;
  const measureY = context.canvas.height * .24;
  context.strokeStyle = "#60a5fa"; context.beginPath(); context.moveTo(width * .12, measureY); context.lineTo(width * (.12 + .76 * progress), measureY); context.stroke();
  context.restore();
}

function drawInspectionSweep(context, progress, width, height) {
  const sweep = clamp((progress - .68) / .15);
  if (sweep <= 0 || sweep >= 1) return;
  const x = width * (.08 + sweep * .84);
  const gradient = context.createLinearGradient(x - width * .08, 0, x + width * .02, 0);
  gradient.addColorStop(0, "rgba(45,212,191,0)"); gradient.addColorStop(.8, "rgba(45,212,191,.08)"); gradient.addColorStop(1, "rgba(253,230,138,.38)");
  context.save(); context.fillStyle = gradient; context.fillRect(x - width * .08, height * .12, width * .1, height * .7);
  context.strokeStyle = "rgba(253,230,138,.72)"; context.lineWidth = 2; context.beginPath(); context.moveTo(x, height * .12); context.lineTo(x, height * .82); context.stroke(); context.restore();
}

function drawStaticComparison(context, source, result) {
  const { width, height } = context.canvas;
  drawBackdrop(context, width, height);
  const sourceSize = fitFont(context, source, width, height) * .78;
  const resultSize = fitFont(context, result, width, height) * .78;
  context.save();
  context.fillStyle = "rgba(153,246,228,.72)";
  context.font = `800 ${Math.max(12, Math.round(width * .014))}px Inter, system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("BEFORE", width / 2, height * .14);
  drawFinalText(context, source, width, height * .29, sourceSize);
  context.strokeStyle = "rgba(45,212,191,.42)";
  context.lineWidth = Math.max(2, width * .002);
  context.beginPath(); context.moveTo(width * .41, height * .49); context.lineTo(width * .59, height * .49); context.stroke();
  context.fillStyle = "#f5b942";
  context.font = `800 ${Math.max(22, Math.round(width * .032))}px Inter, system-ui, sans-serif`;
  context.fillText("↓", width / 2, height * .49);
  context.fillStyle = "rgba(245,185,66,.82)";
  context.font = `800 ${Math.max(12, Math.round(width * .014))}px Inter, system-ui, sans-serif`;
  context.fillText("AFTER", width / 2, height * .62);
  context.restore();
  drawFinalText(context, result, width, height * .76, resultSize);
  drawBranding(context, width, height);
}

function renderFrame(context, source, result, settings, elapsed, duration) {
  const { width, height } = context.canvas;
  const progress = clamp(elapsed / duration);
  drawBackdrop(context, width, height);
  if (settings.style === "blueprint") drawBlueprintGrid(context, width, height, progress);
  const centerY = height * .47;
  const fontSize = Math.min(fitFont(context, source, width, height), fitFont(context, result, width, height));
  const sourcePositions = glyphLayout(context, source, width, centerY, fontSize);
  const targetPositions = glyphLayout(context, result, width, centerY, fontSize);
  const mapping = mapExactAnagramLetters(source, result);
  const moveStart = .25;
  const moveEnd = .66;
  const restoreEnd = .74;
  if (progress < moveStart) {
    drawFinalText(context, source, width, centerY, fontSize, progress < .16 ? 1 : 1 - (progress - .16) / .09 * .35);
  }
  if (progress >= moveStart && progress < restoreEnd) {
    const rawMove = clamp((progress - moveStart) / (moveEnd - moveStart));
    if (settings.style === "blueprint") drawBlueprintGuides(context, mapping, sourcePositions, targetPositions, rawMove, width);
    context.textAlign = "center"; context.textBaseline = "middle"; context.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
    mapping.forEach((letter, index) => {
      if (!letter.destination) return;
      const from = sourcePositions.get(letter.textIndex);
      const to = targetPositions.get(letter.destination.textIndex);
      const local = settings.style === "typewriter"
        ? clamp(rawMove * mapping.length - index)
        : settings.style === "wand"
          ? clamp(rawMove * 1.35 - index / Math.max(1, mapping.length - 1) * .35)
          : rawMove;
      let amount = ease(local);
      if (settings.style === "magnetic") amount = 1 + 1.65 * (local - 1) ** 3 + .65 * (local - 1) ** 2;
      let x = from.x + (to.x - from.x) * amount;
      let y = from.y + (to.y - from.y) * amount;
      const seed = seeded(letter.identity);
      if (settings.style === "fly") y += Math.sin(Math.PI * amount) * height * (.11 + seed * .08) * (seed > .5 ? 1 : -1);
      if (settings.style === "shuffle") { x += Math.sin(amount * Math.PI * 4 + seed * 6) * width * .035 * (1 - amount); y += Math.cos(amount * Math.PI * 3 + seed * 5) * height * .055 * (1 - amount); }
      if (settings.style === "wand") { x += Math.sin(amount * Math.PI * 3 + seed * 8) * width * .025 * (1 - amount); y -= Math.sin(Math.PI * amount) * height * (.15 + seed * .08) + Math.cos(amount * Math.PI * 4 + seed * 7) * height * .025 * (1 - amount); }
      if (settings.style === "blueprint") {
        const laneY = from.y + height * (index % 2 ? -.18 : .18) * (.55 + index % 4 * .12);
        if (amount < .28) { x = from.x; y = from.y + (laneY - from.y) * ease(amount / .28); }
        else if (amount < .74) { x = from.x + (to.x - from.x) * ease((amount - .28) / .46); y = laneY; }
        else { x = to.x; y = laneY + (to.y - laneY) * ease((amount - .74) / .26); }
      }
      drawParticles(context, x, y, letter.identity, amount, width, height);
      context.fillStyle = local < 1 ? "#99f6e4" : "#f8fafc";
      context.globalAlpha = settings.style === "typewriter" ? clamp(local * 2) : 1;
      context.fillText(letter.destination.glyph, x, y);
      if (settings.style === "blueprint" && local < .96) {
        context.globalAlpha = .72; context.fillStyle = "#93c5fd"; context.font = `700 ${Math.max(9, width * .011)}px ui-monospace, monospace`;
        context.fillText(String(index + 1).padStart(2, "0"), x + fontSize * .42, y - fontSize * .42);
        context.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
      }
    });
    context.globalAlpha = 1;
    if (settings.style === "wand") drawWand(context, rawMove, width, height, centerY);
  }
  if (settings.style === "wand") drawWandFlash(context, progress, width, height, centerY);
  if (progress >= moveEnd) drawFinalText(context, result, width, centerY, fontSize, clamp((progress - moveEnd) / (restoreEnd - moveEnd)));
  if (settings.style === "blueprint") drawInspectionSweep(context, progress, width, height);
  drawBranding(context, width, height);
}

export const ANAGRAM_ANIMATION_STYLES = Object.freeze(["blueprint", "wand", "fly", "shuffle", "magnetic", "typewriter"]);
export const ANAGRAM_ANIMATION_SPEEDS = Object.freeze({ ...DURATIONS });
export const ANAGRAM_ANIMATION_PAUSE = LOOP_PAUSE_MS;

export function renderAnagramAnimationFrame(canvas, source, result, { style = "blueprint", speed = "normal", elapsed = 0 } = {}) {
  if (canvas.width !== REVEAL_SIZE[0] || canvas.height !== REVEAL_SIZE[1]) [canvas.width, canvas.height] = REVEAL_SIZE;
  const safeStyle = ANAGRAM_ANIMATION_STYLES.includes(style) ? style : "blueprint";
  const safeSpeed = Object.hasOwn(DURATIONS, speed) ? speed : "normal";
  renderFrame(canvas.getContext("2d"), source, result, { style: safeStyle, speed: safeSpeed }, elapsed, DURATIONS[safeSpeed]);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function canvasBlob(canvas, type = "image/png") {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The local export could not be created.")), type));
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngTextChunk(keyword, value) {
  const data = new TextEncoder().encode(`${keyword}\0${value}`);
  const type = new TextEncoder().encode("tEXt");
  const chunk = new Uint8Array(12 + data.length); const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length); chunk.set(type, 4); chunk.set(data, 8); view.setUint32(8 + data.length, crc32(new Uint8Array([...type, ...data])));
  return chunk;
}

async function brandedPngBlob(canvas) {
  const original = new Uint8Array(await (await canvasBlob(canvas)).arrayBuffer());
  let offset = 8; let insertAt = original.length - 12;
  while (offset + 12 <= original.length) {
    const length = new DataView(original.buffer, original.byteOffset + offset, 4).getUint32(0);
    const type = String.fromCharCode(...original.slice(offset + 4, offset + 8));
    if (type === "IEND") { insertAt = offset; break; }
    offset += 12 + length;
  }
  const chunks = [
    pngTextChunk("Software", BRAND_NAME),
    pngTextChunk("URL", BRAND_URL)
  ];
  return new Blob([original.slice(0, insertAt), ...chunks, original.slice(insertAt)], { type: "image/png" });
}

function ebmlSize(length) {
  for (let bytes = 1; bytes <= 8; bytes += 1) {
    if (length < 2 ** (7 * bytes) - 1) {
      const result = new Uint8Array(bytes); let value = length;
      for (let index = bytes - 1; index >= 0; index -= 1) { result[index] = value & 255; value = Math.floor(value / 256); }
      result[0] |= 1 << (8 - bytes); return result;
    }
  }
  throw new Error("Metadata is too large.");
}

function ebmlElement(id, payload) {
  const bytes = payload instanceof Uint8Array ? payload : new TextEncoder().encode(payload);
  return new Uint8Array([...id, ...ebmlSize(bytes.length), ...bytes]);
}

function webmSimpleTag(name, value) {
  const tagName = ebmlElement([0x45, 0xa3], name);
  const tagValue = ebmlElement([0x44, 0x87], value);
  return ebmlElement([0x67, 0xc8], new Uint8Array([...tagName, ...tagValue]));
}

function readEbmlSize(bytes, offset) {
  const first = bytes[offset];
  let length = 1;
  while (length <= 8 && !(first & (1 << (8 - length)))) length += 1;
  if (length > 8 || offset + length > bytes.length) return null;
  const marker = 1 << (8 - length);
  let value = first & (marker - 1);
  let unknown = value === marker - 1;
  for (let index = 1; index < length; index += 1) { value = value * 256 + bytes[offset + index]; unknown = unknown && bytes[offset + index] === 255; }
  return { length, value, unknown };
}

function fixedEbmlSize(value, length) {
  const result = new Uint8Array(length); let remaining = value;
  for (let index = length - 1; index >= 0; index -= 1) { result[index] = remaining & 255; remaining = Math.floor(remaining / 256); }
  result[0] |= 1 << (8 - length);
  return result;
}

async function brandedWebmBlob(blob) {
  const tagsPayload = new Uint8Array([
    ...ebmlElement([0x73, 0x73], new Uint8Array([
      ...webmSimpleTag("TITLE", "Exact anagram reveal"),
      ...webmSimpleTag("ARTIST", BRAND_NAME),
      ...webmSimpleTag("ENCODER", BRAND_NAME),
      ...webmSimpleTag("URL", BRAND_URL),
      ...webmSimpleTag("COPYRIGHT", `${BRAND_NAME} · ${BRAND_URL}`),
      ...webmSimpleTag("COMMENT", "Every letter moves. Nothing appears. Nothing disappears.")
    ]))
  ]);
  const tags = ebmlElement([0x12, 0x54, 0xc3, 0x67], tagsPayload);
  const original = new Uint8Array(await blob.arrayBuffer());
  const segmentId = [0x18, 0x53, 0x80, 0x67];
  let segmentOffset = -1;
  for (let index = 0; index <= original.length - segmentId.length; index += 1) {
    if (segmentId.every((byte, part) => original[index + part] === byte)) { segmentOffset = index; break; }
  }
  if (segmentOffset < 0) return new Blob([original, tags], { type: blob.type || "video/webm" });
  const sizeOffset = segmentOffset + segmentId.length;
  const size = readEbmlSize(original, sizeOffset);
  if (!size || size.unknown) return new Blob([original, tags], { type: blob.type || "video/webm" });
  const segmentDataStart = sizeOffset + size.length;
  const segmentEnd = Math.min(original.length, segmentDataStart + size.value);
  const updatedSize = fixedEbmlSize(size.value + tags.length, size.length);
  return new Blob([
    original.slice(0, sizeOffset), updatedSize,
    original.slice(segmentDataStart, segmentEnd), tags,
    original.slice(segmentEnd)
  ], { type: blob.type || "video/webm" });
}

function revealFilename(result, extension) {
  const slug = result.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55) || "anagram-reveal";
  return `${slug}.${extension}`;
}

function createControl(label, control) {
  const wrap = document.createElement("label"); const text = document.createElement("span"); text.textContent = label; wrap.append(text, control); return wrap;
}

function optionSelect(values) {
  const select = document.createElement("select"); values.forEach(([value, label]) => { const option = document.createElement("option"); option.value = value; option.textContent = label; select.append(option); }); return select;
}

export function openAnagramReveal({ sourcePhrase, resultPhrase, originalRank = null }) {
  const dialog = document.createElement("dialog"); dialog.className = "anagram-reveal-modal"; dialog.setAttribute("aria-labelledby", "anagram-reveal-title");
  const shell = document.createElement("div"); shell.className = "anagram-reveal-shell";
  const header = document.createElement("header");
  const headingWrap = document.createElement("span"); const kicker = document.createElement("em"); kicker.textContent = "SHAREABLE EXACTNESS"; const heading = document.createElement("h2"); heading.id = "anagram-reveal-title"; heading.textContent = "Animated anagram reveal"; headingWrap.append(kicker, heading);
  const close = document.createElement("button"); close.type = "button"; close.textContent = "×"; close.setAttribute("aria-label", "Close animated reveal"); header.append(headingWrap, close);
  const canvas = document.createElement("canvas"); canvas.className = "anagram-reveal-canvas"; canvas.setAttribute("aria-label", `${sourcePhrase} rearranging into ${resultPhrase}`); canvas.setAttribute("role", "img");
  const controls = document.createElement("div"); controls.className = "anagram-reveal-controls";
  const style = optionSelect([["blueprint", "Blueprint"], ["wand", "Wand"], ["fly", "Fly"], ["shuffle", "Shuffle"], ["magnetic", "Magnetic"], ["typewriter", "Typewriter"]]);
  const speed = optionSelect([["calm", "Calm · 8 seconds"], ["normal", "Normal · 6.5 seconds"], ["dramatic", "Dramatic · 5.2 seconds"]]); speed.value = "normal";
  controls.append(createControl("Style", style), createControl("Speed", speed));
  const reduced = document.createElement("p"); reduced.className = "anagram-reveal-motion-note"; reduced.hidden = !matchMedia("(prefers-reduced-motion: reduce)").matches; reduced.textContent = "Reduced motion is enabled. Preview shows the static final card; downloads remain available.";
  const status = document.createElement("p"); status.className = "anagram-reveal-status"; status.setAttribute("aria-live", "polite");
  const exportProgress = document.createElement("div"); exportProgress.className = "anagram-reveal-export-progress"; exportProgress.hidden = true; exportProgress.setAttribute("role", "progressbar"); exportProgress.setAttribute("aria-label", "WebM export progress"); exportProgress.setAttribute("aria-valuemin", "0"); exportProgress.setAttribute("aria-valuemax", "100");
  const exportTrack = document.createElement("span"); const exportFill = document.createElement("i"); const exportValue = document.createElement("strong"); exportValue.textContent = "0%"; exportTrack.append(exportFill); exportProgress.append(exportTrack, exportValue);
  const actions = document.createElement("div"); actions.className = "anagram-reveal-actions";
  const video = document.createElement("button"); video.type = "button"; video.textContent = "Download WebM";
  const image = document.createElement("button"); image.type = "button"; image.textContent = "Download static card";
  const copy = document.createElement("button"); copy.type = "button"; copy.textContent = "Copy post text";
  const copyLink = document.createElement("button"); copyLink.type = "button"; copyLink.textContent = "Copy animation link";
  const share = document.createElement("button"); share.type = "button"; share.textContent = "Share…";
  actions.append(video, image, copy, copyLink, share);
  shell.append(header, canvas, controls, reduced, status, exportProgress, actions); dialog.append(shell); document.body.append(dialog);

  let animationId = 0;
  const settings = () => ({ style: style.value, speed: speed.value });
  const resize = () => { [canvas.width, canvas.height] = REVEAL_SIZE; };
  const draw = (elapsed) => { const config = settings(); renderFrame(canvas.getContext("2d"), sourcePhrase, resultPhrase, config, elapsed, DURATIONS[config.speed]); };
  const finalCard = () => { resize(); draw(DURATIONS[speed.value]); };
  const play = () => {
    cancelAnimationFrame(animationId); resize();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { finalCard(); status.textContent = "Static preview shown because reduced motion is enabled."; return; }
    const started = performance.now(); status.textContent = "Previewing locally · repeats after a 1.5-second hold.";
    const frame = (now) => {
      const cycleDuration = DURATIONS[speed.value];
      const cycleTime = (now - started) % (cycleDuration + LOOP_PAUSE_MS);
      draw(Math.min(cycleTime, cycleDuration));
      animationId = requestAnimationFrame(frame);
    };
    animationId = requestAnimationFrame(frame);
  };
  const postText = () => `${sourcePhrase} → ${resultPhrase}\n\nMade by Anagram Architect`;
  const animationUrl = () => {
    const url = new URL("/tools/anagram-animator", location.origin); url.searchParams.set("from", sourcePhrase); url.searchParams.set("to", resultPhrase); url.searchParams.set("style", style.value); url.searchParams.set("speed", speed.value); url.searchParams.set("focus", "1"); return url;
  };
  [style, speed].forEach((control) => control.addEventListener("change", play));
  image.addEventListener("click", async () => { cancelAnimationFrame(animationId); resize(); drawStaticComparison(canvas.getContext("2d"), sourcePhrase, resultPhrase); const blob = await brandedPngBlob(canvas); downloadBlob(blob, revealFilename(resultPhrase, "png")); status.textContent = "Before-and-after PNG created locally with attribution stored in metadata."; play(); });
  video.addEventListener("click", async () => {
    if (!window.MediaRecorder || !canvas.captureStream) { status.textContent = "WebM export is not supported by this browser. Download the static card instead."; return; }
    cancelAnimationFrame(animationId); resize(); video.disabled = true; exportProgress.hidden = false; exportProgress.setAttribute("aria-valuenow", "0"); exportFill.style.width = "0%"; exportValue.textContent = "0%"; status.textContent = "Rendering WebM locally…";
    const stream = canvas.captureStream(30); const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : undefined); const chunks = [];
    recorder.addEventListener("dataavailable", (event) => { if (event.data.size) chunks.push(event.data); });
    const complete = new Promise((resolve) => recorder.addEventListener("stop", resolve, { once: true })); recorder.start(250);
    const started = performance.now(); const cycleDuration = DURATIONS[speed.value]; const exportDuration = cycleDuration * 2 + LOOP_PAUSE_MS;
    await new Promise((resolve) => { const frame = (now) => { const elapsed = now - started; const percent = Math.min(100, Math.round(elapsed / exportDuration * 100)); exportProgress.setAttribute("aria-valuenow", String(percent)); exportFill.style.width = `${percent}%`; exportValue.textContent = `${percent}%`; const cycleTime = elapsed <= cycleDuration + LOOP_PAUSE_MS ? Math.min(elapsed, cycleDuration) : elapsed - cycleDuration - LOOP_PAUSE_MS; draw(Math.min(cycleTime, cycleDuration)); if (elapsed < exportDuration) requestAnimationFrame(frame); else resolve(); }; requestAnimationFrame(frame); });
    recorder.stop(); await complete; stream.getTracks().forEach((track) => track.stop());
    const encoded = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
    const branded = await brandedWebmBlob(encoded); downloadBlob(branded, revealFilename(resultPhrase, "webm")); video.disabled = false; exportProgress.setAttribute("aria-valuenow", "100"); exportFill.style.width = "100%"; exportValue.textContent = "100%"; status.textContent = "Repeating WebM created locally with standard attribution tags.";
  });
  copy.addEventListener("click", async () => { await navigator.clipboard.writeText(postText()); copy.textContent = "Copied"; status.textContent = "Post text copied."; setTimeout(() => { copy.textContent = "Copy post text"; }, 1200); });
  copyLink.addEventListener("click", async () => {
    const url = animationUrl();
    await navigator.clipboard.writeText(url.href); copyLink.textContent = "Link copied"; status.textContent = "Compact animation link copied."; setTimeout(() => { copyLink.textContent = "Copy animation link"; }, 1200);
  });
  share.addEventListener("click", async () => {
    const url = animationUrl().href;
    try {
      if (navigator.share) await navigator.share({ title: "Exact anagram reveal", text: postText(), url });
      else { await navigator.clipboard.writeText(`${postText()}\n\n${url}`); status.textContent = "Sharing is unavailable, so the animation link and post text were copied."; }
    } catch (error) { if (error?.name !== "AbortError") status.textContent = "Sharing was unavailable. Use Copy animation link instead."; }
  });
  const dismiss = () => { cancelAnimationFrame(animationId); dialog.close(); dialog.remove(); };
  close.addEventListener("click", dismiss); dialog.addEventListener("cancel", (event) => { event.preventDefault(); dismiss(); }); dialog.addEventListener("click", (event) => { if (event.target === dialog) dismiss(); });
  dialog.showModal(); play(); video.focus({ preventScroll: true });
}
