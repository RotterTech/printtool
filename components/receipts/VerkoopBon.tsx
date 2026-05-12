"use client";

import Barcode from "react-barcode";
import { COMPANY } from "@/lib/config";

interface VerkoopBonProps {
  item: {
    brand?: string;
    model?: string;
    cpu?: string;
    ram?: string;
    ssd?: string;
    screen?: string;
    os?: string;
    serial_number?: string;
    price?: string | number;
    origin?: string;
    id?: string;
    [key: string]: any;
  };
  koper?: {
    naam?: string;
    email?: string;
    telefoon?: string;
  };
}

export default function VerkoopBon({ item, koper }: VerkoopBonProps) {
  const i = item || {};
  const k = koper || {};

  const itemId = i.id || i.short_id || Math.random().toString(16).substring(2, 8).toUpperCase();
  const prijs = i.price || "—";
  const datum = new Date().toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });
  const garantieTot = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });

  const specs = [
    { label: "Merk/Model", value: `${i.brand || ""} ${i.model || ""}`.trim() },
    { label: "Processor", value: i.cpu },
    { label: "Geheugen", value: i.ram },
    { label: "Opslag", value: i.ssd },
    { label: "Scherm", value: i.screen },
    { label: "Besturingssysteem", value: i.os },
    { label: "Serienummer", value: i.serial_number || i.serial },
  ].filter(s => s.value);

  return (
    <div
      id="receipt-print-area"
      className="bg-white text-black font-sans"
      style={{
        width: "80mm",
        fontSize: "11px",
        padding: "4mm",
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      {/* HEADER */}
      <div className="text-center border-b-2 border-black pb-2 mb-2">
        <img src="/logo.png" alt="Logo" className="h-12 mx-auto mb-1" />
        <p className="text-[14px] font-black uppercase tracking-wide">{COMPANY.name}</p>
        <p className="text-[9px] text-gray-600">{COMPANY.website} | {COMPANY.phone}</p>
        {COMPANY.kvk && <p className="text-[8px] text-gray-500">KvK: {COMPANY.kvk} | BTW: {COMPANY.btw}</p>}
      </div>

      {/* TITEL */}
      <div className="text-center mb-2">
        <p className="text-[16px] font-black uppercase tracking-wider">Verkoopbon</p>
        <p className="text-[9px] text-gray-500">Refurbished apparaat</p>
      </div>

      {/* META */}
      <div className="border border-black rounded p-1.5 mb-2 bg-gray-50 text-[9px]">
        <div className="flex justify-between">
          <span><span className="font-bold">Bonnr:</span> {itemId}</span>
          <span><span className="font-bold">Datum:</span> {datum}</span>
        </div>
      </div>

      {/* KOPER */}
      {(k.naam || k.email || k.telefoon) && (
        <div className="mb-2">
          <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Koper</p>
          {k.naam && <p className="text-[11px] font-bold">{k.naam}</p>}
          {k.telefoon && <p className="text-[10px]">Tel: {k.telefoon}</p>}
          {k.email && <p className="text-[10px] break-words">Email: {k.email}</p>}
        </div>
      )}

      {/* PRODUCT SPECIFICATIES */}
      <div className="mb-2">
        <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Product specificaties</p>
        <table className="w-full text-[10px]">
          <tbody>
            {specs.map((spec, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                <td className="font-bold pr-2 py-0.5 w-24">{spec.label}:</td>
                <td className="py-0.5">{spec.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PRIJS */}
      <div className="mb-2 border-2 border-black rounded p-2 bg-gray-50">
        <div className="flex justify-between items-center">
          <p className="text-[10px] font-bold uppercase">Verkoopprijs:</p>
          <p className="text-[18px] font-black">€ {prijs}</p>
        </div>
      </div>

      {/* GARANTIE */}
      <div className="mb-2 p-1.5 border border-dashed border-green-600 rounded bg-green-50">
        <p className="text-[10px] font-bold uppercase text-green-800 mb-0.5">✅ 1 Jaar Garantie</p>
        <p className="text-[9px] text-green-700">
          Dit refurbished apparaat heeft 1 jaar garantie op hardware defecten.
        </p>
        <p className="text-[9px] font-bold text-green-800 mt-1">
          Geldig t/m: {garantieTot}
        </p>
        <p className="text-[8px] text-green-600 mt-0.5">
          Garantie vervalt bij waterschade, val/stoot, of ingrepen door derden.
        </p>
      </div>

      {/* VOORWAARDEN */}
      <div className="mb-2 text-[7px] text-gray-500 leading-tight">
        <p>• Ruilen/retour binnen 14 dagen in originele staat.</p>
        <p>• Software ondersteuning valt niet onder garantie.</p>
        <p>• Bewaar deze bon als garantiebewijs.</p>
      </div>

      {/* HANDTEKENING */}
      <div className="mb-2">
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-[8px] font-bold uppercase mb-6">Koper:</p>
            <div className="border-b border-black" />
          </div>
          <div className="flex-1">
            <p className="text-[8px] font-bold uppercase mb-6">Verkoper:</p>
            <div className="border-b border-black" />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center pt-1 border-t-2 border-black">
        <Barcode value={itemId} format="CODE128" width={1.8} height={30} fontSize={9} margin={2} displayValue={true} />
        <p className="text-[8px] text-gray-400 mt-1">Bedankt voor uw aankoop! | {COMPANY.website}</p>
      </div>
    </div>
  );
}
