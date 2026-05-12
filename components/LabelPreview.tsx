"use client";

import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { COMPANY, LABEL, DEVICE_TYPE_LABELS, getBrandColor, ACCESSORY_TYPES } from "@/lib/config";
import { useEffect, useState } from "react";

/**
 * LabelPreview - Single Source of Truth for thermal printer labels
 * 
 * Accepts repair data from:
 * 1. Form state (Inboeken page): klant, merk, model, omschrijving, etc.
 * 2. Database queries (Print/Checkout pages): jobid, klant, merk, model, etc.
 * 
 * Uses comprehensive fallback patterns to handle both data sources seamlessly.
 * 
 * All label settings (company name, sections, etc.) come from lib/config.ts
 */

export default function LabelPreview({ repair }: { repair?: any }) {
  // Handle null/undefined repair
  const safeRepair = repair || {};

  // CRITICAL: Comprehensive data mapping for BOTH form state AND database columns
  // Each field has multiple fallback patterns to handle different data sources
  
  // Barcode / QR Value (Database: jobid, Form: jobId)
  const barcodeValue = safeRepair.jobid || safeRepair.jobId || safeRepair.job_id || safeRepair.id || "ERROR";
  
  // Customer Name - prefer first_name + last_name, then fall back
  const firstName = safeRepair.first_name || safeRepair.voornaam || "";
  const lastName = safeRepair.last_name || "";
  const klantNaam = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : (safeRepair.customer_name || safeRepair.klant || safeRepair.customer || safeRepair.name || "—");
  
  // Brand/Merk (Database: merk OR device_brand, Form: merk)
  const merk = safeRepair.device_brand || safeRepair.merk || safeRepair.brand || safeRepair.source_brand || "—";
  
  // Model/Device (Database: model OR device_model, Form: model)
  const model = safeRepair.device_model || safeRepair.model || safeRepair.device || safeRepair.source_model || "—";
  
  // Device Type (Laptop, Desktop, Printer, etc.) - Use central config
  const deviceType = safeRepair.device_type || safeRepair.deviceType || "";
  const deviceTypeLabel = DEVICE_TYPE_LABELS[deviceType as keyof typeof DEVICE_TYPE_LABELS] || deviceType;
  
  // Serial Number (Multiple variants)
  const serial = safeRepair.serial_number || safeRepair.serial || safeRepair.sn || safeRepair.serienummer || "";
  
  // Device Password
  const devicePassword = safeRepair.device_password || "";
  
  // Problem Description (Database: omschrijving OR problem_description, Generic: problem/description)
  const klacht = safeRepair.problem_description || safeRepair.omschrijving || safeRepair.problem || safeRepair.description || "—";
  
  // Contact Info
  const email = safeRepair.email || safeRepair.customer_email || "";
  const telefoon = safeRepair.telefoon || safeRepair.phone || safeRepair.telefonnummer || "";
  const klantnummer = safeRepair.klantnummer || safeRepair.customer_number || "";
  
  // Address Info
  const adres = safeRepair.adres || safeRepair.address || "";
  const woonplaats = safeRepair.woonplaats || safeRepair.city || safeRepair.location || "";
  
  // Financial Info
  const prijsafspraak = safeRepair.prijsafspraak || safeRepair.price_agreement || safeRepair.agreed_price || "";
  const kosten = safeRepair.kosten || safeRepair.costs || safeRepair.cost || "";
  
  // Parts/Onderdelen (Database: onderdeel_naam/onderdelen, Checkbox: onderdeel_besteld)
  const rawParts = safeRepair.onderdeel_naam || safeRepair.onderdelen || "";
  const supplier = safeRepair.onderdeel_leverancier || safeRepair.leverancier || "-";
  // Handle boolean and string representations
  const partsOrdered = safeRepair.onderdeel_besteld === true || safeRepair.onderdeel_besteld === "true";
  
  // Split parts by newline (handles both \r\n and \n)
  const partLines = rawParts.split(/\r?\n/).filter((line: string) => line.trim() !== "");
  const showPartsBlock = partLines.length > 0 || partsOrdered;

  // Accessories (JSONB array from database or form)
  const accessories = safeRepair.accessories || [];
  const showAccessoriesBlock = accessories.length > 0;

  // Brand color for visual identification (SSR-safe default, hydrate on client)
  const defaultBrandColor = getBrandColor(merk);
  const [hydratedBrandColor, setHydratedBrandColor] = useState(defaultBrandColor);

  useEffect(() => {
    // Only run on client
    try {
      const custom = window?.localStorage?.getItem("brandColors");
      if (custom) {
        const parsed = JSON.parse(custom);
        if (parsed[merk]) {
          setHydratedBrandColor((prev) => ({
            ...prev,
            hex: parsed[merk],
          }));
        }
      }
    } catch {}
  }, [merk]);

  // Mode detection (explicit flag preferred)
  const mode: "repair" | "apk" | "refurbished" | "part" = (safeRepair?.type || safeRepair?.mode || "repair") as any;
  
  // Part-specific data
  const partCategory = safeRepair.category || safeRepair.part_type || "Onderdeel";
  const partQuantity = safeRepair.quantity || safeRepair.qty || "1";
  const partDisplayId = safeRepair.short_id || safeRepair.part_id || safeRepair.id || "ERROR";
  const partBarcodeValue = safeRepair.short_id || safeRepair.part_id || safeRepair.id || partDisplayId;
  const partNotes = safeRepair.notes || safeRepair.part_notes || safeRepair.note || "";
  const partHarvestedRaw = safeRepair.harvested_date || safeRepair.created_at || "";
  const partHarvested = partHarvestedRaw
    ? new Date(partHarvestedRaw).toLocaleString("nl-NL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const getBarcodeFormat = (value: string) => {
    if (LABEL.barcodeType === "EAN13" && !/^\d{12,13}$/.test(value)) {
      return "CODE128";
    }
    return LABEL.barcodeType;
  };

  return (
      <div
        id="label-print-area"
        className="bg-white text-black font-sans border-2 border-black box-border"
        style={{
          width: "62mm",
          height: "auto",
          fontSize: "11px",
          paddingTop: "6mm",
          paddingBottom: "9mm",
          paddingLeft: "2.5mm",
          paddingRight: "2.5mm",
        }}
      >
        {/* STRICT MODE RENDERING */}
        {mode === "part" ? (
          <>
            {/* HEADER: Category + Quantity */}
            <div className="flex justify-between items-center p-1 border-b-2 border-black">
              <div className="flex-1">
                <p className="text-[13px] font-extrabold uppercase tracking-wider text-black">{partCategory}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-black">Qty: {partQuantity}</p>
              </div>
            </div>

            {/* BODY: Specs (Primary) + Brand/Model */}
            <div className="p-2 border-b-2 border-black">
              <p className="text-center text-[16px] font-black text-black mb-1 leading-tight">
                {safeRepair.specs || safeRepair.part_specs || "—"}
              </p>
              {(merk || model) && (
                <p className="text-center text-[11px] leading-tight text-black font-semibold">{merk} {model}</p>
              )}
              {serial && (
                <p className="text-center text-[9px] leading-tight text-black font-mono mt-1">SN: {serial}</p>
              )}
              {partNotes && (
                <p className="text-center text-[9px] leading-tight text-black mt-1">{partNotes}</p>
              )}
              {partHarvested && (
                <p className="text-center text-[8px] leading-tight text-gray-600 mt-1">{partHarvested}</p>
              )}
            </div>

            {/* BARCODE - At Bottom */}
            <div className="p-1 bg-white border-t-2 border-black">
              <p className="text-center text-[9px] font-mono font-bold text-black mb-1">ID: {partDisplayId}</p>
              <div id="barcode-preview-element" className="flex justify-center">
                <Barcode value={partBarcodeValue} format={getBarcodeFormat(partBarcodeValue)} width={2.8} height={85} fontSize={9} margin={2} displayValue={false} />
              </div>
            </div>
          </>
        ) : mode === "apk" ? (
          <>
            {/* HEADER: Title + small QR */}
            <div className="flex justify-between items-center p-1 border-b-2 border-black">
              <div className="flex-1 pr-1">
                <p className="text-[11px] font-extrabold uppercase tracking-wider">APK Rapport</p>
                <p className="text-[9px] font-mono">Job: <span className="font-bold">{barcodeValue}</span></p>
              </div>
              <div>
                <QRCodeSVG value={barcodeValue} size={40} level="M" includeMargin={false} />
              </div>
            </div>

            {/* DEVICE INFO */}
            <div className="p-1 border-b-2 border-black">
              <p className="text-[9px] font-bold uppercase mb-0.5">Apparaat</p>
              <p className="text-[11px] leading-tight font-bold">{klantNaam} | {merk} {model}</p>
            </div>

            {/* CHECKLIST - Dense */}
            <div className="p-1 border-b-2 border-black block-section">
              <p className="text-[9px] font-bold uppercase mb-1">Checklist</p>
                <ul className="grid grid-cols-2 gap-x-1 gap-y-0.5 min-w-0">
                  {(() => {
                    const items = [
                      "Windows Update","Driver Update","Firmware Update","Disk Cleanup (Admin)",
                      "Taakbalk Instellingen uitzetten","Widgets & Nieuws widgets uitzetten","msconfig check",
                      "Opstart check","Temp files clean","Intern reinigen","Extern reinigen", "ScanCircle scan doen"
                    ];
                    if (items.length % 2 !== 0) items.push("");
                    return items.map((item, idx) => (
                      <li key={item + idx} className="text-[11px] font-bold leading-tight text-black break-words min-w-0">{item ? `[ ] ${item.replace(/^[^a-zA-Z0-9]+/, "")}` : ""}</li>
                    ));
                  })()}
                </ul>
            </div>

            {/* SIGNATURE LINES - Footer block */}
            <div className="p-1 border-b-2 border-black">
              <p className="text-[9px] font-bold uppercase mb-1">Registratie</p>
              <div className="space-y-1">
                <p className="text-[10px] leading-tight">Monteur: <span className="inline-block align-middle">________________</span></p>
                <p className="text-[10px] leading-tight">Datum: <span className="inline-block align-middle">__/__/__</span></p>
              </div>
            </div>

            {/* BARCODE - Footer */}
            <div className="flex flex-col items-center p-1 bg-white border-t-2 border-black" style={{paddingBottom: '8mm'}}>
              <Barcode value={barcodeValue} format={getBarcodeFormat(barcodeValue)} width={2.2} height={52} fontSize={10} margin={2} displayValue={false} />
              <div style={{fontSize: '10px', marginTop: '2mm', letterSpacing: '1px'}}>{barcodeValue}</div>
            </div>
          </>
        ) : mode === "refurbished" ? (
          <>
            {/* HEADER: Logo + QR */}
            <div className="flex justify-between items-center p-1 border-b-2 border-black">
              <div className="flex-1 pr-1">
                <img src="/logo.png" alt="Logo" className="h-14 w-auto object-contain" />
              </div>
              <div>
                <QRCodeSVG value={barcodeValue} size={45} level="M" includeMargin={false} />
              </div>
            </div>

            {/* SPECIFICATIES */}
            <div className="p-1 border-b-2 border-black">
              <p className="text-[9px] font-bold uppercase mb-0.5">Specificaties</p>
              <p className="text-[11px] leading-tight font-bold">{merk} {model}</p>
              {serial && (<p className="text-[9px] leading-tight font-mono">SN: <span className="font-bold">{serial}</span></p>)}
              {klacht && (<p className="text-[9px] leading-tight">{klacht}</p>)}
            </div>

            {/* BARCODE - Footer */}
            <div className="flex flex-col items-center p-1 bg-white border-t-2 border-black" style={{minHeight: '60px'}}>
              <Barcode value={barcodeValue} format={getBarcodeFormat(barcodeValue)} width={2.2} height={45} fontSize={9} margin={2} displayValue={true} />
            </div>
          </>
        ) : (
          <>
            {/* ORIGINAL REPAIR LAYOUT */}
            {/* HEADER: Logo + QR Code */}
            <div className="flex justify-between items-center p-1 border-b-2 border-black">
              {/* Logo - Left */}
              <div className="flex-1 pr-1">
                <img src="/logo.png" alt="Logo" className="h-14 w-auto object-contain" />
              </div>
              {/* QR Code - Right */}
              <div>
                <QRCodeSVG value={barcodeValue} size={45} level="M" includeMargin={false} />
              </div>
            </div>

            {/* KLANT BLOCK */}
            <div className="p-1 border-b-2 border-black">
              <p className="text-[9px] font-bold uppercase text-black mb-0.5">{LABEL.sections.customer}</p>
              <p className="text-[11px] leading-tight font-bold text-black">{klantNaam}</p>
              {klantnummer && (<p className="text-[9px] leading-tight text-black">Nr: <span className="font-bold">{klantnummer}</span></p>)}
              {adres && (<p className="text-[9px] leading-tight text-black">{adres}</p>)}
              {woonplaats && (<p className="text-[9px] leading-tight text-black">{woonplaats}</p>)}
              {telefoon && (<p className="text-[9px] leading-tight text-black">T: <span className="font-bold">{telefoon}</span></p>)}
              {email && (<p className="text-[9px] leading-tight text-black break-words">E: <span className="font-bold text-[8px]">{email}</span></p>)}
            </div>

            {/* APPARAAT BLOCK - With Brand Color Indicator */}
            <div className="p-1 border-b-2 border-black relative">
              {/* Brand Color Bar */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1" 
                style={{ backgroundColor: hydratedBrandColor.hex }}
              />
              <div className="pl-2">
                <p className="text-[9px] font-bold uppercase text-black mb-0.5">{LABEL.sections.device} {deviceTypeLabel && <span className="normal-case font-normal">({deviceTypeLabel})</span>}</p>
                <p className="text-[11px] leading-tight font-bold text-black">{merk} {model}</p>
                {serial && (<p className="text-[9px] leading-tight text-black font-mono">SN: <span className="font-bold">{serial}</span></p>)}
                {devicePassword && (<p className="text-[9px] leading-tight text-black">WW: <span className="font-bold">{devicePassword}</span></p>)}
              </div>
            </div>

            {/* KLACHT BLOCK */}
            <div className="p-1 border-b-2 border-black">
              <p className="text-[9px] font-bold uppercase text-black mb-0.5">{LABEL.sections.problem}</p>
              <p className="text-[10px] leading-tight text-black line-clamp-3 whitespace-pre-wrap break-words">{klacht}</p>
            </div>

            {/* ONDERDELEN / LEVERANCIER BLOCK */}
            {showPartsBlock && (
              <div className="border-b-2 border-black p-1">
                <div className="text-[9px] font-bold uppercase mb-0.5">Onderdelen:</div>
                <ul className="list-inside mb-1">
                  {partLines.map((line: string, i: number) => (
                    <li key={i} className="text-[10px] font-bold leading-tight truncate">- {line}</li>
                  ))}
                </ul>
                <div className="text-[10px]"><span className="font-bold uppercase text-[9px]">Lev:</span> {supplier}</div>
              </div>
            )}

            {/* ACCESSOIRES BLOCK */}
            {showAccessoriesBlock && (
              <div className="border-b-2 border-black p-1 bg-amber-50 block-section">
                <div className="text-[9px] font-bold uppercase mb-0.5">Meegenomen:</div>
                <div className="space-y-0.5">
                  {accessories.map((acc: { type: string; label: string; quantity: number; notes: string }, i: number) => (
                    <div key={i} className="text-[10px] leading-tight flex items-center gap-1">
                      <span className="font-bold">{acc.quantity}x</span>
                      <span>{acc.label}</span>
                      {acc.notes && <span className="text-gray-600 text-[8px]">({acc.notes})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FINANCIEEL BLOCK */}
            {(prijsafspraak || kosten) && (
              <div className="p-1 border-b-2 border-black">
                <p className="text-[9px] font-bold uppercase text-black mb-0.5">Financieel</p>
                {prijsafspraak && (<p className="text-[9px] leading-tight text-black flex justify-between"><span className="font-bold">Prijs:</span><span className="font-mono">€ {prijsafspraak}</span></p>)}
                {kosten && (<p className="text-[9px] leading-tight text-black flex justify-between"><span className="font-bold">Kosten:</span><span className="font-mono">€ {kosten}</span></p>)}
              </div>
            )}

            {/* BARCODE - Footer */}
            <div className="flex justify-center p-1 bg-white border-t-2 border-black">
              <Barcode value={barcodeValue} format={getBarcodeFormat(barcodeValue)} width={2.2} height={45} fontSize={9} margin={2} displayValue={true} />
            </div>
          </>
        )}

        {/* Print Styles - Critical fix for blank page issue */}
        <style type="text/css" media="print">{`
          @page {
            size: 62mm auto;
            margin: 0;
          }
          body {
            visibility: hidden;
          }
          #label-print-area {
            visibility: visible !important;
            position: fixed;
            left: 0;
            top: 0;
            width: 62mm !important;
            margin: 0;
            padding: 6mm 2.5mm 9mm 2.5mm !important;
            z-index: 9999;
            background: white;
          }
          #label-print-area * {
            visibility: visible !important;
          }
          /* Tighter spacing for high DPI, but with more vertical margin between blocks */
          #label-print-area p, #label-print-area li, #label-print-area span, #label-print-area div {
            margin-top: 0;
            margin-bottom: 0;
            padding-top: 0;
            padding-bottom: 0;
          }
          #label-print-area .block-section {
            margin-top: 3.5mm;
            margin-bottom: 3.5mm;
          }
        `}</style>
      </div>
  );
}



