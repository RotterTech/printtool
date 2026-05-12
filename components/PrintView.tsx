"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import LabelPreview from "@/components/LabelPreview";
import AccessoryLabel from "@/components/AccessoryLabel";
import InnameBon from "@/components/receipts/InnameBon";
import WerkBon from "@/components/receipts/WerkBon";
import Link from "next/link";
import { CheckCircle, Tag, Printer, Loader2, Receipt, Wrench } from "lucide-react";
import { ACCESSORY_TYPES } from "@/lib/config";
import { toast } from "sonner";
import { queueAccessoryLabel } from "@/lib/print-queue-helpers";

type PrintTab = "label" | "innamebon" | "werkbon";

export default function PrintView({ repair }: { repair: any }) {
  const [printingAccessory, setPrintingAccessory] = useState<number | null>(null);
  const [sendingToQueue, setSendingToQueue] = useState(false);
  const [activeTab, setActiveTab] = useState<PrintTab>("label");
  
  if (!repair) return <div className="p-4">Laden...</div>;

  // Zorg voor volledige fallback mapping (ook voor print/label)
  const jobId = repair.job_id || repair.jobid || repair.jobId || repair.id || "—";
  const firstN = repair.first_name || repair.voornaam || "";
  const lastN = repair.last_name || "";
  const customerName = (firstN || lastN) ? `${firstN} ${lastN}`.trim() : (repair.customer_name || repair.klant || repair.customer || repair.name || "Klant");
  const accessories = Array.isArray(repair.accessories) ? repair.accessories : [];

  const handlePrintAccessory = (index: number) => {
    setPrintingAccessory(index);
    setTimeout(() => {
      window.print();
      setPrintingAccessory(null);
    }, 100);
  };

  const handlePrintViaQueue = async () => {
    setSendingToQueue(true);
    try {
      const res = await fetch("/api/print-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_type: "repair_label",
          reference_id: jobId,
          label_data: {
            jobId,
            klant: customerName,
            email: repair.customer_email || "",
            telefoon: repair.customer_phone || "",
            merk: repair.device_brand || "",
            model: repair.device_model || "",
            serial: repair.serial_number || "",
            datum: repair.created_at || new Date().toISOString(),
            probleem: repair.problem_description || "",
            prijs: repair.agreed_price || "",
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Label naar printer gestuurd!");
      } else {
        toast.error(data.error || "Printen mislukt");
      }
    } catch {
      toast.error("Kon niet verbinden met print queue");
    } finally {
      setSendingToQueue(false);
    }
  };

  const tabs: { id: PrintTab; label: string; icon: React.ReactNode }[] = [
    { id: "label", label: "Apparaat Label", icon: <Tag className="w-4 h-4" /> },
    { id: "innamebon", label: "Innamebon", icon: <Receipt className="w-4 h-4" /> },
    { id: "werkbon", label: "Werkbon", icon: <Wrench className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 print:bg-white print:p-0 print:block">
      {/* Success Message - Hidden when printing */}
      <div className="mb-6 max-w-md text-center print:hidden">
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 shadow-lg">
          <div className="flex justify-center mb-3">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">
            ✅ Reparatie Opgeslagen!
          </h1>
          <p className="text-green-700 mb-3">
            De reparatie voor <strong>{customerName}</strong> is succesvol aangemaakt.
          </p>
          <div className="bg-green-100 rounded-lg p-3 mb-4">
            <span className="text-sm text-green-600">Job ID:</span>
            <span className="block text-2xl font-mono font-bold text-green-800">{jobId}</span>
          </div>
          <p className="text-sm text-green-600">
            Kies hieronder wat je wilt printen.
          </p>
        </div>
      </div>

      {/* Tab Selector - Hidden when printing */}
      <div className="mb-4 print:hidden">
        <div className="flex bg-white rounded-xl shadow border overflow-hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPrintingAccessory(null); }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls - Hidden when printing */}
      <div className="mb-6 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 justify-center w-full sm:w-auto px-2 sm:px-0 print:hidden">
        <Button onClick={() => window.print()} className="h-12 sm:h-14 text-sm sm:text-base px-6 sm:px-8 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
          🖨️ {activeTab === "label" ? "Label Printen" : activeTab === "innamebon" ? "Innamebon Printen" : "Werkbon Printen"}
        </Button>
        {activeTab === "label" && (
          <Button
            onClick={handlePrintViaQueue}
            disabled={sendingToQueue}
            className="h-12 sm:h-14 text-sm sm:text-base px-6 sm:px-8 bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
          >
            {sendingToQueue ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Versturen...</>
            ) : (
              <><Printer className="w-4 h-4 mr-2" /> Print via USB</>
            )}
          </Button>
        )}
        <Link href="/inboeken" className="w-full sm:w-auto">
          <Button variant="outline" className="h-12 sm:h-14 text-sm sm:text-base px-6 sm:px-8 border-2 w-full">
            ➕ Nieuwe Reparatie
          </Button>
        </Link>
        <Link href="/dashboard" className="w-full sm:w-auto">
          <Button variant="outline" className="h-12 sm:h-14 text-sm sm:text-base px-6 sm:px-8 border-2 w-full">
            📊 Dashboard
          </Button>
        </Link>
      </div>

      {/* Accessory Labels - Only show on label tab */}
      {activeTab === "label" && accessories.length > 0 && printingAccessory === null && (
        <div className="mb-6 max-w-lg w-full print:hidden">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 shadow">
            <h3 className="text-lg font-bold text-amber-800 mb-3 flex items-center gap-2">
              <Tag className="w-5 h-5" /> Accessoire Labels
            </h3>
            <p className="text-sm text-amber-700 mb-3">
              Print aparte labels voor de meegenomen accessoires:
            </p>
            <div className="space-y-2">
              {accessories.map((acc: { type: string; label: string; quantity: number; notes: string }, idx: number) => {
                const accType = ACCESSORY_TYPES.find(a => a.value === acc.type);
                return (
                  <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-amber-300">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{accType?.emoji || "📎"}</span>
                      <div>
                        <p className="font-medium">{acc.quantity}x {acc.label}</p>
                        {acc.notes && <p className="text-xs text-gray-500">{acc.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrintAccessory(idx)}
                        className="border-amber-400 text-amber-700 hover:bg-amber-100"
                      >
                        🏷️ Print
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          queueAccessoryLabel({
                            type: acc.type,
                            label: acc.label,
                            quantity: acc.quantity,
                            notes: acc.notes,
                            jobId,
                            customerName,
                          }).then(r => {
                            if (r.success) toast.success("Accessoire label naar printer gestuurd!");
                            else toast.error(r.error || "Printen mislukt");
                          }).catch(() => toast.error("Kon niet verbinden met print queue"));
                        }}
                        className="border-emerald-400 text-emerald-700 hover:bg-emerald-100"
                      >
                        <Printer className="w-3 h-3 mr-1" /> USB
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Print Content - switches based on active tab */}
      {printingAccessory !== null ? (
        <div className="print:absolute print:top-0 print:left-0">
          <AccessoryLabel 
            accessory={accessories[printingAccessory]} 
            jobId={jobId}
            customerName={customerName}
          />
        </div>
      ) : activeTab === "label" ? (
        <div className="print:absolute print:top-0 print:left-0">
          <LabelPreview repair={{
            ...repair,
            jobid: jobId,
            klant: customerName,
            accessories,
            device_brand: repair.device_brand || repair.merk || "—",
            device_model: repair.device_model || repair.model || "—",
            serial_number: repair.serial_number || repair.serienummer || "—",
            prijsafspraak: repair.prijsafspraak || repair.agreed_price || "—",
            kosten: repair.kosten || "—",
            problem_description: repair.problem_description || repair.omschrijving || "—",
          }} />
        </div>
      ) : activeTab === "innamebon" ? (
        <div className="print:absolute print:top-0 print:left-0 print:w-[80mm]">
          <InnameBon repair={repair} />
        </div>
      ) : (
        <div className="print:absolute print:top-0 print:left-0 print:w-[80mm]">
          <WerkBon repair={repair} />
        </div>
      )}
    </div>
  );
}
