"use client";

import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { ACCESSORY_TYPES } from "@/lib/config";

/**
 * AccessoryLabel - Label for accessories (bag, adapter, cable, etc.)
 * 
 * This is a smaller label that gets attached to accessories
 * It links back to the main repair via Job ID
 */

type AccessoryLabelProps = {
  accessory: {
    type: string;
    label: string;
    quantity: number;
    notes: string;
  };
  jobId: string;
  customerName: string;
};

export default function AccessoryLabel({ accessory, jobId, customerName }: AccessoryLabelProps) {
  const accType = ACCESSORY_TYPES.find(a => a.value === accessory.type);
  
  // Create a unique accessory ID based on job + accessory type
  const accessoryId = `${jobId}-${accessory.type.substring(0, 3).toUpperCase()}`;

  return (
    <div
      id="accessory-label-print-area"
      className="bg-white text-black font-sans border-2 border-black box-border"
      style={{
        width: "62mm",
        height: "auto",
        minHeight: "40mm",
      }}
    >
      {/* HEADER: Accessory Type + Emoji */}
      <div className="flex justify-between items-center p-1.5 border-b-2 border-black bg-amber-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{accType?.emoji || "📎"}</span>
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-wider text-black">
              {accessory.label}
            </p>
            <p className="text-[10px] text-gray-600">
              Hoort bij reparatie: <span className="font-bold">{jobId}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[14px] font-black text-black">{accessory.quantity}x</p>
        </div>
      </div>

      {/* KLANT INFO */}
      <div className="p-1.5 border-b-2 border-black">
        <p className="text-[9px] font-bold uppercase text-black mb-0.5">Klant</p>
        <p className="text-[11px] leading-tight font-bold text-black">{customerName}</p>
      </div>

      {/* NOTES (if any) */}
      {accessory.notes && (
        <div className="p-1.5 border-b-2 border-black">
          <p className="text-[9px] font-bold uppercase text-black mb-0.5">Notitie</p>
          <p className="text-[10px] leading-tight text-black">{accessory.notes}</p>
        </div>
      )}

      {/* QR Code for quick scan to find repair */}
      <div className="flex justify-between items-center p-1.5 border-b-2 border-black">
        <div className="flex-1">
          <p className="text-[9px] font-bold uppercase text-black mb-0.5">Scan voor reparatie</p>
          <p className="text-[11px] font-mono font-bold">{accessoryId}</p>
        </div>
        <QRCodeSVG value={jobId} size={35} level="M" includeMargin={false} />
      </div>

      {/* BARCODE - Footer */}
      <div className="flex justify-center p-1 bg-white border-t-2 border-black">
        <Barcode 
          value={accessoryId} 
          format="CODE128" 
          width={1.6} 
          height={30} 
          fontSize={8} 
          margin={1} 
          displayValue={true} 
        />
      </div>
    </div>
  );
}
