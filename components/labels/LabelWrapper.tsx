"use client";

import { LABEL_FORMATS, getFontScale, type LabelFormatKey } from "@/lib/label-formats";

interface LabelWrapperProps {
  formatKey: LabelFormatKey;
  /** Additional font scale multiplier from user settings (default 1.0) */
  fontSizeModifier?: number;
  children: React.ReactNode;
}

/**
 * Wraps any existing label component and applies the correct dimensions
 * + font scaling for the selected printer format.
 *
 * Usage:
 *   <LabelWrapper formatKey="brother_29mm">
 *     <LabelPreview repair={repair} />
 *   </LabelWrapper>
 */
export default function LabelWrapper({
  formatKey,
  fontSizeModifier = 1.0,
  children,
}: LabelWrapperProps) {
  const fmt = LABEL_FORMATS[formatKey] ?? LABEL_FORMATS.brother_62mm;
  const fontScale = getFontScale(formatKey) * fontSizeModifier;

  const widthStyle = `${fmt.widthMm}mm`;
  const heightStyle = fmt.autoHeight ? "auto" : `${fmt.heightMm}mm`;
  const pageSize = fmt.autoHeight
    ? `${fmt.widthMm}mm auto`
    : `${fmt.widthMm}mm ${fmt.heightMm}mm`;

  return (
    <>
      {/* Inject @page CSS for window.print() */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media print {
  @page {
    size: ${pageSize};
    margin: 0;
  }
  body * {
    visibility: hidden;
  }
  #label-wrapper-root,
  #label-wrapper-root * {
    visibility: visible;
  }
  #label-wrapper-root {
    position: absolute;
    left: 0;
    top: 0;
    width: ${widthStyle} !important;
    ${!fmt.autoHeight ? `height: ${heightStyle} !important;` : ""}
  }
}
          `.trim(),
        }}
      />
      <div
        id="label-wrapper-root"
        style={{
          width: widthStyle,
          height: heightStyle,
          overflow: fmt.autoHeight ? "visible" : "hidden",
          // CSS custom property for children to inherit
          ["--label-font-scale" as string]: fontScale,
          fontSize: `${fontScale}em`,
          // Scale inner 62mm-hardcoded labels to fit the target width
          ["--label-width-mm" as string]: fmt.widthMm,
        }}
      >
        {children}
      </div>
    </>
  );
}
