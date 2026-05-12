"use client";

import Barcode from "react-barcode";
import { COMPANY } from "@/lib/config";

interface WerkBonProps {
  repair: any;
}

export default function WerkBon({ repair }: WerkBonProps) {
  const r = repair || {};

  const jobId = r.job_id || r.jobid || r.jobId || r.id || "—";
  const firstName = r.first_name || r.voornaam || "";
  const lastName = r.last_name || "";
  const klantNaam = (firstName || lastName)
    ? `${firstName} ${lastName}`.trim()
    : r.customer_name || r.klant || "Klant";
  const telefoon = r.customer_phone || r.telefoon || "";
  const merk = r.device_brand || r.merk || "";
  const model = r.device_model || r.model || "";
  const serial = r.serial_number || r.serial || "";
  const deviceType = r.device_type || "";
  const devicePassword = r.device_password || "";
  const klacht = r.problem_description || r.omschrijving || "";
  const prijsafspraak = r.agreed_price || r.prijsafspraak || "";
  const onderdeel = r.onderdeel_naam || "";
  const leverancier = r.onderdeel_leverancier || "";
  const partsOrdered = r.onderdeel_besteld === true || r.onderdeel_besteld === "true";

  const datum = new Date(r.datum_in || r.created_at || Date.now())
    .toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });

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
      <div className="flex justify-between items-center border-b-2 border-black pb-1 mb-2">
        <div>
          <p className="text-[14px] font-black uppercase">Werkbon</p>
          <p className="text-[8px] text-gray-500">Intern document</p>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-black font-mono">{jobId}</p>
          <p className="text-[9px] text-gray-600">{datum}</p>
        </div>
      </div>

      {/* KLANT (beknopt) */}
      <div className="mb-2 p-1 bg-gray-50 rounded border border-gray-200">
        <div className="flex justify-between text-[10px]">
          <span className="font-bold">{klantNaam}</span>
          {telefoon && <span>📞 {telefoon}</span>}
        </div>
        {prijsafspraak && (
          <p className="text-[10px] text-right font-bold">Afspraak: € {prijsafspraak}</p>
        )}
      </div>

      {/* APPARAAT */}
      <div className="mb-2">
        <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Apparaat</p>
        <p className="text-[12px] font-bold">{merk} {model}</p>
        <div className="grid grid-cols-2 gap-1 text-[9px] mt-0.5">
          {deviceType && <span>Type: {deviceType}</span>}
          {serial && <span className="font-mono">SN: {serial}</span>}
          {devicePassword && <span className="font-bold text-red-700">🔑 WW: {devicePassword}</span>}
        </div>
      </div>

      {/* KLACHT / OPDRACHT */}
      <div className="mb-2">
        <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Klacht / Opdracht</p>
        <p className="text-[11px] whitespace-pre-wrap">{klacht || "—"}</p>
      </div>

      {/* ONDERDELEN */}
      {(onderdeel || partsOrdered) && (
        <div className="mb-2">
          <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Onderdelen</p>
          {onderdeel && <p className="text-[10px]"><span className="font-bold">Onderdeel:</span> {onderdeel}</p>}
          {leverancier && <p className="text-[10px]"><span className="font-bold">Leverancier:</span> {leverancier}</p>}
          <p className="text-[10px]"><span className="font-bold">Besteld:</span> {partsOrdered ? "✅ Ja" : "❌ Nee"}</p>
        </div>
      )}

      {/* CHECKLIST */}
      <div className="mb-2">
        <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Werkzaamheden</p>
        <div className="space-y-1 text-[10px]">
          <div className="flex items-start gap-1"><span>☐</span><span>Diagnose uitgevoerd</span></div>
          <div className="flex items-start gap-1"><span>☐</span><span>Onderdeel ontvangen & geïnstalleerd</span></div>
          <div className="flex items-start gap-1"><span>☐</span><span>Reparatie uitgevoerd</span></div>
          <div className="flex items-start gap-1"><span>☐</span><span>Getest & werkend bevonden</span></div>
          <div className="flex items-start gap-1"><span>☐</span><span>Schoongemaakt</span></div>
          <div className="flex items-start gap-1"><span>☐</span><span>Klant geïnformeerd</span></div>
        </div>
      </div>

      {/* NOTITIES */}
      <div className="mb-2">
        <p className="text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Notities monteur</p>
        <div className="border border-gray-300 rounded p-1 min-h-[50px] bg-gray-50">
          <p className="text-[8px] text-gray-400">...</p>
        </div>
      </div>

      {/* UREN + KOSTEN */}
      <div className="mb-2">
        <table className="w-full text-[10px] border border-gray-300">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="text-left p-0.5 font-bold">Omschrijving</th>
              <th className="text-right p-0.5 font-bold w-16">Bedrag</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="p-0.5">Arbeid: _____ uur × € _____</td>
              <td className="text-right p-0.5 font-mono">€ _____</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-0.5">Onderdelen:</td>
              <td className="text-right p-0.5 font-mono">€ _____</td>
            </tr>
            <tr className="bg-gray-100 border-t-2 border-black">
              <td className="p-0.5 font-bold">Totaal:</td>
              <td className="text-right p-0.5 font-mono font-bold">€ _____</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* MONTEUR */}
      <div className="mb-2">
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-[8px] font-bold uppercase mb-4">Monteur:</p>
            <div className="border-b border-black" />
          </div>
          <div className="flex-1">
            <p className="text-[8px] font-bold uppercase mb-4">Datum gereed:</p>
            <div className="border-b border-black" />
          </div>
        </div>
      </div>

      {/* BARCODE FOOTER */}
      <div className="text-center pt-1 border-t-2 border-black">
        <Barcode value={jobId} format="CODE128" width={2} height={30} fontSize={9} margin={2} displayValue={true} />
      </div>
    </div>
  );
}
