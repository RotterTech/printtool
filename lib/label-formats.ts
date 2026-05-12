export type LabelFormatKey =
  | "brother_62mm"
  | "brother_29mm"
  | "dymo_99014"
  | "zebra_4x6"
  | "receipt_80mm";

export interface LabelFormat {
  widthMm: number;
  heightMm: number | null;
  autoHeight: boolean;
  orientation: "portrait" | "landscape";
}

export const LABEL_FORMATS: Record<LabelFormatKey, LabelFormat> = {
  brother_62mm: { widthMm: 62, heightMm: null, autoHeight: true, orientation: "portrait" },
  brother_29mm: { widthMm: 29, heightMm: null, autoHeight: true, orientation: "portrait" },
  dymo_99014: { widthMm: 101, heightMm: 54, autoHeight: false, orientation: "landscape" },
  zebra_4x6: { widthMm: 152, heightMm: 101, autoHeight: false, orientation: "landscape" },
  receipt_80mm: { widthMm: 80, heightMm: null, autoHeight: true, orientation: "portrait" },
};

/** Convert mm to px at 96 DPI (1mm ≈ 3.7795px) */
export const MM_TO_PX = 3.7795;

/** Font scale factor relative to 62mm base width */
export function getFontScale(formatKey: LabelFormatKey): number {
  const fmt = LABEL_FORMATS[formatKey];
  if (!fmt) return 1.0;
  if (fmt.widthMm <= 29) return 0.65;
  if (fmt.widthMm >= 101) return 1.3;
  if (fmt.widthMm >= 80) return 1.15;
  return 1.0;
}

/** Canvas DPI conversion: mm to canvas pixels (96 DPI) */
export function mmToPx(mm: number): number {
  return Math.round(mm * MM_TO_PX);
}
