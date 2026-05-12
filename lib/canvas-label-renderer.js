/**
 * Canvas Label Renderer
 * =====================
 * Server-side label rendering for the print agent.
 * Renders structured label_data + format into a PNG buffer.
 *
 * Uses node-canvas, qrcode, bwip-js (same deps as print-agent).
 */

import { createCanvas, loadImage } from "canvas";
import QRCode from "qrcode";
import bwipjs from "bwip-js";

// ── Format definitions (mirrors lib/label-formats.ts for standalone agent use) ──

const LABEL_FORMATS = {
  brother_62mm: { widthMm: 62, heightMm: null, autoHeight: true },
  brother_29mm: { widthMm: 29, heightMm: null, autoHeight: true },
  dymo_99014: { widthMm: 101, heightMm: 54, autoHeight: false },
  zebra_4x6: { widthMm: 152, heightMm: 101, autoHeight: false },
  receipt_80mm: { widthMm: 80, heightMm: null, autoHeight: true },
};

const MM_TO_PX = 3.78; // 96 DPI
const DEFAULT_FORMAT = "brother_62mm";

function getFormat(formatKey) {
  return LABEL_FORMATS[formatKey] || LABEL_FORMATS[DEFAULT_FORMAT];
}

function getCanvasSize(formatKey, defaultHeightMm = 80) {
  const fmt = getFormat(formatKey);
  const w = Math.round(fmt.widthMm * MM_TO_PX);
  const h = fmt.autoHeight
    ? Math.round(defaultHeightMm * MM_TO_PX)
    : Math.round(fmt.heightMm * MM_TO_PX);
  return { w, h };
}

/** Scale factor relative to 62mm base */
function getScale(formatKey) {
  const fmt = getFormat(formatKey);
  return fmt.widthMm / 62;
}

// ── Shared helpers ──

async function drawQR(ctx, text, x, y, size) {
  try {
    const url = await QRCode.toDataURL(text || "unknown", { width: size, margin: 1 });
    const img = await loadImage(url);
    ctx.drawImage(img, x, y, size, size);
  } catch {}
}

async function drawBarcode(ctx, text, x, y, w, h) {
  try {
    const buf = await bwipjs.toBuffer({
      bcid: "code128",
      text: text || "000000",
      scale: 2,
      height: 12,
      includetext: true,
    });
    const img = await loadImage(buf);
    ctx.drawImage(img, x, y, w, h);
  } catch {}
}

function drawText(ctx, text, x, y, maxWidth) {
  if (!text) return;
  const str = String(text);
  if (maxWidth && ctx.measureText(str).width > maxWidth) {
    const truncated = str.substring(0, Math.floor(str.length * (maxWidth / ctx.measureText(str).width))) + "...";
    ctx.fillText(truncated, x, y);
  } else {
    ctx.fillText(str, x, y);
  }
}

function dateFmt(iso) {
  try {
    return new Date(iso).toLocaleDateString("nl-NL");
  } catch {
    return new Date().toLocaleDateString("nl-NL");
  }
}

// ── Per-type renderers ──

async function renderRepairLabel(ctx, data, formatKey) {
  const s = getScale(formatKey);
  const { w, h } = getCanvasSize(formatKey, 80);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#000000";

  const fs1 = Math.round(22 * s);
  const fs2 = Math.round(18 * s);
  const fs3 = Math.round(14 * s);
  const pad = Math.round(20 * s);
  let y = Math.round(35 * s);

  ctx.font = `bold ${fs1}px Arial`;
  drawText(ctx, `Job: ${data.jobId || "—"}`, pad, y, w - pad * 2);

  y += Math.round(30 * s);
  ctx.font = `${fs2}px Arial`;
  drawText(ctx, `Klant: ${data.klant || "—"}`, pad, y, w - pad * 2);

  y += Math.round(25 * s);
  drawText(ctx, `${data.merk || ""} ${data.model || ""}`.trim() || "—", pad, y, w - pad * 2);

  if (data.serial) {
    y += Math.round(25 * s);
    drawText(ctx, `S/N: ${data.serial}`, pad, y, w - pad * 2);
  }

  y += Math.round(30 * s);
  ctx.font = `${fs3}px Arial`;
  drawText(ctx, `Datum: ${dateFmt(data.datum)}`, pad, y, w - pad * 2);

  if (data.prijs) {
    y += Math.round(20 * s);
    drawText(ctx, `Prijs: €${data.prijs}`, pad, y, w - pad * 2);
  }
  if (data.probleem) {
    y += Math.round(20 * s);
    const short = data.probleem.length > 60 ? data.probleem.substring(0, 57) + "..." : data.probleem;
    drawText(ctx, short, pad, y, w - pad * 2);
  }

  // QR top-right
  const qrSize = Math.round(100 * s);
  await drawQR(ctx, data.jobId, w - qrSize - pad, Math.round(10 * s), qrSize);

  // Barcode bottom
  const barcodeW = Math.round(350 * s);
  const barcodeH = Math.round(60 * s);
  await drawBarcode(ctx, data.jobId, pad, h - barcodeH - Math.round(20 * s), barcodeW, barcodeH);
}

