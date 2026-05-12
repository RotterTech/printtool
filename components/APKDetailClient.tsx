"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { CheckCircle2, AlertCircle, Send, Mail, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { queueApkLabel } from "@/lib/print-queue-helpers";

interface APKJob {
  id: string;
  job_id: string;
  customer_name: string;
  customer_email?: string;
  device_brand: string;
  device_model: string;
  created_at: string;
  status: "Ingeboekt" | "Bezig" | "Klaar";
  scancircle_before?: number;
  scancircle_after?: number;
  performed_by?: string;
  checklist_data?: Record<string, boolean>;
  improvement_notes?: string;
}

interface APKDetailClientProps {
  initialData: APKJob;
}

// Checklist items - moet overeenkomen met label!
const CHECKLIST_ITEMS = [
  "Windows Update",
  "Driver Update",
  "Firmware Update",
  "Disk Cleanup (Admin)",
  "Taakbalk Instellingen uitzetten",
  "Widgets & Nieuws widgets uitzetten",
  "msconfig check",
  "Opstart check",
  "Temp files clean",
  "Intern reinigen",
  "Extern reinigen",
  "ScanCircle scan doen"
];

export default function APKDetailClient({ initialData }: APKDetailClientProps) {
  const [job, setJob] = useState<APKJob>(initialData);
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    job.checklist_data || {}
  );
  const [scanBefore, setScanBefore] = useState(job.scancircle_before?.toString() || "");
  const [scanAfter, setScanAfter] = useState(job.scancircle_after?.toString() || "");
  const [technician, setTechnician] = useState(job.performed_by || "");
  const [status, setStatus] = useState<"Ingeboekt" | "Bezig" | "Klaar">(job.status);
  const [improvementNotes, setImprovementNotes] = useState(job.improvement_notes || "");
  const [customerEmail, setCustomerEmail] = useState(job.customer_email || "");
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingToQueue, setSendingToQueue] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const toggleChecklistItem = (item: string) => {
    setChecklist((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("apk_maintenance")
        .update({
          checklist_data: checklist,
          scancircle_before: scanBefore ? parseInt(scanBefore, 10) : null,
          scancircle_after: scanAfter ? parseInt(scanAfter, 10) : null,
          performed_by: technician || null,
          improvement_notes: improvementNotes || null,
          customer_email: customerEmail || null,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (error) throw error;

      setMessage({ type: "success", text: "✅ Wijzigingen opgeslagen!" });
      setJob({ ...job, status, improvement_notes: improvementNotes, customer_email: customerEmail });
    } catch (err: any) {
      setMessage({ type: "error", text: `❌ Fout: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const sendApkEmail = async () => {
    if (!customerEmail || !customerEmail.includes("@")) {
      toast.error("Vul een geldig e-mailadres in");
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch("/api/apk/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apkId: job.id,
          email: customerEmail,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Email versturen mislukt");
      }

      toast.success("📧 APK rapport verzonden naar " + customerEmail);
    } catch (err: any) {
      toast.error(err.message || "Email versturen mislukt");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCheckout = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("apk_maintenance")
        .update({
          checklist_data: checklist,
          scancircle_before: scanBefore ? parseInt(scanBefore, 10) : null,
          scancircle_after: scanAfter ? parseInt(scanAfter, 10) : null,
          performed_by: technician || null,
          improvement_notes: improvementNotes || null,
          customer_email: customerEmail || null,
          status: "Klaar",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (error) throw error;

      setStatus("Klaar");
      setJob({ ...job, status: "Klaar", improvement_notes: improvementNotes, customer_email: customerEmail });
      setMessage({ type: "success", text: "✅ APK afgerond en klaar voor uitboeking!" });

      // Automatisch email versturen als er een emailadres is
      if (customerEmail && customerEmail.includes("@")) {
        await sendApkEmail();
      }
    } catch (err: any) {
      setMessage({ type: "error", text: `❌ Fout: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const statusColor =
    status === "Klaar" ? "green" : status === "Bezig" ? "orange" : "blue";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <Link href="/dashboard?view=apk" className="text-blue-600 hover:underline font-semibold text-sm">
          ← Terug naar Dashboard
        </Link>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">APK Dossier: {job.job_id}</h1>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Messages */}
        {message && (
          <div
            className={`p-4 rounded-lg flex items-center gap-3 ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Status Dropdown */}
        <div className="flex items-center gap-4">
          <span className="text-gray-600 font-medium">Status:</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "Ingeboekt" | "Bezig" | "Klaar")}
            className={`px-4 py-2 rounded-lg font-semibold text-sm border-2 cursor-pointer transition ${
              status === "Klaar"
                ? "bg-green-50 text-green-700 border-green-400"
                : status === "Bezig"
                ? "bg-orange-50 text-orange-700 border-orange-400"
                : "bg-blue-50 text-blue-700 border-blue-400"
            }`}
          >
            <option value="Ingeboekt">🔵 Ingeboekt</option>
            <option value="Bezig">🟠 Bezig</option>
            <option value="Klaar">🟢 Klaar</option>
          </select>
        </div>

        {/* Customer & Device Info (Read-only) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Klant & Apparaat</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Klant</p>
              <p className="text-lg font-semibold text-gray-900">{job.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Apparaat</p>
              <p className="text-lg font-semibold text-gray-900">
                {job.device_brand} {job.device_model}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Job ID</p>
              <p className="font-mono text-gray-900">#{job.job_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Datum</p>
              <p className="text-gray-900">{new Date(job.created_at).toLocaleDateString("nl-NL")}</p>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Checklist</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CHECKLIST_ITEMS.map((item) => (
              <label key={item} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist[item] || false}
                  onChange={() => toggleChecklistItem(item)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600"
                />
                <span className="text-gray-900">{item}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resultaten</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  ScanCircle Score (Voor)
                </label>
                <input
                  type="number"
                  value={scanBefore}
                  onChange={(e) => setScanBefore(e.target.value)}
                  placeholder="Bijv. 45"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  ScanCircle Score (Na)
                </label>
                <input
                  type="number"
                  value={scanAfter}
                  onChange={(e) => setScanAfter(e.target.value)}
                  placeholder="Bijv. 78"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Monteur / Technicus
              </label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="Naam van de technicus"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Verbeterpunten / Improvement Notes */}
        <div className="bg-amber-50 rounded-lg shadow border border-amber-200 p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-2 flex items-center gap-2">
            📝 Verbeterpunten & Aanbevelingen
          </h2>
          <p className="text-sm text-amber-700 mb-4">
            Noteer hier aanbevelingen voor de klant (bijv. vervanging acccu, RAM upgrade, etc.)
          </p>
          <textarea
            value={improvementNotes}
            onChange={(e) => setImprovementNotes(e.target.value)}
            placeholder="• Accu vertoont slijtage (65% capaciteit)&#10;• RAM upgrade naar 16GB aanbevolen&#10;• Windows licentie verloopt over 30 dagen"
            rows={5}
            className="w-full px-4 py-3 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-none"
          />
        </div>

        {/* Email voor rapport */}
        <div className="bg-blue-50 rounded-lg shadow border border-blue-200 p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Mail className="w-5 h-5" /> E-mail voor APK Rapport
          </h2>
          <p className="text-sm text-blue-700 mb-4">
            Bij afronden wordt automatisch een rapport gemaild naar de klant
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="klant@email.com"
              className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button
              onClick={sendApkEmail}
              disabled={sendingEmail || !customerEmail}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 transition flex items-center gap-2 justify-center"
            >
              {sendingEmail ? "⏳ Versturen..." : <><Send className="w-4 h-4" /> Verstuur nu</>}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 transition"
          >
            {saving ? "⏳ Bezig..." : "💾 Opslaan"}
          </button>
          <button
            onClick={handleCheckout}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg disabled:opacity-50 transition"
          >
            {saving ? "⏳ Bezig..." : "✅ Afronden"}
          </button>
          <Link
            href={`/apk/${job.id}/print`}
            className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition text-center"
          >
            🖨️ Print Label
          </Link>
          <button
            onClick={async () => {
              setSendingToQueue(true);
              try {
                const result = await queueApkLabel({
                  id: job.id,
                  customer_name: job.customer_name,
                  device_brand: job.device_brand,
                  device_model: job.device_model,
                  performed_by: technician,
                  created_at: job.created_at,
                  checklist_data: checklist,
                });
                if (result.success) toast.success("APK label naar printer gestuurd!");
                else toast.error(result.error || "Printen mislukt");
              } catch {
                toast.error("Kon niet verbinden met print queue");
              } finally {
                setSendingToQueue(false);
              }
            }}
            disabled={sendingToQueue}
            className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg disabled:opacity-50 transition flex items-center gap-2 justify-center"
          >
            {sendingToQueue ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Versturen...</>
            ) : (
              <><Printer className="w-4 h-4" /> Print via USB</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
