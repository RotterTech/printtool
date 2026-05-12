"use client";

import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { COMPANY } from "@/lib/config";

interface InnameBonProps {
  repair: any;
}

export default function InnameBon({ repair }: InnameBonProps) {
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
  const deviceType = r.device_type || "";
  const klacht = r.problem_description || r.omschrijving || "";
  const prijsafspraak = r.agreed_price || r.prijsafspraak || "";
  const accessories = Array.isArray(r.accessories) ? r.accessories : [];
  const datumIn = r.datum_in || r.created_at || new Date().toISOString();

  const datum = new Date(datumIn).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Public status URL for QR — prefer status_token (dynamic UUID)
  const statusUrl = `https://pc-picker.nl/status/${r.status_token || jobId}`;

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
      {/* HEADER: Bedrijf */}
      <div className="text-center border-b-2 border-black pb-2 mb-2">
        <img src="/logo.png" alt="Logo" className="h-12 mx-auto mb-1" />
        <p className="text-[14px] font-black uppercase tracking-wide">{COMPANY.name}</p>
        <p className="text-[9px] text-gray-600">{COMPANY.website} | {COMPANY.phone}</p>
        <p className="text-[9px] text-gray-600">{COMPANY.email}</p>
      </div>

      {/* TITEL */}
      <div className="text-center mb-2">
        <p className="text-[16px] font-black uppercase tracking-wider">Innamebon</p>
        <p className="text-[9px] text-gray-500">Bewijs van inname reparatie</p>
      </div>

      {/* REFERENTIE + DATUM */}
      <div className="border border-black rounded p-1.5 mb-2 bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[8px] font-bold uppercase text-gray-500">Referentienr.</p>
            <p className="text-[18px] font-black font-mono">{jobId}</p>
          </div>
          <QRCodeSVG value={statusUrl} size={50} level="M" />
        </div>
        <p className="text-[9px] text-gray-600 mt-1">Datum: {datum}</p>
      </div>

      {/* KLANTGEGEVENS */}
      <div className="mb-2">
        <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Klantgegevens</p>
        <p className="text-[11px] font-bold">{klantNaam}</p>
        {telefoon && <p className="text-[10px]">Tel: {telefoon}</p>}
        {email && <p className="text-[10px] break-words">Email: {email}</p>}
      </div>

      {/* APPARAAT */}
      <div className="mb-2">
        <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Apparaat</p>
        <table className="w-full text-[10px]">
          <tbody>
            {deviceType && (
              <tr><td className="font-bold pr-2 align-top w-16">Type:</td><td>{deviceType}</td></tr>
            )}
            <tr><td className="font-bold pr-2 align-top">Merk:</td><td>{merk}</td></tr>
            <tr><td className="font-bold pr-2 align-top">Model:</td><td>{model}</td></tr>
            {serial && (
              <tr><td className="font-bold pr-2 align-top">SN:</td><td className="font-mono text-[9px]">{serial}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PROBLEEM */}
      {klacht && (
        <div className="mb-2">
          <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Probleemomschrijving</p>
          <p className="text-[10px] whitespace-pre-wrap">{klacht}</p>
        </div>
      )}

      {/* ACCESSOIRES */}
      {accessories.length > 0 && (
        <div className="mb-2">
          <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Meegenomen accessoires</p>
          {accessories.map((acc: any, i: number) => (
            <p key={i} className="text-[10px]">
              • {acc.quantity}x {acc.label}{acc.notes ? ` (${acc.notes})` : ""}
            </p>
          ))}
        </div>
      )}

      {/* FINANCIEEL */}
      {prijsafspraak && (
        <div className="mb-2 border border-black rounded p-1.5 bg-gray-50">
          <p className="text-[9px] font-bold uppercase mb-0.5">Prijsafspraak</p>
          <p className="text-[14px] font-black">€ {prijsafspraak}</p>
          <p className="text-[8px] text-gray-500">Definitieve kosten kunnen afwijken</p>
        </div>
      )}

      {/* STATUS CHECK INFO */}
      <div className="text-center mb-2 py-1.5 border border-dashed border-gray-400 rounded bg-blue-50">
        <p className="text-[9px] font-bold uppercase text-blue-800">Status volgen?</p>
        <p className="text-[8px] text-blue-600">Scan de QR-code of ga naar:</p>
        <p className="text-[9px] font-bold text-blue-800">{COMPANY.website}/status/{jobId}</p>
      </div>

      {/* VOORWAARDEN */}
      <div className="mb-2 pt-1 border-t border-gray-300">
        <p className="text-[7px] text-gray-500 leading-tight">
          • Apparaten worden max. 90 dagen bewaard na gereedmelding.{"\n"}
          • Niet afgehaalde apparaten worden eigendom van {COMPANY.name}.{"\n"}
          • {COMPANY.name} is niet aansprakelijk voor dataverlies.{"\n"}
          • Reparatiekosten worden vooraf gecommuniceerd.{"\n"}
          • Garantie op reparatie: 90 dagen op uitgevoerde werkzaamheden.
        </p>
      </div>

      {/* HANDTEKENING */}
      <div className="mb-2 pt-1">
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-[8px] font-bold uppercase mb-4">Klant:</p>
            <div className="border-b border-black" />
          </div>
          <div className="flex-1">
            <p className="text-[8px] font-bold uppercase mb-4">Medewerker:</p>
            <div className="border-b border-black" />
          </div>
        </div>
      </div>

      {/* BARCODE FOOTER */}
      <div className="text-center pt-1 border-t-2 border-black">
        <Barcode value={jobId} format="CODE128" width={1.8} height={35} fontSize={9} margin={2} displayValue={true} />
        <p className="text-[8px] text-gray-400 mt-1">{COMPANY.name} | {COMPANY.website}</p>
      </div>
    </div>
  );
}