async function renderPartLabel(ctx, data, formatKey) {
  const s = getScale(formatKey);
  const { w, h } = getCanvasSize(formatKey, 60);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#000000";

  const pad = Math.round(20 * s);
  const textW = w - pad * 2;
  let y = Math.round(30 * s);

  // Category — large header
  const category = data.category || "Onderdeel";
  ctx.font = `bold ${Math.round(22 * s)}px Arial`;
  drawText(ctx, category.toUpperCase(), pad, y, textW);

  // Quantity badge top-right
  const qty = data.quantity || 1;
  if (qty > 1) {
    ctx.font = `bold ${Math.round(14 * s)}px Arial`;
    const qtyText = `×${qty}`;
    const qtyW = ctx.measureText(qtyText).width + Math.round(12 * s);
    const qtyH = Math.round(20 * s);
    const qtyX = w - pad - qtyW;
    const qtyY = y - qtyH + Math.round(4 * s);
    ctx.fillStyle = "#000000";
    ctx.fillRect(qtyX, qtyY, qtyW, qtyH);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(qtyText, qtyX + Math.round(6 * s), y);
    ctx.fillStyle = "#000000";
  }

  // Specs — prominent
  y += Math.round(30 * s);
  ctx.font = `bold ${Math.round(18 * s)}px Arial`;
  drawText(ctx, data.specs || "—", pad, y, textW);

  // Brand + Model
  const brandModel = `${data.brand || ""} ${data.model || ""}`.trim();
  if (brandModel) {
    y += Math.round(24 * s);
    ctx.font = `${Math.round(14 * s)}px Arial`;
    drawText(ctx, brandModel, pad, y, textW);
  }

  // Serial number
  if (data.serial_number) {
    y += Math.round(20 * s);
    ctx.font = `${Math.round(12 * s)}px Arial`;
    drawText(ctx, `S/N: ${data.serial_number}`, pad, y, textW);
  }

  // Note
  if (data.note) {
    y += Math.round(18 * s);
    ctx.font = `${Math.round(11 * s)}px Arial`;
    const noteShort = data.note.length > 80 ? data.note.substring(0, 77) + "..." : data.note;
    drawText(ctx, noteShort, pad, y, textW);
  }

  // Display ID text
  const displayId = data.short_id || data.displayId || data.id || "?";
  ctx.font = `bold ${Math.round(12 * s)}px Arial`;
  drawText(ctx, `ID: ${displayId}`, pad, h - Math.round(70 * s), textW);

  // Barcode — short_id as barcode at bottom
  const barcodeW = Math.round(320 * s);
  const barcodeH = Math.round(50 * s);
  await drawBarcode(ctx, displayId, pad, h - barcodeH - Math.round(10 * s), barcodeW, barcodeH);
}

