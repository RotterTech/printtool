"use client";

import React from "react";
import Barcode from "react-barcode";
import { LABEL } from "@/lib/config";

interface PartLabelProps {
  part: any; // Accept any object shape for maximum robustness
  previewMode?: boolean;
}

export function PartLabel({ part, previewMode = false }: PartLabelProps) {
  // EXTREMELY ROBUST variable extraction with cascading fallbacks
  // This handles any possible property name convention
  const serial =
    part?.serial_number ||
    part?.serial ||
    part?.sn ||
    part?.serialNumber ||
    "";

  const brand =
    part?.brand ||
    part?.source_brand ||
    part?.merk ||
    "";

  const model =
    part?.model ||
    part?.source_model ||
    part?.device_model ||
    "";

  const specs =
    part?.specs ||
    part?.part_specs ||
    part?.specifications ||
    "";

  const notes =
    part?.notes ||
    part?.part_notes ||
    part?.note ||
    "";

  const category =
    part?.category ||
    part?.type ||
    part?.part_type ||
    "Onderdeel";

  // Clean ID extraction with cascading fallbacks
  const rawPartId = part?.id || part?.short_id || part?.part_id || "ERROR";
  const fullId = (rawPartId || "").toString().trim().toUpperCase();
  
  // STRICT ID Logic: Use short_id from DB, OR derive from UUID prefix. NEVER generate random.
  // Priority: 1. DB short_id (e.g., "P482931")
  //           2. Derive from UUID (e.g., "P8F4A9C2D")
  //           3. ERROR (if nothing available)
  const displayId = part?.short_id ? part.short_id : (part?.id ? part.id : "ERROR");
  
  // Log for debugging (will appear in console during development)
  React.useEffect(() => {
    if (previewMode) {
      console.log("PartLabel Debug:", {
        provided_short_id: part?.short_id || "undefined",
        fullId,
        displayId,
        category,
        brand,
        model,
        specs,
        serial,
        rawPart: part,
      });
    }
  }, [part, previewMode, displayId]);
  
  // Use displayId for barcode (NO random generation, strict fallback only)
  const barcodeValue = part?.short_id || part?.part_id || part?.id || displayId;

  const getBarcodeFormat = (value: string) => {
    if (LABEL.barcodeType === "EAN13" && !/^\d{12,13}$/.test(value)) {
      return "CODE128";
    }
    return LABEL.barcodeType;
  };

  return (
    <div
      className={`w-[62mm] flex flex-col justify-between p-2 border-2 border-black rounded-sm bg-white ${
        previewMode ? "mx-auto my-4 shadow-md" : ""
      }`}
      style={{
        height: "auto",
        minHeight: "160px",
      }}
    >
      {/* Top Section: Category + Specs + ID - High Contrast */}
      <div className="text-center pb-2 border-b-2 border-black">
        <p className="font-black text-base leading-tight text-black">
          {category}
        </p>
        {specs && (
          <p className="font-bold text-sm leading-tight text-black">
            {specs}
          </p>
        )}
        {notes && (
          <p className="text-[9px] leading-tight text-black mt-1">
            {notes}
          </p>
        )}
        {/* Explicit ID Display - Bold and Readable */}
        <p className="font-mono font-black text-lg leading-tight text-black mt-1">
          {displayId}
        </p>
      </div>

      {/* Middle Section: Origin Info + Serial Number */}
      <div className="text-center py-2 flex-1 flex flex-col items-center justify-center">
        <p className="text-xs leading-tight text-black font-semibold">
          <span className="block">From:</span>
          <span className="block font-black">{brand}</span>
          <span className="block">{model}</span>
        </p>

        {/* EXPLICIT Serial Number Display - ALWAYS VISIBLE IF PRESENT */}
        {serial && (
          <span className="text-black font-mono font-bold text-sm block mt-1">
            SN: {serial}
          </span>
        )}
      </div>

      {/* Bottom Section: Barcode - Bold and scannable for 62mm label */}
      <div className="flex flex-col items-center justify-center pt-2 border-t-2 border-black">
        <div style={{ lineHeight: 1 }}>
          <Barcode
            value={barcodeValue}
            format={getBarcodeFormat(barcodeValue)}
            width={2.6}
            height={45}
            fontSize={0}
            margin={0}
            displayValue={false}
          />
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          div {
            margin: 0 !important;
            padding: 0.5rem !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
