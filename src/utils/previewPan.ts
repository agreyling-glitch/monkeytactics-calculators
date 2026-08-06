export const MIN_PREVIEW_ZOOM = 0.55;
export const MAX_PREVIEW_ZOOM = 3.4;
export const PREVIEW_ZOOM_STEP = 0.15;

export function stepPreviewZoom(zoom: number, direction: -1 | 1) {
  const stepped = Math.round((zoom + PREVIEW_ZOOM_STEP * direction) * 100) / 100;
  return clamp(stepped, MIN_PREVIEW_ZOOM, MAX_PREVIEW_ZOOM);
}

export function togglePreviewZoom(zoom: number) {
  return zoom >= MAX_PREVIEW_ZOOM ? MIN_PREVIEW_ZOOM : MAX_PREVIEW_ZOOM;
}

export interface PreviewPan {
  x: number;
  y: number;
}

export interface PreviewPanBounds {
  zoom: number;
  stageWidth: number;
  stageHeight: number;
  frameWidth: number;
  frameHeight: number;
}

export function clampPreviewPan(pan: PreviewPan, bounds: PreviewPanBounds): PreviewPan {
  if (bounds.zoom <= 1) return { x: 0, y: 0 };
  const margin = 24;
  const maximumX = Math.max(margin, (bounds.frameWidth * bounds.zoom - bounds.stageWidth) / 2 + margin);
  const maximumY = Math.max(margin, (bounds.frameHeight * bounds.zoom - bounds.stageHeight) / 2 + margin);
  return {
    x: clamp(pan.x, -maximumX, maximumX),
    y: clamp(pan.y, -maximumY, maximumY),
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
