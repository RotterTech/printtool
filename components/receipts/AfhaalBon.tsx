"use client";

import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { COMPANY } from "@/lib/config";

interface AfhaalBonProps {
  repair: any;
}

export default function AfhaalBon({ repair }: AfhaalBonProps) {
  const r = repair || {};

  const jobId = r.job_id || r.jobid || r.jobId || r.id || "—";
  const firstName = r.first_name || r.voornaam || "";
  const lastName = r.last_name || "";
  const klantNaam = (firstName || lastName)
    ? `${firstName} ${lastName}`.trim()
    : r.customer_name || r.klant || "Klant";
  const email = r.customer_email || r.email || "";
  const telefoon = r.customer_phone || r.telefoon || "";
  const merk = r.device_brand || r.merk || "";
  const model = r.device_model || r.model || "";
  const serial = r.serial_number || r.serial || "";
  const klacht = r.problem_description || r.omschrijving || "";
  const kosten = r.kosten || r.agreed_price || r.prijsafspraak || "";
  const accessories = Array.isArray(r.accessories) ? r.accessories : [];
  const onderdeel = r.onderdeel_naam || "";
  const datumIn = r.datum_in || r.created_at || "";
  const datumUit = r.datum_uit || new Date().toISOString();

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString("nl-NL", {
      day: "2-digit", month: "long", year: "numeric",
    }) : "—";

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
      </div>

      {/* TITEL */}
      <div className="text-center mb-2">
        <p className="text-[16px] font-black uppercase tracking-wider">Afhaalbon</p>
        <p className="text-[9px] text-gray-500">Bewijs van afgifte gerepareerd apparaat</p>
      </div>

      {/* REFERENTIE */}
      <div className="border border-black rounded p-1.5 mb-2 bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[8px] font-bold uppercase text-gray-500">Referentienr.</p>
            <p className="text-[18px] font-black font-mono">{jobId}</p>
          </div>
          <QRCodeSVG value={jobId} size={40} level="M" />
        </div>
        <div className="flex justify-between text-[9px] text-gray-600 mt-1">
          <span>Inname: {formatDate(datumIn)}</span>
          <span>Afgifte: {formatDate(datumUit)}</span>
        </div>
      </div>

      {/* KLANT */}
      <div className="mb-2">
        <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Klant</p>
        <p className="text-[11px] font-bold">{klantNaam}</p>
        {telefoon && <p className="text-[10px]">Tel: {telefoon}</p>}
        {email && <p className="text-[10px] break-words">Email: {email}</p>}
      </div>

      {/* APPARAAT */}
      <div className="mb-2">
        <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Apparaat</p>
        <p className="text-[11px] font-bold">{merk} {model}</p>
        {serial && <p className="text-[9px] font-mono">SN: {serial}</p>}
      </div>

      {/* WERKZAAMHEDEN */}
      <div className="mb-2">
        <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Uitgevoerde werkzaamheden</p>
        {klacht && <p className="text-[10px]"><span className="font-bold">Klacht:</span> {klacht}</p>}
        {onderdeel && <p className="text-[10px]"><span className="font-bold">Onderdeel:</span> {onderdeel}</p>}
        <p className="text-[10px]"><span className="font-bold">Status:</span> ✅ Gerepareerd</p>
      </div>

      {/* TERUGGEGEVEN ACCESSOIRES */}
      {accessories.length > 0 && (
        <div className="mb-2">
          <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Teruggegeven accessoires</p>
          {accessories.map((acc: any, i: number) => (
            <div key={i} className="flex items-center text-[10px]">
              <span className="mr-1">☐</span>
              <span>{acc.quantity}x {acc.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* KOSTEN */}
      <div className="mb-2 border-2 border-black rounded p-2 bg-gray-50">
        <div className="flex justify-between items-center">
          <p className="text-[10px] font-bold uppercase">Totaal kosten:</p>
          <p className="text-[18px] font-black">
            {kosten ? `€ ${kosten}` : "n.v.t."}
          </p>
        </div>
      </div>

      {/* GARANTIE */}
      <div className="mb-2 p-1.5 border border-dashed border-green-600 rounded bg-green-50">
        <p className="text-[9px] font-bold uppercase text-green-800 mb-0.5">Garantie</p>
        <p className="text-[10px] text-green-700">
          90 dagen garantie op uitgevoerde reparatie.{"\n"}
          Garantie vervalt bij waterschade, val- of stootschade,{"\n"}
          of ingrepen door derden.
        </p>
        <p className="text-[9px] font-bold text-green-800 mt-1">
          Geldig t/m: {new Date(new Date(datumUit).getTime() + 90 * 24 * 60 * 60 * 1000)
            .toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* HANDTEKENINGEN */}
      <div className="mb-2 pt-1">
        <p className="text-[8px] text-gray-500 mb-2">
          Door ondertekening bevestigt de klant het apparaat en accessoires in goede orde te hebben ontvangen.
        </p>
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-[8px] font-bold uppercase mb-6">Klant:</p>
            <div className="border-b border-black" />
          </div>
          <div className="flex-1">
            <p className="text-[8px] font-bold uppercase mb-6">Medewerker:</p>
            <div className="border-b border-black" />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center pt-1 border-t-2 border-black">
        <Barcode value={jobId} format="CODE128" width={1.8} height={35} fontSize={9} margin={2} displayValue={true} />
        <p className="text-[8px] text-gray-400 mt-1">Bedankt voor uw vertrouwen! | {COMPANY.website}</p>
      </div>
    </div>
  );
}
