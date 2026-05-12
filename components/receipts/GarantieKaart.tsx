"use client";

import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { COMPANY } from "@/lib/config";

interface GarantieKaartProps {
  repair: any;
  /** Warranty duration in days (default 90 for repairs) */
  garantieDagen?: number;
}

export default function GarantieKaart({ repair, garantieDagen = 90 }: GarantieKaartProps) {
  const r = repair || {};

  const jobId = r.job_id || r.jobid || r.jobId || r.id || "—";
  const firstName = r.first_name || r.voornaam || "";
  const lastName = r.last_name || "";
  const klantNaam = (firstName || lastName)
    ? `${firstName} ${lastName}`.trim()
    : r.customer_name || r.klant || "Klant";
  const merk = r.device_brand || r.merk || "";
  const model = r.device_model || r.model || "";
  const serial = r.serial_number || r.serial || "";
  const klacht = r.problem_description || r.omschrijving || "";
  const onderdeel = r.onderdeel_naam || "";

  const datumUit = r.datum_uit || new Date().toISOString();
  const garantieStart = new Date(datumUit);
  const garantieEind = new Date(garantieStart.getTime() + garantieDagen * 24 * 60 * 60 * 1000);

  const formatDate = (d: Date) => d.toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });

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
      {/* HEADER - Green themed */}
      <div className="text-center border-b-2 border-green-800 pb-2 mb-2">
        <img src="/logo.png" alt="Logo" className="h-12 mx-auto mb-1" />
        <p className="text-[14px] font-black uppercase tracking-wide text-green-800">{COMPANY.name}</p>
      </div>

      {/* TITEL */}
      <div className="text-center mb-2 py-2 bg-green-50 border border-green-300 rounded">
        <p className="text-[18px] font-black uppercase tracking-wider text-green-800">Garantiebewijs</p>
        <p className="text-[9px] text-green-600">Bewaar dit document zorgvuldig</p>
      </div>

      {/* GARANTIE PERIODE */}
      <div className="border-2 border-green-600 rounded p-2 mb-2 bg-green-50">
        <div className="text-center mb-1">
          <p className="text-[24px] font-black text-green-800">{garantieDagen} DAGEN</p>
          <p className="text-[9px] font-bold text-green-700 uppercase">Garantie op uitgevoerde werkzaamheden</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[9px] mt-1">
          <div className="text-center">
            <p className="font-bold text-green-800">Van:</p>
            <p>{formatDate(garantieStart)}</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-green-800">Tot:</p>
            <p className="font-bold">{formatDate(garantieEind)}</p>
          </div>
        </div>
      </div>

      {/* DETAILS */}
      <div className="mb-2">
        <table className="w-full text-[10px]">
          <tbody>
            <tr><td className="font-bold pr-2 py-0.5 w-20">Ref.nr:</td><td className="font-mono font-bold">{jobId}</td></tr>
            <tr><td className="font-bold pr-2 py-0.5">Klant:</td><td>{klantNaam}</td></tr>
            <tr><td className="font-bold pr-2 py-0.5">Apparaat:</td><td>{merk} {model}</td></tr>
            {serial && <tr><td className="font-bold pr-2 py-0.5">SN:</td><td className="font-mono text-[9px]">{serial}</td></tr>}
            {klacht && <tr><td className="font-bold pr-2 py-0.5">Reparatie:</td><td>{klacht}</td></tr>}
            {onderdeel && <tr><td className="font-bold pr-2 py-0.5">Onderdeel:</td><td>{onderdeel}</td></tr>}
          </tbody>
        </table>
      </div>

      {/* VOORWAARDEN */}
      <div className="mb-2 p-1.5 bg-gray-50 rounded text-[8px] text-gray-600 leading-tight">
        <p className="font-bold text-[9px] text-black mb-0.5">Garantievoorwaarden:</p>
        <p>1. Garantie geldt uitsluitend op de uitgevoerde reparatie.</p>
        <p>2. Garantie vervalt bij:</p>
        <p className="pl-2">- Water-, val- of stootschade</p>
        <p className="pl-2">- Ingrepen door derden</p>
        <p className="pl-2">- Verkeerd gebruik of nalatigheid</p>
        <p>3. Dit document dient als bewijs. Bewaar zorgvuldig.</p>
        <p>4. Neem contact op via {COMPANY.phone} of {COMPANY.email}.</p>
      </div>

      {/* QR + BARCODE */}
      <div className="flex items-center justify-between pt-1 border-t-2 border-green-800">
        <QRCodeSVG value={`https://pc-picker.nl/status/${r.status_token || jobId}`} size={45} level="M" />
        <div className="flex-1 ml-2">
          <Barcode value={jobId} format="CODE128" width={1.5} height={30} fontSize={8} margin={1} displayValue={true} />
        </div>
      </div>
      <p className="text-[8px] text-gray-400 text-center mt-1">{COMPANY.name} | {COMPANY.website}</p>
    </div>
  );
}
