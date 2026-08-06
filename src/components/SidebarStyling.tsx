import { useState, type ChangeEvent, type ReactNode } from "react";
import type { EyeGradientMode, EyeShape, FrameGradientDirection, FrameGradientType, FramePattern, FrameStyle, GradientPattern, GradientTarget, GradientType, LogoBackgroundShape, LogoMode, ModuleShape, QrStyle, QrType, TextLogoBackgroundShape, TextLogoFontWeight } from "../types";
import { PRESET_LOGOS, presetSvgDataUrl, rasterizePresetLogo, type PresetLogoId } from "../utils/presetLogos";
import { normalizeTextLogo, TEXT_LOGO_MAX_FONT_SIZE, textLogoEngineShape } from "../utils/textLogo";
import { FRAME_PRESETS, normalizeFrame } from "../utils/frame";

interface Props {
  style: QrStyle;
  qrType: QrType;
  logoFileName: string;
  logoSource: LogoMode;
  selectedLogoPreset: PresetLogoId | "";
  onChange: (patch: Partial<QrStyle>) => void;
  onLogoFileNameChange: (fileName: string) => void;
  onLogoSourceChange: (source: LogoMode) => void;
  onLogoPresetChange: (preset: PresetLogoId | "") => void;
}

const THEMES = [
  { name: "Midnight", foreground: "#0f172a", background: "#ffffff", gradientStart: "#0f172a", gradientEnd: "#334155", gradientColors: ["#0f172a", "#334155"] },
  { name: "Monkey", foreground: "#15803d", background: "#f0fdf4", gradientStart: "#22c55e", gradientEnd: "#0f766e", gradientColors: ["#22c55e", "#0f766e"] },
  { name: "Electric", foreground: "#312e81", background: "#eef2ff", gradientStart: "#7c3aed", gradientEnd: "#2563eb", gradientColors: ["#7c3aed", "#2563eb"] },
  { name: "Sunset", foreground: "#7c2d12", background: "#fff7ed", gradientStart: "#f97316", gradientEnd: "#db2777", gradientColors: ["#f97316", "#db2777"] },
];

const GRADIENT_PRESETS = [
  { name: "Sunset", colors: ["#facc15", "#f97316", "#dc2626", "#7e22ce"] },
  { name: "Ocean", colors: ["#14b8a6", "#0284c7", "#1e3a8a"] },
  { name: "Neon", colors: ["#ec4899", "#8b5cf6", "#06b6d4"] },
];

