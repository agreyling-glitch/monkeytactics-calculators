import type { QrType } from "../types";

export type PresetLogoId = "email" | "sms" | "phone" | "wifi" | "contact" | "calendar" | "location" | "link" | "text" | "social" | "crypto";

export interface PresetLogo {
  id: PresetLogoId;
  label: string;
  category: "Communication" | "Networking" | "Identity" | "Web" | "Business";
  recommendedFor: QrType[];
  artwork: string;
}

const stroke = `fill="none" stroke="#111827" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"`;

export const PRESET_LOGOS: PresetLogo[] = [
  { id: "email", label: "Email", category: "Communication", recommendedFor: ["email"], artwork: `<rect x="34" y="58" width="188" height="140" rx="18" ${stroke}/><path d="m42 72 86 70 86-70" ${stroke}/>` },
  { id: "sms", label: "SMS", category: "Communication", recommendedFor: ["sms"], artwork: `<path d="M40 55h176v120H105l-48 35 12-35H40z" ${stroke}/><path d="M82 112h92M82 142h58" ${stroke}/>` },
  { id: "phone", label: "Phone", category: "Communication", recommendedFor: [], artwork: `<path d="M76 37 48 63c3 74 70 141 144 144l27-28-45-41-26 23c-29-12-52-35-64-64l23-25z" ${stroke}/>` },
  { id: "wifi", label: "Wi-Fi", category: "Networking", recommendedFor: ["wifi"], artwork: `<path d="M37 91c52-45 130-45 182 0M69 128c34-29 84-29 118 0M102 164c15-13 37-13 52 0" ${stroke}/><circle cx="128" cy="201" r="11" fill="#22c55e"/>` },
  { id: "contact", label: "Contact", category: "Identity", recommendedFor: ["vcard"], artwork: `<circle cx="128" cy="83" r="42" ${stroke}/><path d="M49 211c7-48 35-75 79-75s72 27 79 75" ${stroke}/>` },
  { id: "calendar", label: "Calendar", category: "Identity", recommendedFor: ["calendar"], artwork: `<rect x="42" y="53" width="172" height="166" rx="18" ${stroke}/><path d="M42 99h172M82 37v32M174 37v32" ${stroke}/><path d="m91 157 24 23 51-55" ${stroke}/>` },
  { id: "location", label: "Location", category: "Identity", recommendedFor: ["geo"], artwork: `<path d="M128 226s70-66 70-125a70 70 0 1 0-140 0c0 59 70 125 70 125Z" ${stroke}/><circle cx="128" cy="101" r="25" ${stroke}/>` },
  { id: "link", label: "Link", category: "Web", recommendedFor: ["url"], artwork: `<path d="M105 151 84 172a42 42 0 0 1-59-59l40-40a42 42 0 0 1 59 0" ${stroke}/><path d="m151 105 21-21a42 42 0 0 1 59 59l-40 40a42 42 0 0 1-59 0M91 165l74-74" ${stroke}/>` },
  { id: "text", label: "Text", category: "Web", recommendedFor: ["text"], artwork: `<rect x="49" y="35" width="158" height="186" rx="16" ${stroke}/><path d="M82 82h92M82 121h92M82 160h67" ${stroke}/>` },
  { id: "social", label: "Social", category: "Web", recommendedFor: ["social"], artwork: `<circle cx="77" cy="128" r="25" ${stroke}/><circle cx="184" cy="70" r="25" ${stroke}/><circle cx="184" cy="186" r="25" ${stroke}/><path d="m99 116 61-34M99 141l61 33" ${stroke}/>` },
  { id: "crypto", label: "Crypto", category: "Business", recommendedFor: ["crypto"], artwork: `<circle cx="128" cy="128" r="94" ${stroke}/><path d="M104 72h37c40 0 40 49 0 49h-37zm0 49h43c43 0 43 57 0 57h-43zM124 53v19M151 53v19M124 178v22M151 178v22" ${stroke}/>` },
];

export function presetSvgDataUrl(preset: PresetLogo) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${preset.artwork}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export async function rasterizePresetLogo(id: PresetLogoId) {
  const preset = PRESET_LOGOS.find((item) => item.id === id);
  if (!preset) throw new Error("Unknown preset logo");
  const image = new Image();
  image.src = presetSvgDataUrl(preset);
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Logo rendering is unavailable in this browser");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}
