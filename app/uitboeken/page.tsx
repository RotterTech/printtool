"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PartLabelPreview } from "@/components/LabelPreview";
import Link from "next/link";

type Repair = {
  id: string;
  jobId: string;
  klant: string;
  email?: string;
  telefoon?: string;
  merk?: string;
  model?: string;
  omschrijving?: string;
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

  useEffect(() => {
    loadRepairs();
  }, []);

  const loadRepairs = async () => {
    try {
      // Load repairs that are not yet "Afgehaald"
      const res = await fetch("/api/repairs");
      const json = await res.json();
      if (res.ok) {
        // Filter out "Afgehaald" repairs
        const filtered = (json.data || []).filter(
          (r: Repair) => r.status !== "Afgehaald"
        );
        setRepairs(filtered);
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

      const res = await fetch(`/api/repairs?id=${selectedRepair.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Kon reparatie niet bijwerken");

      alert(`✅ Reparatie ${selectedRepair.jobId} gemarkeerd als klaar`);
      loadRepairs();
      // Update selected repair
      const updated = { ...selectedRepair, status: "Reparatie klaar" };
      setSelectedRepair(updated);
    } catch (e: any) {
      alert(`❌ Fout: ${e.message}`);
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

      const res = await fetch(`/api/repairs?id=${selectedRepair.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Kon reparatie niet bijwerken");

      alert(`✅ Reparatie ${selectedRepair.jobId} is uitgeboekt`);
      setSelectedRepair(null);
      setPartLabelText("");
      loadRepairs();
    } catch (e: any) {
      alert(`❌ Fout bij uitboeken: ${e.message}`);
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
      <div className="w-full md:absolute top-4 right-4 flex gap-2 justify-end z-10">
        <Link href="/" prefetch={false} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50">
          <span>📦</span> Inboeken
        </Link>
        <Link href="/dashboard" prefetch={false} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50">
          <span>📊</span> Dashboard
        </Link>
      </div>

      {/* Left: Select Repair */}
      <div className="w-full md:w-1/2 p-6 space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <h2 className="text-xl font-semibold">🧾 Uitboeken</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p>Laden...</p>
            ) : repairs.length === 0 ? (
              <p className="text-gray-500">Geen reparaties klaar om uit te boeken</p>
            ) : (
              <>
                <Select
                  onValueChange={(id) => {
                    const repair = repairs.find((r) => r.id === id);
                    if (repair) handleSelectRepair(repair);
                  }}
                  value={selectedRepair?.id || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer reparatie" />
                  </SelectTrigger>
                  <SelectContent>
                    {repairs.map((repair) => (
                      <SelectItem key={repair.id} value={repair.id}>
                        {repair.jobId} - {repair.klant} ({repair.merk} {repair.model})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedRepair && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="text-sm space-y-1">
                      <p><strong>Job ID:</strong> {selectedRepair.jobId}</p>
                      <p><strong>Klant:</strong> {selectedRepair.klant}</p>
                      <p><strong>Apparaat:</strong> {selectedRepair.merk} {selectedRepair.model}</p>
                      <p><strong>Omschrijving:</strong> {selectedRepair.omschrijving || "—"}</p>
                      <p><strong>Datum in:</strong> {new Date(selectedRepair.datum_in).toLocaleString("nl-NL")}</p>
                    </div>

                    {selectedRepair.status !== "Reparatie klaar" && (
                      <Button
                        variant="outline"
                        onClick={handleMarkComplete}
                        disabled={submitting}
                        className="w-full"
                      >
                        {submitting ? "Bezig..." : "Markeer als 'Reparatie klaar'"}
                      </Button>
                    )}

                    {selectedRepair.onderdeel_besteld && selectedRepair.status === "Reparatie klaar" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Onderdeel label tekst:</label>
                        <Input
                          value={partLabelText}
                          onChange={(e) => setPartLabelText(e.target.value)}
                          placeholder="Bijv. Nieuwe batterij – DDKM"
                        />
                        <Button
                          variant="outline"
                          onClick={handlePrintPartLabel}
                          disabled={!partLabelText}
                          className="w-full"
                        >
                          Print onderdeel label
                        </Button>
                      </div>
                    )}

                    {selectedRepair.status === "Reparatie klaar" && (
                      <Button
                        className="w-full bg-black hover:bg-gray-800"
                        onClick={handleUitboeken}
                        disabled={submitting}
                      >
                        {submitting ? "Bezig..." : "Uitboeken (Afgehaald)"}
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Part Label Preview */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white p-6">
        {partLabelText ? (
          <PartLabelPreview text={partLabelText} jobId={selectedRepair?.jobId} />
        ) : (
          <div className="text-gray-400 text-center">
            <p>Selecteer een reparatie om onderdeel label te zien</p>
          </div>
        )}
      </div>
    </div>
  );
}

