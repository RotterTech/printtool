/**
 * DDK Print Agent
 * ===============
 * Draait op de Windows PC met de USB labelprinter.
 * Pollt de server elke 3 seconden voor nieuwe printjobs.
 * 
 * Gebruik:
 *   1. npm install
 *   2. Kopieer je API key van Instellingen > Print Queue
 *   3. node agent.js
 *   4. Vul je API key en server URL in wanneer gevraagd
 */

import { createCanvas, loadImage } from "canvas";
import QRCode from "qrcode";
import bwipjs from "bwip-js";
import fs from "fs";
import path from "path";
import readline from "readline";
import { renderLabelToBuffer } from "../lib/canvas-label-renderer.js";

// ===== CONFIG =====
const CONFIG_FILE = path.join(process.cwd(), "agent-config.json");
const POLL_INTERVAL = 3000; // 3 seconds

// Load or set up config
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch {}
  return null;
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function askQuestion(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function setup() {
  let config = loadConfig();
  if (config?.apiKey && config?.serverUrl) {
    console.log(`\n✅ Config geladen`);
    console.log(`   Server: ${config.serverUrl}`);
    console.log(`   API Key: ${config.apiKey.substring(0, 10)}...`);
    return config;
  }

  console.log("\n🖨️  DDK Print Agent - Setup\n");
  
  const serverUrl = await askQuestion("Server URL (bijv. https://pc-picker.nl): ");
  const apiKey = await askQuestion("API Key (van Instellingen > Print Queue): ");

  if (!serverUrl || !apiKey) {
    console.error("❌ Server URL en API Key zijn verplicht!");
    process.exit(1);
  }

  config = { serverUrl: serverUrl.replace(/\/$/, ""), apiKey };
  saveConfig(config);
  console.log("✅ Config opgeslagen in agent-config.json\n");
  return config;
}

// ===== PRINTER =====
let printer = null;
try {
  const printerModule = await import("@thiagoelg/node-printer");
  printer = printerModule.default || printerModule;
  const printers = printer.getPrinters();
  console.log("\n🖨️  Beschikbare printers:");
  printers.forEach((p, i) => console.log(`   ${i + 1}. ${p.name} ${p.isDefault ? "(standaard)" : ""}`));
} catch {
  console.warn("⚠️  @thiagoelg/node-printer niet beschikbaar");
  console.warn("   Installeer met: npm install @thiagoelg/node-printer");
  console.warn("   (Vereist Python 3 + Visual Studio Build Tools)\n");
  printer = {
    getPrinters: () => [],
    printDirect: (opts) => {
      console.log("🖨️  STUB: Label opgeslagen als print-output.png");
      return { success: () => {}, error: () => {} };
    },
  };
}

// ===== LABEL RENDERING =====

/** Legacy fallback — only used if renderLabelToBuffer import fails */
async function renderLabelLegacy(data) {
  const { jobId, klant, merk, model, datum, serial, probleem, prijs } = data;

  const canvas = createCanvas(600, 300);
  const ctx = canvas.getContext("2d");

  // White background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, 600, 300);

  // Text
  ctx.fillStyle = "#000000";

  ctx.font = "bold 22px Arial";
  ctx.fillText(`Job: ${jobId || "—"}`, 20, 35);

  ctx.font = "18px Arial";
  ctx.fillText(`Klant: ${klant || "—"}`, 20, 65);
  ctx.fillText(`${merk || ""} ${model || ""}`.trim() || "—", 20, 90);
  if (serial) ctx.fillText(`S/N: ${serial}`, 20, 115);

  ctx.font = "14px Arial";
  const datumStr = datum ? new Date(datum).toLocaleDateString("nl-NL") : new Date().toLocaleDateString("nl-NL");
  ctx.fillText(`Datum: ${datumStr}`, 20, 145);
  if (prijs) ctx.fillText(`Prijs: €${prijs}`, 20, 165);
  if (probleem) {
    const short = probleem.length > 60 ? probleem.substring(0, 57) + "..." : probleem;
    ctx.fillText(short, 20, 190);
  }

  // QR Code
  try {
    const qrDataURL = await QRCode.toDataURL(jobId || "unknown", { width: 100, margin: 1 });
    const qrImage = await loadImage(qrDataURL);
    ctx.drawImage(qrImage, 480, 10, 100, 100);
  } catch {}

  // Barcode
  try {
    const barcodePNG = await bwipjs.toBuffer({
      bcid: "code128",
      text: jobId || "000000",
      scale: 2,
      height: 12,
      includetext: true,
    });
    const barcodeImage = await loadImage(barcodePNG);
    ctx.drawImage(barcodeImage, 20, 220, 350, 60);
  } catch {}

  return canvas.toBuffer("image/png");
}

// ===== PRINT FUNCTION =====
async function printLabel(imageBuffer, jobId) {
  // Save as file for debugging
  const debugPath = path.join(process.cwd(), `label-${jobId}.png`);
  fs.writeFileSync(debugPath, imageBuffer);

  if (!printer || printer.getPrinters().length === 0) {
    console.log(`   📁 Label opgeslagen: ${debugPath}`);
    console.log("   ⚠️  Geen printer beschikbaar — installeer @thiagoelg/node-printer");
    return true; // Mark as success for testing
  }

  const printers = printer.getPrinters();
  const defaultPrinter = printers.find((p) => p.isDefault)?.name || printers[0]?.name;

  return new Promise((resolve) => {
    printer.printDirect({
      data: imageBuffer,
      type: "RAW",
      printer: defaultPrinter,
      success: () => {
        console.log(`   ✅ Geprint op ${defaultPrinter}`);
        resolve(true);
      },
      error: (err) => {
        console.error(`   ❌ Printfout: ${err}`);
        resolve(false);
      },
    });
  });
}

// ===== POLLING LOOP =====
async function pollForJobs(config) {
  try {
    const url = `${config.serverUrl}/api/print-queue/poll?api_key=${encodeURIComponent(config.apiKey)}`;
    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401) {
        console.error("❌ Ongeldige API key! Check je instellingen.");
        return;
      }
      console.error(`❌ Server error ${res.status}: ${text}`);
      return;
    }

    const data = await res.json();
    const jobs = data.jobs || [];

    if (jobs.length === 0) return;

    console.log(`\n📥 ${jobs.length} printjob(s) ontvangen`);

    for (const job of jobs) {
      const label = job.label_data;
      const jobType = job.job_type || "repair_label";
      const formatKey = label.label_format || "brother_62mm";

      // Determine display name for logging
      const KNOWN_TYPES = ["repair_label", "part_label", "refurbished_label", "apk_label", "accessory_label"];
      const typeEmoji = { repair_label: "🔧", part_label: "⚙️", refurbished_label: "💻", apk_label: "📋", accessory_label: "🔌" };
      const emoji = typeEmoji[jobType] || "❓";
      const refId = label.jobId || label.job_id || label.short_id || job.reference_id || "?";
      const refName = label.klant || label.customer_name || label.customerName || label.brand || "Onbekend";
      console.log(`   ${emoji} [${jobType}] ${refId} - ${refName} (${formatKey})`);

      // Reject unknown job types immediately
      if (!KNOWN_TYPES.includes(jobType)) {
        console.error(`   ❌ Onbekend job_type: "${jobType}"`);
        try {
          await fetch(`${config.serverUrl}/api/print-queue/poll?api_key=${encodeURIComponent(config.apiKey)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              job_id: job.id,
              status: "failed",
              error_message: `Onbekend job_type: "${jobType}"`,
            }),
          });
        } catch {}
        continue;
      }

      try {
        let imageBuffer;
        try {
          imageBuffer = await renderLabelToBuffer(jobType, label, formatKey);
        } catch (renderErr) {
          console.warn(`   ⚠️  Nieuwe renderer mislukt, fallback naar legacy: ${renderErr.message}`);
          imageBuffer = await renderLabelLegacy(label);
        }
        const success = await printLabel(imageBuffer, refId);

        // Report result back to server
        await fetch(`${config.serverUrl}/api/print-queue/poll?api_key=${encodeURIComponent(config.apiKey)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_id: job.id,
            status: success ? "printed" : "failed",
            error_message: success ? null : "Print failed",
          }),
        });
      } catch (err) {
        console.error(`   ❌ Fout bij verwerken: ${err.message}`);
        // Report failure
        try {
          await fetch(`${config.serverUrl}/api/print-queue/poll?api_key=${encodeURIComponent(config.apiKey)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              job_id: job.id,
              status: "failed",
              error_message: err.message,
            }),
          });
        } catch {}
      }
    }
  } catch (err) {
    // Network error - server unreachable
    if (err.code !== "ECONNREFUSED") {
      console.error(`⚠️  Polling error: ${err.message}`);
    }
  }
}

// ===== MAIN =====
async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║  🖨️  DDK Print Agent v1.0            ║");
  console.log("║  De Digitale Klusjesman              ║");
  console.log("╚══════════════════════════════════════╝");

  const config = await setup();

  // Verify connection
  console.log("\n🔌 Verbinding testen...");
  try {
    const res = await fetch(`${config.serverUrl}/api/print-queue/poll?api_key=${encodeURIComponent(config.apiKey)}`);
    if (res.ok) {
      console.log("✅ Verbonden met server!\n");
    } else if (res.status === 401) {
      console.error("❌ Ongeldige API key!");
      process.exit(1);
    } else {
      console.warn(`⚠️  Server antwoordde met status ${res.status}`);
    }
  } catch (err) {
    console.error(`❌ Kan niet verbinden: ${err.message}`);
    console.log("   Is de server URL correct?\n");
  }

  console.log(`📡 Polling elke ${POLL_INTERVAL / 1000}s voor printjobs...\n`);
  console.log("   Druk Ctrl+C om te stoppen\n");

  // Start polling
  setInterval(() => pollForJobs(config), POLL_INTERVAL);
  // Also poll immediately
  pollForJobs(config);
}

main().catch(console.error);