async function renderRefurbishedLabel(ctx, data, formatKey) {
  const s = getScale(formatKey);
  const { w, h } = getCanvasSize(formatKey, 95);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#000000";

  const pad = Math.round(20 * s);
  const textW = w - pad * 2;
  let y = Math.round(32 * s);

  // Brand + Model — large title
  ctx.font = `bold ${Math.round(24 * s)}px Arial`;
  drawText(ctx, `${data.brand || "—"} ${data.model || "—"}`, pad, y, textW);

  // Horizontal rule
  y += Math.round(10 * s);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = Math.round(2 * s);
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(w - pad, y);
  ctx.stroke();

  // Specs list
  const specs = [
    data.cpu && `CPU: ${data.cpu}`,
    data.ram && `RAM: ${data.ram}`,
    data.ssd && `SSD: ${data.ssd}`,
    data.screen && `Scherm: ${data.screen}`,
    data.graphics && `GPU: ${data.graphics}`,
    data.os && `OS: ${data.os}`,
  ].filter(Boolean);

  ctx.font = `${Math.round(13 * s)}px Arial`;
  for (const spec of specs) {
    y += Math.round(20 * s);
    drawText(ctx, spec, pad, y, textW);
  }

  // Ports
  const ports = Array.isArray(data.ports) ? data.ports.join(", ") : data.ports;
  if (ports) {
    y += Math.round(20 * s);
    drawText(ctx, `Poorten: ${ports}`, pad, y, textW);
  }

  // Origin badge
  if (data.origin) {
    y += Math.round(20 * s);
    ctx.font = `italic ${Math.round(11 * s)}px Arial`;
    drawText(ctx, `Herkomst: ${data.origin}`, pad, y, textW);
  }

  // Price — bold, bottom-right area
  if (data.price) {
    const priceText = `€${data.price}`;
    ctx.font = `bold ${Math.round(28 * s)}px Arial`;
    const priceW = ctx.measureText(priceText).width;
    ctx.fillText(priceText, w - pad - priceW, h - Math.round(40 * s));
  }

  // Warranty text bottom-left
  ctx.font = `bold ${Math.round(12 * s)}px Arial`;
  drawText(ctx, "1 Jaar Garantie", pad, h - Math.round(42 * s), textW);
  ctx.font = `${Math.round(10 * s)}px Arial`;
  drawText(ctx, "incl. 30 min. software overzetten", pad, h - Math.round(28 * s), textW);

  // QR bottom-right (below price)
  const qrSize = Math.round(50 * s);
  await drawQR(ctx, `refurb-${data.id || "?"}`, w - qrSize - pad, h - qrSize - Math.round(4 * s), qrSize);
}

async function renderApkLabel(ctx, data, formatKey) {
  const s = getScale(formatKey);
  const { w, h } = getCanvasSize(formatKey, 85);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#000000";

  const pad = Math.round(20 * s);
  const textW = w - pad * 2;
  const jobId = data.job_id || data.jobId || "—";
  let y = Math.round(30 * s);

  // Header — APK Rapport + job_id
  ctx.font = `bold ${Math.round(20 * s)}px Arial`;
  drawText(ctx, "APK Rapport", pad, y, textW);

  y += Math.round(22 * s);
  ctx.font = `bold ${Math.round(13 * s)}px Arial`;
  drawText(ctx, `Job: ${jobId}`, pad, y, textW);

  // Customer + device
  y += Math.round(24 * s);
  ctx.font = `${Math.round(16 * s)}px Arial`;
  drawText(ctx, data.customer_name || "—", pad, y, textW);

  y += Math.round(22 * s);
  ctx.font = `${Math.round(14 * s)}px Arial`;
  const device = `${data.device_brand || ""} ${data.device_model || ""}`.trim();
  if (device) drawText(ctx, device, pad, y, textW);

  // Checklist — use real checklist_data if available, else show template
  const checkItems = [
    "Virus/Malware", "Windows Updates", "Drivers", "Opstarttijd",
    "Schijfruimte", "Temperaturen", "Batterij", "Beeldscherm",
    "Toetsenbord", "Poorten", "Fans/Koeling", "Algehele staat",
  ];
  const checklist = data.checklist_data || {};

  y += Math.round(18 * s);
  ctx.font = `${Math.round(10 * s)}px Arial`;

  // Render in 2 columns if wide enough
  const colW = Math.round((textW - 10 * s) / 2);
  const useColumns = w > Math.round(180);
  let col = 0;

  for (let i = 0; i < checkItems.length; i++) {
    const item = checkItems[i];
    const key = item.toLowerCase().replace(/[\s\/]/g, "_");
    const val = checklist[key] ?? checklist[item];
    const mark = val === true || val === "ok" || val === "goed" ? "\u2713" : val === false || val === "slecht" ? "\u2717" : "\u25A1";

    if (useColumns) {
      const colX = col === 0 ? pad : pad + colW + Math.round(10 * s);
      if (col === 0) y += Math.round(14 * s);
      if (y > h - Math.round(75 * s)) break;
      drawText(ctx, `${mark} ${item}`, colX, y, colW);
      col = (col + 1) % 2;
    } else {
      y += Math.round(14 * s);
      if (y > h - Math.round(75 * s)) break;
      drawText(ctx, `${mark} ${item}`, pad, y, textW);
    }
  }

  // Monteur + datum at bottom
  const bottomY = h - Math.round(68 * s);
  ctx.font = `${Math.round(11 * s)}px Arial`;
  if (data.performed_by) drawText(ctx, `Monteur: ${data.performed_by}`, pad, bottomY, textW);
  drawText(ctx, `Datum: ${dateFmt(data.datum)}`, pad, bottomY + Math.round(16 * s), textW);

  // QR top-right
  const qrSize = Math.round(65 * s);
  await drawQR(ctx, jobId, w - qrSize - pad, Math.round(10 * s), qrSize);

  // Barcode bottom
  const barcodeW = Math.round(300 * s);
  const barcodeH = Math.round(45 * s);
  await drawBarcode(ctx, jobId, pad, h - barcodeH - Math.round(10 * s), barcodeW, barcodeH);
}

