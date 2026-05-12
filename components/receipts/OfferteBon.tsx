"use client";

import Barcode from "react-barcode";
import { COMPANY } from "@/lib/config";

interface OfferteBonProps {
  repair: any;
  /** Itemized costs e.g. [{label: "Schermvervanging", amount: 89.95}, {label: "Arbeid", amount: 35}] */
  kostenRegels?: { label: string; amount: number }[];
  /** Days the quote is valid (default 14) */
  geldigDagen?: number;
}

export default function OfferteBon({ repair, kostenRegels, geldigDagen = 14 }: OfferteBonProps) {
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
  const klacht = r.problem_description || r.omschrijving || "";
  const prijsafspraak = r.agreed_price || r.prijsafspraak || "";

  const vandaag = new Date();
  const geldigTot = new Date(vandaag.getTime() + geldigDagen * 24 * 60 * 60 * 1000);
  const formatDate = (d: Date) => d.toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });

  // Calculate totals from kostenRegels or fallback to prijsafspraak
  const regels = kostenRegels || (prijsafspraak ? [{ label: "Reparatiekosten (geschat)", amount: Number(prijsafspraak) }] : []);
  const totaal = regels.reduce((sum, r) => sum + r.amount, 0);

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
        <p className="text-[16px] font-black uppercase tracking-wider">Offerte</p>
        <p className="text-[9px] text-gray-500">Prijsopgave reparatie</p>
      </div>

      {/* META */}
      <div className="border border-black rounded p-1.5 mb-2 bg-gray-50">
        <div className="grid grid-cols-2 gap-1 text-[9px]">
          <div><span className="font-bold">Ref:</span> {jobId}</div>
          <div><span className="font-bold">Datum:</span> {formatDate(vandaag)}</div>
          <div className="col-span-2"><span className="font-bold">Geldig t/m:</span> {formatDate(geldigTot)}</div>
        </div>
      </div>

      {/* KLANT */}
      <div className="mb-2">
        <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Klant</p>
        <p className="text-[11px] font-bold">{klantNaam}</p>
        {telefoon && <p className="text-[10px]">Tel: {telefoon}</p>}
        {email && <p className="text-[10px] break-words">Email: {email}</p>}
      </div>

      {/* APPARAAT + PROBLEEM */}
      <div className="mb-2">
        <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Apparaat & Diagnose</p>
        <p className="text-[11px] font-bold">{merk} {model}</p>
        {klacht && <p className="text-[10px] mt-0.5"><span className="font-bold">Diagnose:</span> {klacht}</p>}
      </div>

      {/* KOSTENSPECIFICATIE */}
      <div className="mb-2">
        <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Kostenspecificatie</p>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left font-bold py-0.5">Omschrijving</th>
              <th className="text-right font-bold py-0.5">Bedrag</th>
            </tr>
          </thead>
          <tbody>
            {regels.map((regel, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-0.5">{regel.label}</td>
                <td className="text-right font-mono">€ {regel.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black">
              <td className="py-1 font-black text-[12px]">Totaal (incl. BTW)</td>
              <td className="py-1 text-right font-black font-mono text-[14px]">€ {totaal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* GELDIGHEID */}
      <div className="mb-2 p-1.5 border border-dashed border-orange-500 rounded bg-orange-50">
        <p className="text-[9px] font-bold text-orange-800">
          ⚠️ Deze offerte is geldig t/m {formatDate(geldigTot)} ({geldigDagen} dagen).
        </p>
        <p className="text-[8px] text-orange-700 mt-0.5">
          Prijzen onder voorbehoud. Eventuele extra kosten worden vooraf gecommuniceerd.
        </p>
      </div>

      {/* AKKOORD */}
      <div className="mb-2 pt-1">
        <p className="text-[9px] font-bold uppercase mb-1">Akkoord klant</p>
        <p className="text-[8px] text-gray-500 mb-2">
          Door ondertekening gaat u akkoord met bovenstaande werkzaamheden en kosten.
        </p>
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-[8px] font-bold uppercase mb-6">Handtekening:</p>
            <div className="border-b border-black" />
          </div>
          <div className="flex-1">
            <p className="text-[8px] font-bold uppercase mb-6">Datum:</p>
            <div className="border-b border-black" />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center pt-1 border-t-2 border-black">
        <Barcode value={jobId} format="CODE128" width={1.8} height={30} fontSize={9} margin={2} displayValue={true} />
        <p className="text-[8px] text-gray-400 mt-1">{COMPANY.name} | {COMPANY.website}</p>
      </div>
    </div>
  );
}