export function SidebarStyling({ style, qrType, logoFileName, logoSource, selectedLogoPreset, onChange, onLogoFileNameChange, onLogoSourceChange, onLogoPresetChange }: Props) {
  const [stylePanel, setStylePanel] = useState<"colors" | "dots" | "eyes" | "logo" | "frames" | "effects">("colors");
  const [textLogoNotice, setTextLogoNotice] = useState<string[]>([]);
  const [frameNotice, setFrameNotice] = useState<string[]>([]);
  const gradientColors = style.gradientColors?.length >= 2 ? style.gradientColors : [style.gradientStart, style.gradientEnd];
  const updateGradientColor = (index: number, color: string) => {
    const colors = gradientColors.map((value, colorIndex) => colorIndex === index ? color : value);
    onChange({ gradientColors: colors, gradientStart: colors[0], gradientEnd: colors[colors.length - 1] });
  };
  const setGradientColors = (colors: string[]) => onChange({ gradientColors: colors, gradientStart: colors[0], gradientEnd: colors[colors.length - 1] });
  const changeGradientType = async (gradientType: GradientType) => {
    if (gradientType === "logo-match" && style.logoDataUrl) {
      try {
        const matched = await sampleLogoColor(style.logoDataUrl);
        const colors = [matched, ...gradientColors.slice(1)];
        onChange({ gradientType, gradientColors: colors, gradientStart: colors[0], gradientEnd: colors[colors.length - 1] });
        return;
      } catch { /* Keep the current stops when the logo cannot be sampled. */ }
    }
    onChange({ gradientType });
  };
  const logo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      onLogoFileNameChange("");
      return onChange({ logoDataUrl: "" });
    }
    if (file.size > 2_000_000) return;
    onLogoFileNameChange(file.name);
    onLogoPresetChange("");
    onLogoSourceChange("upload");
    const reader = new FileReader();
    reader.onload = () => onChange({ logoMode: "upload", logoDataUrl: String(reader.result) });
    reader.onerror = () => {
      onLogoFileNameChange("");
      onChange({ logoDataUrl: "" });
    };
    reader.readAsDataURL(file);
  };

  const selectPreset = async (presetId: PresetLogoId) => {
    const preset = PRESET_LOGOS.find((item) => item.id === presetId);
    if (!preset) return;
    const logoDataUrl = await rasterizePresetLogo(presetId);
    onLogoFileNameChange("");
    onLogoPresetChange(presetId);
    onLogoSourceChange("preset");
    onChange({ logoMode: "preset", logoDataUrl });
  };

  const clearLogo = (source: LogoMode = "none") => {
    onLogoFileNameChange("");
    onLogoPresetChange("");
    onLogoSourceChange(source);
    onChange({ logoMode: source, logoDataUrl: "" });
  };

  const selectTextLogo = () => {
    onLogoFileNameChange("");
    onLogoPresetChange("");
    onLogoSourceChange("text");
    updateTextLogo({});
  };

  const updateTextLogo = (patch: Partial<QrStyle["textLogo"]>) => {
    const normalized = normalizeTextLogo({ ...style.textLogo, ...patch });
    setTextLogoNotice(normalized.warnings);
    onChange({
      logoMode: "text",
      textLogo: normalized.settings,
      logoSize: 0.20,
      logoPadding: normalized.settings.padding,
      logoBackgroundShape: textLogoEngineShape(normalized.settings.backgroundShape),
      logoAutoContrast: normalized.settings.autoContrast,
      logoWhiteBorder: false,
      logoSafeMode: true,
      logoAutoEcc: true,
    });
  };

  const updateFrame = (patch: Partial<QrStyle["frame"]>) => {
    const normalized = normalizeFrame({ ...style.frame, ...patch });
    setFrameNotice(normalized.warnings);
    onChange({ frame: normalized.settings });
  };

  const updateFrameGradient = (patch: Partial<QrStyle["frame"]["gradient"]>) => updateFrame({ gradient: { ...style.frame.gradient, ...patch } });

  return <div className="qr-panel-content qr-style-sections">
    <div className="qr-style-subtabs" role="tablist" aria-label="Styling controls">
      {([['colors', 'Colors'], ['dots', 'QR Dots'], ['eyes', 'Corner Squares (Eyes)'], ['logo', 'Logo'], ['frames', 'Frames'], ['effects', 'Effects']] as const).map(([panel, label]) => <button key={panel} type="button" role="tab" aria-selected={stylePanel === panel} className={stylePanel === panel ? "active" : ""} onClick={() => setStylePanel(panel)}>{label}</button>)}
    </div>
    <div className="qr-style-subpanel" role="tabpanel">
    {stylePanel === "colors" && <>
    <Section title="Colors">
      <div className="qr-field-row">
        <Color label="Foreground" value={style.foreground} onChange={(foreground) => onChange({ foreground })} />
        <Color label="Background" value={style.background} onChange={(background) => onChange({ background })} />
      </div>
      <label className="qr-field"><span>Gradient mode</span><select value={style.gradientType} onChange={(event) => void changeGradientType(event.target.value as GradientType)}>
        <option value="none">None</option>
        <option className="qr-option-heading" disabled>— Linear —</option><option value="linear-lr">Left → Right</option><option value="linear-rl">Right → Left</option><option value="linear-tb">Top → Bottom</option><option value="linear-bt">Bottom → Top</option><option value="diagonal-down">Diagonal ↘</option><option value="diagonal-up">Diagonal ↗</option>
        <option className="qr-option-heading" disabled>— Radial —</option><option value="radial-center">Centered radial</option><option value="radial-offset">Offset radial</option><option value="radial-ellipse">Elliptical radial</option><option value="spotlight">Soft spotlight</option>
        <option className="qr-option-heading" disabled>— Angular —</option><option value="conic">Conic sweep</option><option value="pie">Pie-slice gradient</option><option value="spiral">Spiral gradient</option>
        <option className="qr-option-heading" disabled>— QR module —</option><option value="module-horizontal">Horizontal module gradient</option><option value="module-vertical">Vertical module gradient</option><option value="module-radial">Radial module gradient</option>
        <option className="qr-option-heading" disabled>— Logo-aware —</option><option value="logo-toward">Gradient toward logo</option><option value="logo-away">Gradient away from logo</option><option value="logo-match">Logo color-matched</option><option value="auto-contrast">Auto-contrast gradient</option>
      </select></label>
      {style.gradientType !== "none" && <>
        <div className="qr-gradient-stops">{gradientColors.map((color, index) => <Color key={index} label={`Stop ${index + 1}`} value={color} onChange={(value) => updateGradientColor(index, value)} />)}</div>
        <div className="qr-gradient-actions"><button type="button" disabled={gradientColors.length >= 6} onClick={() => setGradientColors([...gradientColors, gradientColors[gradientColors.length - 1]])}>+ Add stop</button><button type="button" disabled={gradientColors.length <= 2} onClick={() => setGradientColors(gradientColors.slice(0, -1))}>− Remove stop</button></div>
        <div className="qr-gradient-presets">{GRADIENT_PRESETS.map((preset) => <button key={preset.name} type="button" onClick={() => setGradientColors(preset.colors)} style={{ background: `linear-gradient(90deg,${preset.colors.join(",")})` }}><span>{preset.name}</span></button>)}</div>
        <div className="qr-field-row"><label className="qr-field"><span>Apply gradient to</span><select value={style.gradientTarget} onChange={(event) => onChange({ gradientTarget: event.target.value as GradientTarget })}><option value="data">Data modules</option><option value="eyes">Finder eyes region</option><option value="data-eyes">Data + eyes</option><option value="quiet-zone">Quiet zone</option></select></label><label className="qr-field"><span>Blend / texture</span><select value={style.gradientPattern} onChange={(event) => onChange({ gradientPattern: event.target.value as GradientPattern })}><option value="none">None</option><option className="qr-option-heading" disabled>— Noise —</option><option value="perlin">Perlin noise</option><option value="fractal">Fractal noise</option><option value="grain">Grainy</option><option value="speckle">Soft speckle</option><option className="qr-option-heading" disabled>— Patterns —</option><option value="stripes">Stripes</option><option value="dots">Dots</option><option value="mesh">Mesh</option><option value="waves">Waves</option></select></label></div>
        <label className="qr-field"><span>Eye-specific gradient</span><select value={style.eyeGradientMode} onChange={(event) => onChange({ eyeGradientMode: event.target.value as EyeGradientMode })}><option value="none">Use eye colors</option><option value="whole">Eye-only gradient</option><option value="ring">Eye ring gradient</option><option value="pupil">Eye pupil gradient</option><option value="dual">Dual-tone eyes</option></select></label>
      </>}
      <div className="qr-theme-grid">{THEMES.map((theme) => <button key={theme.name} type="button" onClick={() => onChange(theme)}><i style={{ background: `linear-gradient(135deg, ${theme.gradientStart}, ${theme.gradientEnd})` }} />{theme.name}</button>)}</div>
    </Section>
    </>}

    {stylePanel === "dots" && <>
    <Section title="Modules (QR dots)">
      <label className="qr-field"><span>Shape</span><select value={style.moduleShape} onChange={(event) => onChange({ moduleShape: event.target.value as ModuleShape })}><option value="square">Square</option><option value="rounded">Rounded</option><option value="circle">Circle</option><option value="hexagon">Hexagon</option><option value="diamond">Diamond</option><option value="soft-diamond">Soft Diamond</option><option value="capsule">Capsule</option><option value="squircle">Squircle</option><option value="octagon">Octagon</option><option value="teardrop">Teardrop</option><option value="triangle-up">Triangle (up)</option><option value="triangle-down">Triangle (down)</option><option value="star-four">Star (4-point)</option><option value="concentric">Concentric circle</option></select></label>
      <Range label="Module size" value={style.moduleScale} min={0.5} max={1} step={0.02} output={`${Math.round(style.moduleScale * 100)}%`} onChange={(moduleScale) => onChange({ moduleScale })} />
      <label className="qr-field"><span>Pattern preset</span><select value={style.patternPreset} onChange={(event) => onChange({ patternPreset: event.target.value, artistic: event.target.value === "artistic" })}><option value="classic">Classic grid</option><option value="soft">Soft dots</option><option value="tech">Tech matrix</option><option value="artistic">Artistic mask</option></select></label>
    </Section>
    </>}

    {stylePanel === "eyes" && <>
    <Section title="Eyes (corner squares)">
      <label className="qr-field"><span>Eye shape</span><select value={style.eyeShape} onChange={(event) => onChange({ eyeShape: event.target.value as EyeShape })}><option value="square">Square</option><option value="rounded">Rounded</option><option value="circle">Circle</option><option value="leaf">Leaf</option><option value="hexagon">Hexagon</option><option value="diamond">Diamond</option><option value="capsule">Capsule</option><option value="teardrop">Teardrop</option><option value="star-four">Star (4-point)</option><option value="triangle-up">Triangle (up)</option><option value="triangle-down">Triangle (down)</option><option value="honeycomb">Honeycomb</option><option value="pebble">Pebble / blob</option><option value="concentric">Concentric circle</option><option value="heart">Heart</option></select></label>
      <div className="qr-field-row"><Color label="Outer" value={style.eyeOuterColor} onChange={(eyeOuterColor) => onChange({ eyeOuterColor })} /><Color label="Inner" value={style.eyeInnerColor} onChange={(eyeInnerColor) => onChange({ eyeInnerColor })} /></div>
      <div className="qr-eye-presets"><button type="button" onClick={() => onChange({ eyeShape: "square", eyeOuterColor: style.foreground, eyeInnerColor: style.foreground })}>Classic</button><button type="button" onClick={() => onChange({ eyeShape: "rounded", eyeOuterColor: style.gradientStart, eyeInnerColor: style.gradientEnd })}>Duo</button><button type="button" onClick={() => onChange({ eyeShape: "circle" })}>Orbit</button></div>
    </Section>
    </>}

    {stylePanel === "logo" && <>
    <Section title="Logo">
      <div className="qr-logo-source" role="group" aria-label="Logo source">
        <button type="button" className={logoSource === "none" ? "active" : ""} onClick={() => clearLogo("none")}>None</button>
        <button type="button" className={logoSource === "upload" ? "active" : ""} onClick={() => { if (logoSource !== "upload") clearLogo("upload"); }}>Upload custom</button>
        <button type="button" className={logoSource === "preset" ? "active" : ""} onClick={() => { if (logoSource !== "preset") clearLogo("preset"); }}>Preset icons</button>
        <button type="button" className={logoSource === "text" ? "active" : ""} onClick={selectTextLogo}>Text logo</button>
      </div>
      {logoSource === "upload" && <>
        <label className="qr-field qr-logo-upload"><span>Choose logo</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={logo} /></label>
        {logoFileName && <p className="qr-selected-file" aria-live="polite">Selected: <strong>{logoFileName}</strong></p>}
      </>}
      {logoSource === "preset" && <div className="qr-preset-logo-grid" aria-label="Preset icons">
        {PRESET_LOGOS.map((preset) => <button key={preset.id} type="button" className={selectedLogoPreset === preset.id ? "active" : ""} aria-pressed={selectedLogoPreset === preset.id} onClick={() => void selectPreset(preset.id)} title={`${preset.category}: ${preset.label}`}>
          <img src={presetSvgDataUrl(preset)} alt="" /><span>{preset.label}</span>{preset.recommendedFor.includes(qrType) && <small>Recommended</small>}
        </button>)}
      </div>}
      {logoSource === "text" && <div className="qr-text-logo-options">
        <label className="qr-field"><span>Text</span><input value={style.textLogo.text} maxLength={12} inputMode="text" autoCapitalize="characters" onChange={(event) => updateTextLogo({ text: event.target.value })} placeholder="MENU" /><small>{style.textLogo.text.length}/12 characters · A-Z, 0-9, spaces, period, dash, underscore</small></label>
        <div className="qr-field-row">
          <label className="qr-field"><span>Font family</span><select value={style.textLogo.fontFamily} onChange={(event) => updateTextLogo({ fontFamily: event.target.value })}><option>Segoe UI</option><option>Georgia</option><option>Courier New</option><option>Trebuchet MS</option><option>Impact</option></select></label>
          <label className="qr-field"><span>Font weight</span><select value={style.textLogo.fontWeight} onChange={(event) => updateTextLogo({ fontWeight: event.target.value as TextLogoFontWeight })}><option value="regular">Regular</option><option value="medium">Medium</option><option value="semibold">Semibold</option><option value="bold">Bold</option></select></label>
        </div>
        <Range label="Font size" value={style.textLogo.fontSize} min={10} max={TEXT_LOGO_MAX_FONT_SIZE} step={1} output={`${style.textLogo.fontSize}px`} onChange={(fontSize) => updateTextLogo({ fontSize })} />
        <div className="qr-field-row"><Color label="Text color" value={style.textLogo.color} onChange={(color) => updateTextLogo({ color, autoContrast: false })} /><Color label="Background" value={style.textLogo.backgroundColor} onChange={(backgroundColor) => updateTextLogo({ backgroundColor })} /></div>
        <label className="qr-field"><span>Background shape</span><select value={style.textLogo.backgroundShape} onChange={(event) => updateTextLogo({ backgroundShape: event.target.value as TextLogoBackgroundShape })}><option value="circle">Circle</option><option value="rounded-square">Rounded square</option><option value="squircle">Squircle</option><option value="capsule">Capsule</option></select></label>
        <Range label="Background padding" value={style.textLogo.padding} min={0.10} max={0.20} step={0.01} output={`${Math.round(style.textLogo.padding * 100)}%`} onChange={(padding) => updateTextLogo({ padding })} />
        <Toggle label="Auto contrast" checked={style.textLogo.autoContrast} onChange={(autoContrast) => updateTextLogo({ autoContrast })} />
        <p className="qr-help">Auto contrast defaults to on. Choosing a text color turns it off; turn it back on to automatically use black or white. Text remains centered in a protected logo zone, and error correction is boosted to Q.</p>
        {(textLogoNotice.length > 0 || style.textLogo.text.length > 8) && <div className="qr-text-logo-warning" role="status">{[...new Set([...textLogoNotice, ...(style.textLogo.text.length > 8 ? ["Long text may reduce clarity."] : [])])].map((warning) => <p key={warning}>{warning}</p>)}</div>}
      </div>}
      {logoSource !== "text" && style.logoDataUrl && <button type="button" className="qr-quiet-button qr-remove-logo" onClick={() => clearLogo(logoSource)}>Remove logo</button>}
      {logoSource !== "text" && !style.logoDataUrl && <p className="qr-logo-prompt">Choose a preset icon, upload a logo, or select Text logo to enable logo settings.</p>}
      {logoSource !== "text" && <fieldset className="qr-logo-options" disabled={!style.logoDataUrl} aria-label="Logo settings">
        <Range label="Logo size" value={style.logoSize} min={0.08} max={0.3} step={0.01} output={`${Math.round(style.logoSize * 100)}%`} onChange={(logoSize) => onChange({ logoSize })} />
        <Range label="Logo padding" value={style.logoPadding} min={0} max={0.25} step={0.01} output={`${Math.round(style.logoPadding * 100)}%`} onChange={(logoPadding) => onChange({ logoPadding })} />
        <label className="qr-field"><span>Logo background shape</span><select value={style.logoBackgroundShape} onChange={(event) => onChange({ logoBackgroundShape: event.target.value as LogoBackgroundShape })}><option value="square">Square</option><option value="rounded">Rounded square</option><option value="squircle">Squircle</option><option value="circle">Circle</option></select></label>
        <Toggle label="Auto contrast" checked={style.logoAutoContrast} onChange={(logoAutoContrast) => onChange({ logoAutoContrast })} />
        <Toggle label="White safety border" checked={style.logoWhiteBorder} onChange={(logoWhiteBorder) => onChange({ logoWhiteBorder })} />
        <Toggle label="Safe mode (protect ECC)" checked={style.logoSafeMode} onChange={(logoSafeMode) => onChange({ logoSafeMode })} />
        <Toggle label="Auto-adjust error correction" checked={style.logoAutoEcc} onChange={(logoAutoEcc) => onChange({ logoAutoEcc })} />
        <p className="qr-help">The white safety border clears one extra module around the logo. Auto contrast only controls the backdrop directly beneath it.</p>
      </fieldset>}
    </Section>
    </>}

    {stylePanel === "frames" && <>
    <Section title="Frames">
      <Toggle label="Enable frame" checked={style.frame.enabled} onChange={(enabled) => updateFrame({ enabled })} />
      {style.frame.enabled && <div className="qr-frame-options">
        <div className="qr-frame-presets" aria-label="Frame presets">{FRAME_PRESETS.map((preset) => <button key={preset.id} type="button" className={style.frame.preset === preset.id ? "active" : ""} onClick={() => updateFrame({ ...preset.patch, preset: preset.id })}>{preset.label}</button>)}</div>
        <label className="qr-field"><span>Frame style</span><select value={style.frame.style} onChange={(event) => updateFrame({ style: event.target.value as FrameStyle, preset: null })}>
          <option className="qr-option-heading" disabled>Basic frames</option><option value="rectangle">Rectangle</option><option value="rounded-rectangle">Rounded rectangle</option><option value="squircle">Squircle</option><option value="capsule">Capsule</option><option value="circle">Circle</option>
          <option className="qr-option-heading" disabled>Decorative frames</option><option value="outline">Outline</option><option value="thick-border">Thick border</option><option value="glow">Glow</option><option value="shadow">Shadow</option><option value="gradient-border">Gradient border</option><option value="pattern-border">Pattern border</option>
          <option className="qr-option-heading" disabled>Icon frames</option><option value="arrow-left">Arrow left</option><option value="arrow-right">Arrow right</option><option value="arrow-down">Arrow down</option><option value="camera">Camera</option><option value="phone">Phone</option><option value="tap-icon">Tap icon</option>
        </select></label>
        <Range label="Thickness" value={style.frame.thickness} min={0.02} max={0.15} step={0.01} output={`${Math.round(style.frame.thickness * 100)}%`} onChange={(thickness) => updateFrame({ thickness, preset: null })} />
        <Range label="QR separation" value={style.frame.padding} min={0.06} max={0.12} step={0.01} output={`${Math.round(style.frame.padding * 100)}%`} onChange={(padding) => updateFrame({ padding, preset: null })} />
        <Range label="Corner radius" value={style.frame.cornerRadius} min={0} max={0.5} step={0.01} output={`${Math.round(style.frame.cornerRadius * 100)}%`} onChange={(cornerRadius) => updateFrame({ cornerRadius, preset: null })} />
        <Color label="Frame color (solid)" value={style.frame.color} onChange={(color) => updateFrame({ color, gradient: { ...style.frame.gradient, enabled: false }, style: style.frame.style === "gradient-border" ? "rounded-rectangle" : style.frame.style, preset: null })} />
        <Toggle label="Gradient border" checked={style.frame.gradient.enabled} onChange={(enabled) => updateFrameGradient({ enabled })} />
        {style.frame.gradient.enabled && <>
          <div className="qr-field-row"><label className="qr-field"><span>Gradient type</span><select value={style.frame.gradient.type} onChange={(event) => updateFrameGradient({ type: event.target.value as FrameGradientType })}><option value="linear">Linear</option><option value="radial">Radial</option><option value="conic">Conic</option></select></label><label className="qr-field"><span>Direction</span><select value={style.frame.gradient.direction} onChange={(event) => updateFrameGradient({ direction: event.target.value as FrameGradientDirection })}><option value="top-bottom">Top → bottom</option><option value="left-right">Left → right</option><option value="diagonal">Diagonal</option></select></label></div>
          <div className="qr-gradient-stops">{style.frame.gradient.stops.map((color, index) => <Color key={index} label={`Stop ${index + 1}`} value={color} onChange={(next) => updateFrameGradient({ stops: style.frame.gradient.stops.map((value, stopIndex) => stopIndex === index ? next : value) })} />)}</div>
          <div className="qr-gradient-actions"><button type="button" disabled={style.frame.gradient.stops.length >= 6} onClick={() => updateFrameGradient({ stops: [...style.frame.gradient.stops, style.frame.gradient.stops.at(-1) || style.frame.color] })}>+ Add stop</button><button type="button" disabled={style.frame.gradient.stops.length <= 2} onClick={() => updateFrameGradient({ stops: style.frame.gradient.stops.slice(0, -1) })}>− Remove stop</button></div>
        </>}
        <label className="qr-field"><span>Border pattern</span><select value={style.frame.pattern} onChange={(event) => updateFrame({ pattern: event.target.value as FramePattern, style: event.target.value === "none" ? style.frame.style : "pattern-border", preset: null })}><option value="none">None</option><option value="dots">Dots</option><option value="stripes">Stripes</option><option value="waves">Waves</option><option value="mesh">Mesh</option><option value="grid">Grid</option></select></label>
        {style.frame.pattern !== "none" && <Range label="Pattern opacity" value={style.frame.patternOpacity} min={0.10} max={0.40} step={0.01} output={`${Math.round(style.frame.patternOpacity * 100)}%`} onChange={(patternOpacity) => updateFrame({ patternOpacity })} />}
        <label className="qr-field"><span>Frame text</span><input value={style.frame.text} maxLength={12} autoCapitalize="characters" onChange={(event) => updateFrame({ text: event.target.value, preset: null })} placeholder="SCAN ME" /><small>{style.frame.text.length}/12 characters · A-Z, 0-9, spaces, period, dash, underscore</small></label>
        <div className="qr-field-row"><label className="qr-field"><span>Text font</span><select value={style.frame.textFont} onChange={(event) => updateFrame({ textFont: event.target.value, preset: null })}><option>Segoe UI</option><option>Georgia</option><option>Courier New</option><option>Trebuchet MS</option><option>Impact</option></select></label><label className="qr-field"><span>Text weight</span><select value={style.frame.textWeight} onChange={(event) => updateFrame({ textWeight: event.target.value as TextLogoFontWeight, preset: null })}><option value="regular">Regular</option><option value="medium">Medium</option><option value="semibold">Semibold</option><option value="bold">Bold</option></select></label></div>
        <Range label="Text size" value={style.frame.textSize} min={10} max={40} step={1} output={`${style.frame.textSize}px`} onChange={(textSize) => updateFrame({ textSize, preset: null })} />
        <Color label="Text color" value={style.frame.textColor} onChange={(textColor) => updateFrame({ textColor, autoContrast: false, preset: null })} />
        <Toggle label="Auto contrast" checked={style.frame.autoContrast} onChange={(autoContrast) => updateFrame({ autoContrast, preset: null })} />
        <p className="qr-help">Frames are centered outside the QR quiet zone. Error correction is automatically boosted to Q.</p>
        {frameNotice.length > 0 && <div className="qr-text-logo-warning" role="status">{frameNotice.map((warning) => <p key={warning}>{warning}</p>)}</div>}
      </div>}
    </Section>
    </>}

    {stylePanel === "effects" && <>
    <Section title="Effects">
      <div className="qr-toggle-grid">
        <Toggle label="Drop shadow" checked={style.dropShadow} onChange={(dropShadow) => onChange({ dropShadow })} />
        <Toggle label="Glow" checked={style.glow} onChange={(glow) => onChange({ glow })} />
        <Toggle label="Noise" checked={style.noise} onChange={(noise) => onChange({ noise })} />
        <Toggle label="Texture overlay" checked={style.texture} onChange={(texture) => onChange({ texture })} />
        <Toggle label="Artistic QR mode" checked={style.artistic} onChange={(artistic) => onChange({ artistic })} />
      </div>
    </Section>
    </>}
    </div>
  </div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) { return <section className="qr-style-section"><h3>{title}</h3>{children}</section>; }
