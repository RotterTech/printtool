"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import Barcode from "react-barcode";
import { QRCodeCanvas } from "qrcode.react";

export default function LabelPage() {
  // Merken + modellen
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
    notities: "",
    datum: new Date().toISOString().slice(0, 16),
  });

  const [jobId] = useState(
    Math.random().toString(16).substring(2, 8).toUpperCase()
  );

  const [isPrinting, setIsPrinting] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    
    try {
      const response = await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, jobId }),
      });
      
      const result = await response.json();
      console.log("Print result:", result);
      
      if (result.success) {
        alert(`✅ Label succesvol geprint: ${result.jobId}`);
      } else {
        alert(`❌ Er ging iets mis bij het printen:\n${result.message}`);
      }
    } catch (error) {
      console.error("Error sending print request:", error);
      alert("⚠️ Printservice niet bereikbaar, probeer later opnieuw.");
    } finally {
      setIsPrinting(false);
    }
  };

  const merkOptions = Object.keys(merken);
  const modelOptions = merken[form.merk] || [];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* ===== Linkerkant: formulier ===== */}
      <div className="w-full md:w-1/2 p-6 space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">Klantlabel</h1>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Klantgegevens */}
            <div className="space-y-2">
              <Input
                placeholder="Naam klant"
                value={form.klant}
                onChange={(e) => handleChange("klant", e.target.value)}
              />
              <Input
                placeholder="E-mail"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
              <Input
                placeholder="Telefoonnummer"
                value={form.telefoon}
                onChange={(e) => handleChange("telefoon", e.target.value)}
              />
              <Input
                placeholder="Klantnummer"
                value={form.klantnummer}
                onChange={(e) => handleChange("klantnummer", e.target.value)}
              />
            </div>

            {/* Apparaat */}
            <div className="grid grid-cols-2 gap-2">
              <Select
                onValueChange={(v) => handleChange("merk", v)}
                value={form.merk}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Merk" />
                </SelectTrigger>
                <SelectContent>
                  {merkOptions.map((merk) => (
                    <SelectItem key={merk} value={merk}>
                      {merk}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                onValueChange={(v) => handleChange("model", v)}
                value={form.model}
                disabled={!form.merk}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={form.merk ? "Model" : "Kies eerst merk"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Werk / notities */}
            <Textarea
              placeholder="Werkomschrijving of notities (bijv. 'Batterij vervangen')"
              value={form.notities}
              onChange={(e) => handleChange("notities", e.target.value)}
            />

            {/* Datum */}
            <Input
              type="datetime-local"
              value={form.datum}
              onChange={(e) => handleChange("datum", e.target.value)}
            />

            {/* Knop */}
            <Button
              size="lg"
              className="w-full bg-black hover:bg-gray-800"
              onClick={handlePrint}
              disabled={isPrinting}
            >
              {isPrinting ? "Bezig met printen..." : "Print label"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ===== Rechterkant: label preview ===== */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white">
        <div className="border border-gray-300 rounded-md w-[280px] h-[160px] p-3 text-sm leading-relaxed relative">
          <QRCodeCanvas
            value={jobId}
            size={40}
            className="absolute top-2 right-2"
          />

          <p>
            <strong>Klant:</strong> {form.klant || "—"}
          </p>
          <p>
            <strong>Job:</strong> {jobId}
          </p>
          <p>
            {form.merk && `${form.merk} ${form.model}`}
          </p>
          <p>
            <strong>Datum:</strong>{" "}
            {new Date(form.datum).toLocaleString("nl-NL")}
          </p>

          {/* Contact (kleinere font) */}
          <div className="text-[10px] mt-1 leading-tight">
            {form.email && <p>E: {form.email}</p>}
            {form.telefoon && <p>T: {form.telefoon}</p>}
          </div>

          {/* Barcode onderaan */}
          <Barcode
            value={jobId}
            width={1.2}
            height={40}
            displayValue={false}
            className="absolute bottom-2 left-1/2 -translate-x-1/2"
          />
        </div>
      </div>
    </div>
  );
}
