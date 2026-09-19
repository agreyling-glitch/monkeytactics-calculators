(function() {
	//#region assets/js/tools/anagram-architect/anagram-share-reveal.js
	var REVEAL_SIZE = Object.freeze([960, 540]);
	var DURATIONS = Object.freeze({
		calm: 8e3,
		normal: 6500,
		dramatic: 5200
	});
	var LOOP_PAUSE_MS = 1500;
	var BRAND_NAME = "Anagram Architect";
	function lettersWithIdentity(text) {
		const counts = /* @__PURE__ */ new Map();
		return [...text].flatMap((glyph, textIndex) => {
			if (!/[a-z]/i.test(glyph)) return [];
			const key = glyph.toLowerCase();
			const occurrence = counts.get(key) || 0;
			counts.set(key, occurrence + 1);
			return [{
				key,
				occurrence,
				identity: `${key}-${occurrence}`,
				glyph,
				textIndex
			}];
		});
	}
	function mapExactAnagramLetters(source, result) {
		const destinations = /* @__PURE__ */ new Map();
		lettersWithIdentity(result).forEach((letter) => destinations.set(letter.identity, letter));
		return lettersWithIdentity(source).map((letter) => ({
			...letter,
			destination: destinations.get(letter.identity) || null
		}));
	}
	function ease(value) {
		return value < .5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
	}
	function clamp(value, low = 0, high = 1) {
		return Math.min(high, Math.max(low, value));
	}
	function seeded(identity) {
		return [...identity].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 997, 17) / 997;
	}
	function fitFont(context, text, width, height) {
		let size = Math.min(height * .115, width * .095);
		context.font = `800 ${size}px Inter, system-ui, sans-serif`;
		while (size > 30 && context.measureText(text).width > width * .86) {
			size -= 2;
			context.font = `800 ${size}px Inter, system-ui, sans-serif`;
		}
		return size;
	}
	function glyphLayout(context, text, width, centerY, fontSize) {
		context.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
		let x = (width - context.measureText(text).width) / 2;
		const positions = /* @__PURE__ */ new Map();
		[...text].forEach((glyph, index) => {
			const glyphWidth = context.measureText(glyph).width;
			positions.set(index, {
				x: x + glyphWidth / 2,
				y: centerY,
				glyph
			});
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
			if (line && context.measureText(candidate).width > maxWidth) {
				lines.push(line);
				line = word;
			} else line = candidate;
		});
		if (line) lines.push(line);
		return lines;
	}
	function drawFinalText(context, text, width, centerY, fontSize, alpha = 1) {
		context.save();
		context.globalAlpha = alpha;
		context.fillStyle = "#f8fafc";
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
		const lines = wrapText(context, text, width * .86);
		const lineHeight = fontSize * 1.14;
		lines.forEach((line, index) => context.fillText(line, width / 2, centerY + (index - (lines.length - 1) / 2) * lineHeight));
		context.restore();
	}
	function drawBackdrop(context, width, height) {
		const gradient = context.createLinearGradient(0, 0, width, height);
		gradient.addColorStop(0, "#071421");
		gradient.addColorStop(.58, "#102038");
		gradient.addColorStop(1, "#0f172a");
		context.fillStyle = gradient;
		context.fillRect(0, 0, width, height);
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
			const radius = Math.max(1.5, width * (.0017 + index * 25e-5)) * (1 - amount * .5);
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
			const trailPoint = wandPoint(trailStart + (progress - trailStart) * step / 18, width, height, centerY);
			if (!step) context.moveTo(trailPoint.x, trailPoint.y);
			else context.lineTo(trailPoint.x, trailPoint.y);
		}
		context.shadowColor = "#5eead4";
		context.shadowBlur = width * .025;
		context.strokeStyle = "rgba(153,246,228,.58)";
		context.lineWidth = Math.max(2, width * .004);
		context.stroke();
		context.shadowColor = "#f5b942";
		context.shadowBlur = width * .018;
		context.strokeStyle = "rgba(254,240,138,.9)";
		context.lineWidth = Math.max(1, width * .0015);
		context.stroke();
		context.shadowBlur = width * .02;
		context.fillStyle = "#fff7cc";
		context.beginPath();
		context.arc(point.x, point.y, Math.max(4, width * .006), 0, Math.PI * 2);
		context.fill();
		context.shadowBlur = width * .012;
		context.strokeStyle = "#cbd5e1";
		context.lineWidth = Math.max(4, width * .006);
		context.beginPath();
		context.moveTo(point.x - width * .055, point.y + height * .09);
		context.lineTo(point.x - width * .008, point.y + height * .014);
		context.stroke();
		context.strokeStyle = "#8b5e3c";
		context.lineWidth = Math.max(5, width * .008);
		context.beginPath();
		context.moveTo(point.x - width * .08, point.y + height * .13);
		context.lineTo(point.x - width * .054, point.y + height * .09);
		context.stroke();
		for (let spark = 0; spark < 10; spark += 1) {
			const angle = spark * 2.399 + progress * 8;
			const radius = width * (.008 + spark % 4 * .006);
			context.globalAlpha = .35 + spark % 3 * .2;
			context.fillStyle = spark % 2 ? "#f5b942" : "#99f6e4";
			context.beginPath();
			context.arc(point.x + Math.cos(angle) * radius, point.y + Math.sin(angle) * radius, Math.max(1.5, width * .0025), 0, Math.PI * 2);
			context.fill();
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
		context.fillStyle = gradient;
		context.fillRect(0, 0, width, height);
	}
	function drawBlueprintGrid(context, width, height, progress) {
		const fade = progress < .82 ? clamp(progress / .14) : 1 - clamp((progress - .82) / .12);
		if (fade <= 0) return;
		const spacing = Math.max(28, Math.round(width / 24));
		context.save();
		context.globalAlpha = fade;
		context.strokeStyle = "rgba(96,165,250,.12)";
		context.lineWidth = 1;
		for (let x = spacing; x < width; x += spacing) {
			context.beginPath();
			context.moveTo(x, 0);
			context.lineTo(x, height);
			context.stroke();
		}
		for (let y = spacing; y < height; y += spacing) {
			context.beginPath();
			context.moveTo(0, y);
			context.lineTo(width, y);
			context.stroke();
		}
		context.strokeStyle = "rgba(94,234,212,.22)";
		context.lineWidth = 1.5;
		context.beginPath();
		context.moveTo(width / 2, 0);
		context.lineTo(width / 2, height);
		context.moveTo(0, height / 2);
		context.lineTo(width, height / 2);
		context.stroke();
		context.restore();
	}
	function drawBlueprintGuides(context, mapping, sourcePositions, targetPositions, progress, width) {
		context.save();
		context.setLineDash([5, 6]);
		context.lineWidth = Math.max(1, width * .0012);
		mapping.forEach((letter, index) => {
			if (!letter.destination) return;
			const from = sourcePositions.get(letter.textIndex);
			const to = targetPositions.get(letter.destination.textIndex);
			const laneY = from.y + context.canvas.height * (index % 2 ? -.18 : .18) * (.55 + index % 4 * .12);
			context.globalAlpha = .08 + index % 3 * .035;
			context.strokeStyle = index % 2 ? "#60a5fa" : "#2dd4bf";
			context.beginPath();
			context.moveTo(from.x, from.y);
			context.lineTo(from.x, laneY);
			context.lineTo(to.x, laneY);
			context.lineTo(to.x, to.y);
			context.stroke();
		});
		context.setLineDash([]);
		context.globalAlpha = .7;
		const measureY = context.canvas.height * .24;
		context.strokeStyle = "#60a5fa";
		context.beginPath();
		context.moveTo(width * .12, measureY);
		context.lineTo(width * (.12 + .76 * progress), measureY);
		context.stroke();
		context.restore();
	}
	function drawInspectionSweep(context, progress, width, height) {
		const sweep = clamp((progress - .68) / .15);
		if (sweep <= 0 || sweep >= 1) return;
		const x = width * (.08 + sweep * .84);
		const gradient = context.createLinearGradient(x - width * .08, 0, x + width * .02, 0);
		gradient.addColorStop(0, "rgba(45,212,191,0)");
		gradient.addColorStop(.8, "rgba(45,212,191,.08)");
		gradient.addColorStop(1, "rgba(253,230,138,.38)");
		context.save();
		context.fillStyle = gradient;
		context.fillRect(x - width * .08, height * .12, width * .1, height * .7);
		context.strokeStyle = "rgba(253,230,138,.72)";
		context.lineWidth = 2;
		context.beginPath();
		context.moveTo(x, height * .12);
		context.lineTo(x, height * .82);
		context.stroke();
		context.restore();
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
		if (progress < moveStart) drawFinalText(context, source, width, centerY, fontSize, progress < .16 ? 1 : 1 - (progress - .16) / .09 * .35);
		if (progress >= moveStart && progress < restoreEnd) {
			const rawMove = clamp((progress - moveStart) / .41000000000000003);
			if (settings.style === "blueprint") drawBlueprintGuides(context, mapping, sourcePositions, targetPositions, rawMove, width);
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
			mapping.forEach((letter, index) => {
				if (!letter.destination) return;
				const from = sourcePositions.get(letter.textIndex);
				const to = targetPositions.get(letter.destination.textIndex);
				const local = settings.style === "typewriter" ? clamp(rawMove * mapping.length - index) : settings.style === "wand" ? clamp(rawMove * 1.35 - index / Math.max(1, mapping.length - 1) * .35) : rawMove;
				let amount = ease(local);
				if (settings.style === "magnetic") amount = 1 + 1.65 * (local - 1) ** 3 + .65 * (local - 1) ** 2;
				let x = from.x + (to.x - from.x) * amount;
				let y = from.y + (to.y - from.y) * amount;
				const seed = seeded(letter.identity);
				if (settings.style === "fly") y += Math.sin(Math.PI * amount) * height * (.11 + seed * .08) * (seed > .5 ? 1 : -1);
				if (settings.style === "shuffle") {
					x += Math.sin(amount * Math.PI * 4 + seed * 6) * width * .035 * (1 - amount);
					y += Math.cos(amount * Math.PI * 3 + seed * 5) * height * .055 * (1 - amount);
				}
				if (settings.style === "wand") {
					x += Math.sin(amount * Math.PI * 3 + seed * 8) * width * .025 * (1 - amount);
					y -= Math.sin(Math.PI * amount) * height * (.15 + seed * .08) + Math.cos(amount * Math.PI * 4 + seed * 7) * height * .025 * (1 - amount);
				}
				if (settings.style === "blueprint") {
					const laneY = from.y + height * (index % 2 ? -.18 : .18) * (.55 + index % 4 * .12);
					if (amount < .28) {
						x = from.x;
						y = from.y + (laneY - from.y) * ease(amount / .28);
					} else if (amount < .74) {
						x = from.x + (to.x - from.x) * ease((amount - .28) / .46);
						y = laneY;
					} else {
						x = to.x;
						y = laneY + (to.y - laneY) * ease((amount - .74) / .26);
					}
				}
				drawParticles(context, x, y, letter.identity, amount, width, height);
				context.fillStyle = local < 1 ? "#99f6e4" : "#f8fafc";
				context.globalAlpha = settings.style === "typewriter" ? clamp(local * 2) : 1;
				context.fillText(letter.destination.glyph, x, y);
				if (settings.style === "blueprint" && local < .96) {
					context.globalAlpha = .72;
					context.fillStyle = "#93c5fd";
					context.font = `700 ${Math.max(9, width * .011)}px ui-monospace, monospace`;
					context.fillText(String(index + 1).padStart(2, "0"), x + fontSize * .42, y - fontSize * .42);
					context.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
				}
			});
			context.globalAlpha = 1;
			if (settings.style === "wand") drawWand(context, rawMove, width, height, centerY);
		}
		if (settings.style === "wand") drawWandFlash(context, progress, width, height, centerY);
		if (progress >= moveEnd) drawFinalText(context, result, width, centerY, fontSize, clamp((progress - moveEnd) / .07999999999999996));
		if (settings.style === "blueprint") drawInspectionSweep(context, progress, width, height);
		drawBranding(context, width, height);
	}
	var ANAGRAM_ANIMATION_STYLES = Object.freeze([
		"blueprint",
		"wand",
		"fly",
		"shuffle",
		"magnetic",
		"typewriter"
	]);
	var ANAGRAM_ANIMATION_SPEEDS = Object.freeze({ ...DURATIONS });
	var ANAGRAM_ANIMATION_PAUSE = LOOP_PAUSE_MS;
	function renderAnagramAnimationFrame(canvas, source, result, { style = "blueprint", speed = "normal", elapsed = 0 } = {}) {
		if (canvas.width !== REVEAL_SIZE[0] || canvas.height !== REVEAL_SIZE[1]) [canvas.width, canvas.height] = REVEAL_SIZE;
		const safeStyle = ANAGRAM_ANIMATION_STYLES.includes(style) ? style : "blueprint";
		const safeSpeed = Object.hasOwn(DURATIONS, speed) ? speed : "normal";
		renderFrame(canvas.getContext("2d"), source, result, {
			style: safeStyle,
			speed: safeSpeed
		}, elapsed, DURATIONS[safeSpeed]);
	}
	//#endregion
	//#region assets/js/tools/anagram-animator/anagram-animator.js
	var form = document.querySelector("#anagram-animator-form");
	var sourceInput = document.querySelector("#anagram-animator-source");
	var resultInput = document.querySelector("#anagram-animator-result");
	var styleSelect = document.querySelector("#anagram-animator-style");
	var speedSelect = document.querySelector("#anagram-animator-speed");
	var repeatInput = document.querySelector("#anagram-animator-repeat");
	var canvas = document.querySelector("#anagram-animator-canvas");
	var status = document.querySelector("#anagram-animator-status");
	var playButton = document.querySelector("#anagram-animator-play");
	var copyButton = document.querySelector("#anagram-animator-copy");
	var embedButton = document.querySelector("#anagram-animator-embed");
	var focusButton = document.querySelector("#anagram-animator-focus");
	var animationId = 0;
	function letters(value) {
		return [...value.toLowerCase()].filter((character) => /[a-z]/.test(character)).sort().join("");
	}
	function exactPair() {
		const source = letters(sourceInput.value);
		return source.length > 1 && source === letters(resultInput.value);
	}
	function safeStyle(value) {
		return ANAGRAM_ANIMATION_STYLES.includes(value) ? value : "blueprint";
	}
	function safeSpeed(value) {
		return Object.hasOwn(ANAGRAM_ANIMATION_SPEEDS, value) ? value : "normal";
	}
	function booleanParam(value, fallback = true) {
		return value == null ? fallback : ![
			"0",
			"false",
			"no"
		].includes(value.toLowerCase());
	}
	function currentSettings() {
		return {
			source: sourceInput.value.trim(),
			result: resultInput.value.trim(),
			style: safeStyle(styleSelect.value),
			speed: safeSpeed(speedSelect.value),
			repeat: repeatInput.checked
		};
	}
	function shareUrl({ focus = new URLSearchParams(location.search).get("focus") === "1" } = {}) {
		const values = currentSettings();
		const url = new URL(location.href);
		url.search = "";
		url.searchParams.set("from", values.source);
		url.searchParams.set("to", values.result);
		url.searchParams.set("style", values.style);
		url.searchParams.set("speed", values.speed);
		if (!values.repeat) url.searchParams.set("repeat", "0");
		if (new URLSearchParams(location.search).get("embed") === "1") url.searchParams.set("embed", "1");
		else if (focus) url.searchParams.set("focus", "1");
		return url;
	}
	function embedUrl() {
		const url = shareUrl({ focus: false });
		url.searchParams.delete("focus");
		url.searchParams.set("embed", "1");
		return url;
	}
	function embedCode() {
		return `<iframe src="${embedUrl().href}" title="Animated exact anagram reveal" loading="lazy" style="width:100%;aspect-ratio:16/9;border:0" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
	}
	function updateUrl() {
		if (exactPair()) history.replaceState(null, "", shareUrl());
	}
	function stop() {
		cancelAnimationFrame(animationId);
		animationId = 0;
	}
	function setFocusMode(enabled) {
		if (document.documentElement.classList.contains("animator-embed")) return;
		document.documentElement.classList.toggle("animator-focus", enabled);
		focusButton.setAttribute("aria-pressed", String(enabled));
		const url = new URL(location.href);
		if (enabled) url.searchParams.set("focus", "1");
		else url.searchParams.delete("focus");
		history.replaceState(null, "", url);
	}
	function play() {
		stop();
		if (!exactPair()) {
			status.textContent = "The before and after phrases must use exactly the same letters.";
			status.dataset.state = "error";
			return;
		}
		const settings = currentSettings();
		const duration = ANAGRAM_ANIMATION_SPEEDS[settings.speed];
		const started = performance.now();
		if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
			renderAnagramAnimationFrame(canvas, settings.source, settings.result, {
				...settings,
				elapsed: duration
			});
			status.textContent = "Exact anagram ✓ · static view shown for reduced motion";
			status.dataset.state = "ready";
			updateUrl();
			return;
		}
		status.textContent = "Exact anagram ✓ · playing locally";
		status.dataset.state = "ready";
		updateUrl();
		const frame = (now) => {
			const elapsed = now - started;
			const cycleLength = duration + ANAGRAM_ANIMATION_PAUSE;
			const cycleTime = settings.repeat ? elapsed % cycleLength : Math.min(elapsed, duration);
			renderAnagramAnimationFrame(canvas, settings.source, settings.result, {
				...settings,
				elapsed: Math.min(cycleTime, duration)
			});
			if (settings.repeat || elapsed < duration) animationId = requestAnimationFrame(frame);
		};
		animationId = requestAnimationFrame(frame);
	}
	function loadUrl() {
		const params = new URLSearchParams(location.search);
		sourceInput.value = (params.get("from") || "The meaning of life").slice(0, 120);
		resultInput.value = (params.get("to") || "The fine game of nil").slice(0, 120);
		styleSelect.value = safeStyle(params.get("style") || "blueprint");
		speedSelect.value = safeSpeed(params.get("speed") || "normal");
		repeatInput.checked = booleanParam(params.get("repeat"));
		if (booleanParam(params.get("autoplay"))) play();
		else renderAnagramAnimationFrame(canvas, sourceInput.value, resultInput.value, {
			style: styleSelect.value,
			speed: speedSelect.value,
			elapsed: ANAGRAM_ANIMATION_SPEEDS[speedSelect.value]
		});
	}
	form.addEventListener("submit", (event) => {
		event.preventDefault();
		play();
	});
	playButton.addEventListener("click", play);
	[
		styleSelect,
		speedSelect,
		repeatInput
	].forEach((control) => control.addEventListener("change", play));
	copyButton.addEventListener("click", async () => {
		if (!exactPair()) {
			status.textContent = "Correct the phrases before copying a link.";
			status.dataset.state = "error";
			return;
		}
		await navigator.clipboard.writeText(shareUrl({ focus: true }).href);
		copyButton.textContent = "Link copied";
		status.textContent = "Compact focus-mode animation link copied.";
		setTimeout(() => {
			copyButton.textContent = "Copy animation link";
		}, 1400);
	});
	embedButton.addEventListener("click", async () => {
		if (!exactPair()) {
			status.textContent = "Correct the phrases before copying embed code.";
			status.dataset.state = "error";
			return;
		}
		await navigator.clipboard.writeText(embedCode());
		embedButton.textContent = "Embed copied";
		status.textContent = "Responsive iframe embed code copied.";
		setTimeout(() => {
			embedButton.textContent = "Copy embed code";
		}, 1400);
	});
	focusButton.addEventListener("click", () => setFocusMode(true));
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && document.documentElement.classList.contains("animator-focus")) setFocusMode(false);
	});
	window.addEventListener("pagehide", stop);
	loadUrl();
	//#endregion
})();
