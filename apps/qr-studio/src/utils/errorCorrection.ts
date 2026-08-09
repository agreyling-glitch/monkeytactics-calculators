import type { QrStyle } from "../types";

export type QrErrorCorrection = "medium" | "quartile" | "high";

export function errorCorrectionForStyle(style: QrStyle): QrErrorCorrection {
  if (style.logoMode !== "text" && style.logoDataUrl && style.logoAutoEcc) return "high";
  if ((style.logoMode === "text" && style.textLogo.text) || style.frame.enabled) return "quartile";
  return "medium";
}