async function renderAccessoryLabel(ctx, data, formatKey) {
  const s = getScale(formatKey);
  const { w, h } = getCanvasSize(formatKey, 50);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#000000";

  const pad = Math.round(20 * s);
  const textW = w - pad * 2;
  let y = Math.round(28 * s);

  // Type — large header (e.g. "Oplader", "Muis")
  ctx.font = `bold ${Math.round(20 * s)}px Arial`;
  drawText(ctx, data.type || "Accessoire", pad, y, textW);

  // Label description (e.g. "HP 65W USB-C adapter")
  if (data.label && data.label !== data.type) {
    y += Math.round(24 * s);
    ctx.font = `${Math.round(16 * s)}px Arial`;
    drawText(ctx, data.label, pad, y, textW);
  }

  // Quantity badge top-right
  const qty = data.quantity || 1;
  if (qty > 1) {
    const badgeSize = Math.round(28 * s);
    const badgeX = w - pad - badgeSize;
    const badgeY = Math.round(8 * s);
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${Math.round(14 * s)}px Arial`;
    const qtyText = String(qty);
    const qtyTextW = ctx.measureText(qtyText).width;
    ctx.fillText(qtyText, badgeX + (badgeSize - qtyTextW) / 2, badgeY + badgeSize / 2 + Math.round(5 * s));
    ctx.fillStyle = "#000000";
  }

  // Customer + Job reference
  y += Math.round(24 * s);
  ctx.font = `${Math.round(12 * s)}px Arial`;
  const refLine = `Job: ${data.jobId || "—"} | ${data.customerName || "—"}`;
  drawText(ctx, refLine, pad, y, textW);

  // Notes
  if (data.notes) {
    y += Math.round(18 * s);
    ctx.font = `${Math.round(11 * s)}px Arial`;
    const noteShort = data.notes.length > 60 ? data.notes.substring(0, 57) + "..." : data.notes;
    drawText(ctx, noteShort, pad, y, textW);
  }

  // Barcode at bottom — jobId as barcode
  const barcodeW = Math.round(280 * s);
  const barcodeH = Math.round(40 * s);
  await drawBarcode(ctx, data.jobId || "ACC", pad, h - barcodeH - Math.round(8 * s), barcodeW, barcodeH);
}

// ── Main entry point ──

const RENDERERS = {
  repair_label: renderRepairLabel,
  part_label: renderPartLabel,
  refurbished_label: renderRefurbishedLabel,
  apk_label: renderApkLabel,
  accessory_label: renderAccessoryLabel,
};

/**
 * Render a label to a PNG buffer.
 *
 * @param {string} jobType - One of: repair_label, part_label, refurbished_label, apk_label, accessory_label
 * @param {object} labelData - The label_data JSONB from the print job
 * @param {string} formatKey - One of: brother_62mm, brother_29mm, dymo_99014, zebra_4x6, receipt_80mm
 * @returns {Promise<Buffer>} PNG image buffer
 */
export async function renderLabelToBuffer(jobType, labelData, formatKey) {
  const renderer = RENDERERS[jobType] || RENDERERS.repair_label;
  const fmt = getFormat(formatKey);

  // Default height per type (used for autoHeight formats)
  const defaultHeights = {
    repair_label: 80,
    part_label: 60,
    refurbished_label: 95,
    apk_label: 85,
    accessory_label: 50,
  };

  const defaultH = defaultHeights[jobType] || 80;
  const { w, h } = getCanvasSize(formatKey, defaultH);
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  await renderer(ctx, labelData, formatKey);

  return canvas.toBuffer("image/png");
}
