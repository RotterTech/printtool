"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import LabelPreview from "@/components/LabelPreview";
import { PartLabelPreview } from "@/components/PartLabelPreview";
import AfhaalBon from "@/components/receipts/AfhaalBon";
import GarantieKaart from "@/components/receipts/GarantieKaart";
import { toast } from "sonner";
import Link from "next/link";

type Repair = {
  id: string;
  jobId: string; // normalized from job_id
  klant: string; // normalized from customer_name
  email?: string;
  telefoon?: string;
  merk?: string;
  model?: string;
  omschrijving?: string; // normalized from problem_description
  status: string;
  onderdeel_besteld: boolean;
  onderdeel_naam?: string;
  onderdeel_leverancier?: string;
  datum_in: string;
  datum_uit?: string;
};

export default function UitboekenPage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [partLabelText, setPartLabelText] = useState("");
  const [printReceipt, setPrintReceipt] = useState<"afhaalbon" | "garantiekaart" | null>(null);
  const [uitgeboektRepair, setUitgeboektRepair] = useState<Repair | null>(null);

  useEffect(() => {
    loadRepairs();
  }, []);

  const loadRepairs = async () => {
    try {
      // Load repairs that are not yet "Afgehaald"
      const res = await fetch("/api/repairs");
      const json = await res.json();
      if (res.ok) {
        // Normalize column names and filter out "Afgehaald" repairs
        const normalized = (json.data || [])
          .map((r: any) => ({
            ...r,
            jobId: r.job_id ?? r.jobId ?? r.jobid ?? "",
            klant: r.customer_name ?? r.klant ?? "",
            omschrijving: r.problem_description ?? r.omschrijving ?? "",
          }))
          .filter((r: Repair) => r.status !== "Afgehaald");

        setRepairs(normalized);
      }
    } catch (e) {
      console.error("Error loading repairs:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRepair = (repair: Repair) => {
    setSelectedRepair(repair);
    if (repair.onderdeel_besteld && repair.onderdeel_naam) {
      const leverancier = repair.onderdeel_leverancier || "DDKM";
      setPartLabelText(`${repair.onderdeel_naam} – ${leverancier}`);
    } else {
      setPartLabelText("");
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedRepair) return;

    setSubmitting(true);
    try {
      const updateData: any = {
        status: "Reparatie klaar",
      };

      console.log("📤 handleMarkComplete - Sending:", updateData);

      const res = await fetch(`/api/repairs?id=${selectedRepair.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      console.log("📤 handleMarkComplete - Response status:", res.status, res.statusText);

      if (!res.ok) {
        const text = await res.text();
        console.error("❌ Response text:", text);
        
        try {
          const json = JSON.parse(text);
          throw new Error(json.error || "Update failed");
        } catch (e) {
          throw new Error(`Server error (${res.status}): ${text}`);
        }
      }

      const json = await res.json();
      console.log("✅ handleMarkComplete - Success:", json);

      toast.success(`Reparatie ${selectedRepair.jobId} is klaar!`);
      loadRepairs();
      
      // Update selected repair
      const updated = { ...selectedRepair, status: "Reparatie klaar" };
      setSelectedRepair(updated);
    } catch (e: any) {
      console.error("❌ handleMarkComplete error:", e);
      toast.error(`Fout: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUitboeken = async () => {
    if (!selectedRepair) return;

    setSubmitting(true);
    try {
      const updateData: any = {
        status: "Afgehaald",
        datum_uit: new Date().toISOString(),
      };

      console.log("📤 handleUitboeken - Sending:", updateData);

      const res = await fetch(`/api/repairs?id=${selectedRepair.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      console.log("📤 handleUitboeken - Response status:", res.status, res.statusText);

      if (!res.ok) {
        const text = await res.text();
        console.error("❌ Response text:", text);
        
        try {
          const json = JSON.parse(text);
          throw new Error(json.error || "Update failed");
        } catch (e) {
          throw new Error(`Server error (${res.status}): ${text}`);
        }
      }

      const json = await res.json();
      console.log("✅ handleUitboeken - Success:", json);

      toast.success(`✅ Reparatie ${selectedRepair.jobId} is uitgeboekt!`);
      setUitgeboektRepair({ ...selectedRepair, datum_uit: new Date().toISOString() });
      setSelectedRepair(null);
      setPartLabelText("");
      loadRepairs();
    } catch (e: any) {
      console.error("❌ handleUitboeken error:", e);
      toast.error(`Fout bij uitboeken: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintPartLabel = async () => {
    if (!partLabelText || !selectedRepair) return;

    try {
      const response = await fetch("/api/print-part", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: partLabelText,
          jobId: selectedRepair.jobId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ Onderdeel label geprint`);
      } else {
        alert(`❌ Print fout: ${result.message}`);
      }
    } catch (error) {
      console.error("Print error:", error);
      alert("⚠️ Printservice niet bereikbaar");
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="w-full md:absolute top-4 left-0 right-0 flex gap-2 justify-between z-10 px-3 sm:px-4">
        <Link 
          href="/" 
          prefetch={false} 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-gray-100 font-bold text-sm bg-white shadow-md"
        >
          ← Terug
        </Link>

        <div className="flex gap-2">
          <Link href="/inboeken" prefetch={false} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border hover:bg-gray-50 font-bold text-sm bg-white shadow-md">
            📦 Inboeken
          </Link>
          <Link href="/dashboard" prefetch={false} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border hover:bg-gray-50 font-bold text-sm bg-white shadow-md">
            📊 Dashboard
          </Link>
        </div>
      </div>

      {/* Left: Select Repair */}
      <div className="w-full md:w-1/2 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
        <div className="max-w-2xl">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-t-lg">
              <h2 className="text-xl sm:text-2xl font-bold">🧾 Uitboeken</h2>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6">
              {loading ? (
                <p className="text-base text-gray-600">⏳ Laden...</p>
              ) : repairs.length === 0 ? (
                <p className="text-base text-gray-500">Geen reparaties klaar om uit te boeken</p>
              ) : (
                <>
                  <div>
                    <label className="block text-sm sm:text-base font-bold mb-1.5">🔍 Selecteer reparatie</label>
                    <Select
                      onValueChange={(id) => {
                        const repair = repairs.find((r) => r.id === id);
                        if (repair) handleSelectRepair(repair);
                      }}
                      value={selectedRepair?.id || ""}
                    >
                      <SelectTrigger className="h-11 sm:h-[50px] text-sm sm:text-base font-medium">
                        <SelectValue placeholder="Selecteer reparatie" />
                      </SelectTrigger>
                      <SelectContent>
                        {repairs.map((repair) => (
                          <SelectItem key={repair.id} value={repair.id} className="text-sm sm:text-base">
                            {repair.jobId} - {repair.klant} ({repair.merk} {repair.model})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRepair && (
                    <div className="space-y-4 sm:space-y-6 border-t pt-4 sm:pt-6">
                      <div className="space-y-2 sm:space-y-3 bg-blue-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-500">
                        <p className="text-sm sm:text-base"><span className="font-bold">📌 Job ID:</span> <span className="font-mono text-base sm:text-lg text-blue-700">{selectedRepair.jobId}</span></p>
                        <p className="text-sm sm:text-base"><span className="font-bold">👤 Klant:</span> {selectedRepair.klant}</p>
                        <p className="text-sm sm:text-base"><span className="font-bold">🖥️ Apparaat:</span> {selectedRepair.merk} {selectedRepair.model}</p>
                        {selectedRepair.omschrijving && (
                          <p className="text-sm sm:text-base"><span className="font-bold">📝 Omschrijving:</span> {selectedRepair.omschrijving}</p>
                        )}
                        <p className="text-sm sm:text-base"><span className="font-bold">📅 Datum in:</span> {new Date(selectedRepair.datum_in).toLocaleString("nl-NL")}</p>
                      </div>

                      {/* Label Preview - Visual Verification */}
                      <div className="mt-3 border p-3 bg-white shadow-sm flex justify-center rounded-lg">
                        <LabelPreview repair={selectedRepair} />
                      </div>

                      {selectedRepair.status !== "Reparatie klaar" && (
                        <Button
                          variant="outline"
                          onClick={handleMarkComplete}
                          disabled={submitting}
                          className="w-full h-12 sm:h-14 text-sm sm:text-base font-bold"
                        >
                          {submitting ? "⏳ Bezig..." : "✅ Markeer als 'Reparatie klaar'"}
                        </Button>
                      )}

                      {selectedRepair.onderdeel_besteld && selectedRepair.status === "Reparatie klaar" && (
                        <div className="space-y-3">
                          <label className="block text-sm sm:text-base font-bold">📦 Onderdeel label tekst</label>
                          <Input
                            value={partLabelText}
                            onChange={(e) => setPartLabelText(e.target.value)}
                            placeholder="Bijv. Nieuwe batterij – DDKM"
                            className="h-10 sm:h-[50px] text-sm sm:text-base font-medium"
                          />
                          <Button
                            variant="outline"
                            onClick={handlePrintPartLabel}
                            disabled={!partLabelText}
                            className="w-full h-10 sm:h-14 text-sm sm:text-base font-bold"
                          >
                            🖨️ Print onderdeel label
                          </Button>
                        </div>
                      )}

                      {selectedRepair.status === "Reparatie klaar" && (
                        <Button
                          className="w-full h-14 sm:h-16 bg-green-600 hover:bg-green-700 text-white text-lg sm:text-2xl font-bold rounded-lg shadow-lg active:scale-95 transition"
                          onClick={handleUitboeken}
                          disabled={submitting}
                        >
                          {submitting ? "⏳ Bezig..." : "✅ Uitboeken (Afgehaald)"}
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right: Part Label Preview / Receipt Print */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-white p-4 sm:p-6">
        {/* Receipt print area for after uitboeken */}
        {uitgeboektRepair && !printReceipt && (
          <div className="w-full max-w-md space-y-3 mb-4">
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
              <p className="text-lg sm:text-xl font-bold text-green-800 mb-1">✅ Uitgeboekt!</p>
              <p className="text-green-700 text-sm sm:text-base mb-3">{uitgeboektRepair.jobId} — {uitgeboektRepair.klant}</p>
              <div className="space-y-2">
                <Button
                  onClick={() => { setPrintReceipt("afhaalbon"); setTimeout(() => window.print(), 300); }}
                  className="w-full h-11 sm:h-12 text-sm sm:text-base bg-blue-600 hover:bg-blue-700"
                >
                  📋 Print Afhaalbon
                </Button>
                <Button
                  onClick={() => { setPrintReceipt("garantiekaart"); setTimeout(() => window.print(), 300); }}
                  className="w-full h-11 sm:h-12 text-sm sm:text-base bg-emerald-600 hover:bg-emerald-700"
                >
                  🛡️ Print Garantiekaart
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setUitgeboektRepair(null)}
                  className="w-full h-10 text-sm"
                >
                  ✕ Sluiten
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Receipt render (hidden on screen, shown on print) */}
        {printReceipt && uitgeboektRepair && (
          <>
            <style jsx global>{`
              @media print {
                .receipt-print-area { display: block !important; position: fixed; top: 0; left: 0; width: 80mm; z-index: 9999; background: white; }
                .no-print { display: none !important; }
              }
            `}</style>
            <div className="hidden receipt-print-area">
              {printReceipt === "afhaalbon" && <AfhaalBon repair={uitgeboektRepair} />}
              {printReceipt === "garantiekaart" && <GarantieKaart repair={uitgeboektRepair} />}
            </div>
            <Button
              variant="outline"
              onClick={() => setPrintReceipt(null)}
              className="print:hidden mt-4"
            >
              ← Terug naar overzicht
            </Button>
          </>
        )}

        {/* Part label preview (existing) */}
        {!uitgeboektRepair && (
          partLabelText ? (
            <PartLabelPreview text={partLabelText} jobId={selectedRepair?.jobId} />
          ) : (
            <div className="text-gray-400 text-center">
              <p>Selecteer een reparatie om onderdeel label te zien</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

