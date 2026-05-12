"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { LABEL } from "@/lib/config";

// Client-side barcode (react-barcode is client-only)
const Barcode = dynamic(() => import("react-barcode"), { ssr: false });

// Client wrapper to trigger print on load
export default function ClientLabel({ part }: { part: any }) {
  useEffect(() => {
    // Auto-open print dialog
    window.print();
  }, []);

  const partId = part?.short_id || part?.id || "ERROR";
  const partBarcodeValue = part?.id || part?.short_id || part?.part_id || "ERROR";
  const category = part?.category || "Onderdeel";
  const brand = part?.brand || "";
  const model = part?.model || "";
  const specs = part?.specs || "";
  const quantity = part?.quantity || 1;

  const getBarcodeFormat = (value: string) => {
    if (LABEL.barcodeType === "EAN13" && !/^\d{12,13}$/.test(value)) {
      return "CODE128";
    }
    return LABEL.barcodeType;
  };

  return (
    <div
      id="label-print-area"
      className="bg-white text-black font-sans"
      style={{
        width: "62mm",
        minHeight: "100mm",
        margin: 0,
        padding: "6px",
        boxSizing: "border-box",
      }}
    >
      {/* Qty top-right */}
      <div className="text-right text-[10px] font-semibold text-gray-800 mb-1">
        Qty: {quantity}
      </div>

      {/* Category */}
      <div className="text-[14px] font-extrabold uppercase tracking-wide text-black mb-1">
        {category}
      </div>

      {/* Part ID */}
      <div className="text-[22px] font-black text-black leading-none mb-2">
        {partId}
      </div>


      {/* Brand / Model */}
      {(brand || model) && (
        <div className="text-[11px] font-semibold text-black mb-1">
          {[brand, model].filter(Boolean).join(" ")}
        </div>
      )}

      {/* Specs */}
      {specs && (
        <div className="text-[11px] text-black font-medium mb-2">
          {specs}
        </div>
      )}

      {/* Barcode */}
      <div className="mt-4 flex justify-center">
        <Barcode value={partBarcodeValue} format={getBarcodeFormat(partBarcodeValue)} width={2.8} height={55} fontSize={9} margin={2} displayValue={false} />
      </div>

      {/* Print styles scoped to print media */}
      <style jsx global>{`
        @page {
          size: 62mm auto;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          background: white;
        }
        /* Hide everything except the label */
        body * {
          visibility: hidden;
        }
        #label-print-area, #label-print-area * {
          visibility: visible;
        }
        #label-print-area {
          position: fixed;
          left: 0;
          top: 0;
          z-index: 9999;
          background: white;
        }
      `}</style>
    </div>
  );
}
