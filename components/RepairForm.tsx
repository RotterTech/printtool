"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { LabelPreview } from "@/components/LabelPreview";

export type RepairPayload = {
  jobId: string;
  klant: string;
  email?: string | null;
  telefoon?: string | null;
  klantnummer?: string | null;
  merk?: string | null;
  model?: string | null;
  omschrijving?: string | null;
  status?: string;
  onderdeel_besteld?: boolean;
  onderdeel_naam?: string | null;
  onderdeel_leverancier?: string | null;
  datum_in?: string;
};

type Props = {
  onCreated?: (record: any) => void;
  showPreview?: boolean;
  onFormChange?: (form: any, jobId: string) => void;
};

export function RepairForm({ onCreated, showPreview = true, onFormChange }: Props) {
  const merken: Record<string, string[]> = {
    Apple: ["MacBook Air", "MacBook Pro", "iMac", "Mac Mini"],
    HP: ["ProBook", "EliteBook", "Pavilion", "Omen", "ZBook"],
    Dell: ["Latitude", "XPS", "Inspiron", "Alienware"],
    Lenovo: ["ThinkPad", "IdeaPad", "Yoga", "Legion"],
    Asus: ["ZenBook", "VivoBook", "ROG", "TUF"],
    Acer: ["Aspire", "Predator", "Swift", "Nitro"],
    Microsoft: ["Surface Laptop", "Surface Pro", "Surface Book"],
  };

  const [form, setForm] = useState({
    klant: "",
    email: "",
    telefoon: "",
    klantnummer: "",
    merk: "",
    model: "",
    omschrijving: "",
    onderdeel_besteld: false,
    onderdeel_naam: "",
    onderdeel_leverancier: "DDKM",
    datum_in: "",
  });

  const [jobId, setJobId] = useState("");
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fix hydration warning by generating jobId and date on client only
  useEffect(() => {
    setMounted(true);
    const newJobId = Math.random().toString(16).substring(2, 8).toUpperCase();
    setJobId(newJobId);
    setForm((prev) => ({
      ...prev,
      datum_in: prev.datum_in || new Date().toISOString().slice(0, 16),
    }));
    onFormChange?.(
      {
        ...form,
        datum_in: form.datum_in || new Date().toISOString().slice(0, 16),
      },
      newJobId
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  const handleChange = (key: string, value: string | boolean) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value as any };
      onFormChange?.(updated, jobId);
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!form.klant || !jobId) {
      alert("❌ Vul ten minste klantnaam in");
      return;
    }

    setSubmitting(true);
    try {
      const payload: RepairPayload = {
        jobId,
        klant: form.klant,
        email: form.email || null,
        telefoon: form.telefoon || null,
        klantnummer: form.klantnummer || null,
        merk: form.merk || null,
        model: form.model || null,
        omschrijving: form.omschrijving || null,
        status: "Ingeboekt",
        onderdeel_besteld: Boolean(form.onderdeel_besteld),
        onderdeel_naam: form.onderdeel_naam || null,
        onderdeel_leverancier: form.onderdeel_leverancier || "DDKM",
        datum_in: form.datum_in ? new Date(form.datum_in).toISOString() : new Date().toISOString(),
      };

      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        console.error("API Error:", json);
        throw new Error(json.error || "Kon reparatie niet opslaan");
      }

      onCreated?.(json.data);

      // Reset form after successful submission and generate new jobId
      const newJobId = Math.random().toString(16).substring(2, 8).toUpperCase();
      setJobId(newJobId);
      const resetForm = {
        klant: "",
        email: "",
        telefoon: "",
        klantnummer: "",
        merk: "",
        model: "",
        omschrijving: "",
        onderdeel_besteld: false,
        onderdeel_naam: "",
        onderdeel_leverancier: "DDKM",
        datum_in: new Date().toISOString().slice(0, 16),
      };
      setForm(resetForm);
      onFormChange?.(resetForm, newJobId);

      // Trigger print similar to current label
      try {
        await fetch("/api/print", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            klant: form.klant,
            email: form.email,
            telefoon: form.telefoon,
            klantnummer: form.klantnummer,
            merk: form.merk,
            model: form.model,
            notities: form.omschrijving,
            datum: form.datum_in,
            jobId,
          }),
        });
      } catch {}
      alert(`✅ Ingeboekt en label geprint: ${jobId}`);
    } catch (e: any) {
      alert(`❌ Fout bij inboeken: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const merkOptions = Object.keys(merken);
  const modelOptions = merken[form.merk] || [];

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <h2 className="text-xl font-semibold">📦 Inboeken</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <Input placeholder="Naam klant" value={form.klant} onChange={(e) => handleChange("klant", e.target.value)} />
            <Input placeholder="E-mail" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
            <Input placeholder="Telefoon" value={form.telefoon} onChange={(e) => handleChange("telefoon", e.target.value)} />
            <Input placeholder="Klantnummer" value={form.klantnummer} onChange={(e) => handleChange("klantnummer", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select onValueChange={(v) => handleChange("merk", v)} value={form.merk}>
              <SelectTrigger>
                <SelectValue placeholder="Merk" />
              </SelectTrigger>
              <SelectContent>
                {merkOptions.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(v) => handleChange("model", v)} value={form.model} disabled={!form.merk}>
              <SelectTrigger>
                <SelectValue placeholder={form.merk ? "Model" : "Kies eerst merk"} />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea placeholder="Omschrijving (bijv. 'Batterij vervangen')" value={form.omschrijving} onChange={(e) => handleChange("omschrijving", e.target.value)} />

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.onderdeel_besteld} onChange={(e) => handleChange("onderdeel_besteld", e.target.checked)} />
              Onderdeel besteld
            </label>
            <Input placeholder="Leverancier" value={form.onderdeel_leverancier} onChange={(e) => handleChange("onderdeel_leverancier", e.target.value)} />
          </div>

          {form.onderdeel_besteld && (
            <Input placeholder="Onderdeel naam" value={form.onderdeel_naam} onChange={(e) => handleChange("onderdeel_naam", e.target.value)} />
          )}

          <Input type="datetime-local" value={form.datum_in} onChange={(e) => handleChange("datum_in", e.target.value)} />

          <Button className="w-full bg-black hover:bg-gray-800" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Bezig..." : "Inboeken en printen"}
          </Button>
          <p className="text-xs text-gray-500">Job: {jobId}</p>
        </CardContent>
      </Card>
      {showPreview && (
        <div className="flex items-center justify-center mt-6">
          <LabelPreview
            jobId={jobId}
            klant={form.klant}
            merk={form.merk}
            model={form.model}
            datum={form.datum_in}
            email={form.email}
            telefoon={form.telefoon}
          />
        </div>
      )}
    </>
  );
}

export { LabelPreview, PartLabelPreview } from "@/components/LabelPreview";