function Color({ label, value, disabled = false, onChange }: { label: string; value: string; disabled?: boolean; onChange: (value: string) => void }) { return <label className="qr-color-field"><span>{label}</span><div><input type="color" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /><code>{value}</code></div></label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="qr-switch"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span aria-hidden="true" />{label}</label>; }
function Range({ label, value, min, max, step, output, onChange }: { label: string; value: number; min: number; max: number; step: number; output: string; onChange: (value: number) => void }) { return <label className="qr-range"><span>{label}<output>{output}</output></span><input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} /></label>; }

async function sampleLogoColor(dataUrl: string) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Logo color sampling is unavailable");
  context.drawImage(image, 0, 0, 32, 32);
  const pixels = context.getImageData(0, 0, 32, 32).data;
  let red = 0, green = 0, blue = 0, weight = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    if (alpha < 0.1 || (pixels[index] > 245 && pixels[index + 1] > 245 && pixels[index + 2] > 245)) continue;
    red += pixels[index] * alpha; green += pixels[index + 1] * alpha; blue += pixels[index + 2] * alpha; weight += alpha;
  }
  if (!weight) throw new Error("Logo has no visible color");
  return `#${[red, green, blue].map((channel) => Math.round(channel / weight).toString(16).padStart(2, "0")).join("")}`;
}
