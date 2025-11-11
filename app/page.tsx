"use client";

import { useState, useEffect } from "react";
import { RepairForm } from "@/components/RepairForm";
import { LabelPreview } from "@/components/LabelPreview";
import Link from "next/link";

export default function InboekenPage() {
  const [formData, setFormData] = useState({
    klant: "",
    email: "",
    telefoon: "",
    klantnummer: "",
    merk: "",
    model: "",
    omschrijving: "",
    datum_in: "",
  });
  const [jobId, setJobId] = useState("");
  const [mounted, setMounted] = useState(false);

  // Fix hydration warning by only setting date on client
  useEffect(() => {
    setMounted(true);
    setFormData((prev) => ({
      ...prev,
      datum_in: prev.datum_in || new Date().toISOString().slice(0, 16),
    }));
  }, []);

  const handleFormChange = (form: any, id: string) => {
    setFormData(form);
    setJobId(id);
  };

  const handleCreated = (record: any) => {
    // Reset after successful creation
    const resetForm = {
      klant: "",
      email: "",
      telefoon: "",
      klantnummer: "",
      merk: "",
      model: "",
      omschrijving: "",
      datum_in: new Date().toISOString().slice(0, 16),
    };
    setFormData(resetForm);
    setJobId("");
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="w-full md:absolute top-4 right-4 flex gap-2 justify-end z-10">
        <Link href="/dashboard" prefetch={false} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50">
          <span>📊</span> Dashboard
        </Link>
        <Link href="/uitboeken" prefetch={false} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50">
          <span>🧾</span> Uitboeken
        </Link>
      </div>

      {/* Left: Form */}
      <div className="w-full md:w-1/2 p-6 space-y-6">
        <RepairForm 
          onCreated={handleCreated} 
          showPreview={false}
          onFormChange={handleFormChange}
        />
      </div>

      {/* Right: Label Preview */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white p-6">
        {jobId && formData.datum_in ? (
          <LabelPreview
            jobId={jobId}
            klant={formData.klant}
            merk={formData.merk}
            model={formData.model}
            datum={formData.datum_in}
            email={formData.email}
            telefoon={formData.telefoon}
            klantnummer={formData.klantnummer}
          />
        ) : (
          <div className="text-gray-400 text-center">
            <p>Vul het formulier in om een preview te zien</p>
          </div>
        )}
      </div>
    </div>
  );
}
