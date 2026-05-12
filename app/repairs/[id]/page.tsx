"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Clock, Mail, Phone, Package, Edit3, Save, X, Trash2,
  Loader2, User, Monitor, Key, FileText, Euro, MapPin, Hash, ChevronDown,
  Wrench, CheckCircle2, Link2, Unlink
} from "lucide-react";
import RepairNotes from "@/components/RepairNotes";
import RepairReceiptPrinter from "@/components/RepairReceiptPrinter";
import WeFactDebtorSearch from "@/components/WeFactDebtorSearch";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

const STATUSES = [
  "Nieuw", "Besteld",
  "In reparatie", "Reparatie klaar",
  "Afgehaald", "Geannuleerd",
];

const STATUS_COLORS: Record<string, string> = {
  "Nieuw": "bg-blue-100 text-blue-800 border-blue-200",
  "Besteld": "bg-orange-100 text-orange-800 border-orange-200",
  "In reparatie": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Reparatie klaar": "bg-green-100 text-green-800 border-green-200",
  "Afgehaald": "bg-gray-100 text-gray-700 border-gray-200",
  "Geannuleerd": "bg-red-100 text-red-800 border-red-200",
};

type Accessory = { type: string; label: string; notes: string; quantity: number };
type OrderedPart = { naam: string; leverancier: string; besteld_op: string; status: string };

function parseParts(onderdeel_naam: string | null, onderdeel_leverancier?: string): OrderedPart[] {
  if (!onderdeel_naam) return [];
  try {
    const parsed = JSON.parse(onderdeel_naam);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  // Legacy: single part name string
  return [{ naam: onderdeel_naam, leverancier: onderdeel_leverancier || "", besteld_op: "", status: "besteld" }];
}

function serializeParts(parts: OrderedPart[]): { onderdeel_besteld: boolean; onderdeel_naam: string; onderdeel_leverancier: string } {
  if (parts.length === 0) return { onderdeel_besteld: false, onderdeel_naam: "", onderdeel_leverancier: "" };
  return {
    onderdeel_besteld: true,
    onderdeel_naam: JSON.stringify(parts),
    onderdeel_leverancier: parts[0]?.leverancier || "",
  };
}

const PART_STATUSES = ["besteld", "ontvangen", "gemonteerd", "geannuleerd"];
const PART_STATUS_COLORS: Record<string, string> = {
  besteld: "bg-orange-100 text-orange-700",
  ontvangen: "bg-blue-100 text-blue-700",
  gemonteerd: "bg-green-100 text-green-700",
  geannuleerd: "bg-red-100 text-red-700",
};

export default function RepairDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [repair, setRepair] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(searchParams.get('edit') === 'true');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<any>({});
  const [parts, setParts] = useState<OrderedPart[]>([]);
  const [statusChanging, setStatusChanging] = useState(false);
  const [wefactDebtor, setWefactDebtor] = useState<any>(null);
  const [showWefactSearch, setShowWefactSearch] = useState(false);
  const [showBesteldDialog, setShowBesteldDialog] = useState(false);
  const [besteldOnderdeel, setBesteldOnderdeel] = useState("");

  const fetchRepair = useCallback(async () => {
    setLoading(true);

    // Try job_id first, then UUID
    let { data, error } = await supabase
      .from("repairs").select("*").eq("job_id", id).maybeSingle();

    if (!data) {
      const byUuid = await supabase.from("repairs").select("*").eq("id", id as string).maybeSingle();
      data = byUuid.data;
      error = byUuid.error;
    }

    if (!data) {
      router.push("/dashboard");
      return;
    }

    setRepair(data);
    setForm({ ...data });
    setParts(parseParts(data.onderdeel_naam, data.onderdeel_leverancier));
    setLoading(false);
  }, [id, router]);

  useEffect(() => { fetchRepair(); }, [fetchRepair]);

  const updateField = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  const handleWefactSelect = (debtor: any) => {
    const name = debtor.CompanyName || `${debtor.Initials || ""} ${debtor.Surname || debtor.SurName || ""}`.trim();
    setForm((f: any) => ({
      ...f,
      customer_name: name || f.customer_name,
      customer_email: debtor.EmailAddress || f.customer_email,
      customer_phone: debtor.PhoneNumber || debtor.Telephone || f.customer_phone,
      klantnummer: debtor.DebtorCode || f.klantnummer,
      adres: debtor.Address || f.adres,
      woonplaats: debtor.City || f.woonplaats,
    }));
    setWefactDebtor(debtor);
    setShowWefactSearch(false);
    toast.success(`Gekoppeld: ${name}`);
  };

  const handleWefactDisconnect = () => {
    setWefactDebtor(null);
    toast.success("WeFact ontkoppeld");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const partsSerialized = serializeParts(parts);
      const res = await fetch("/api/repairs/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: repair.id,
          job_id: form.job_id,
          customer_name: form.customer_name,
          customer_email: form.customer_email,
          customer_phone: form.customer_phone,
          klantnummer: form.klantnummer,
          device_brand: form.device_brand,
          device_model: form.device_model,
          device_type: form.device_type,
          device_password: form.device_password,
          serial_number: form.serial_number,
          problem_description: form.problem_description,
          status: form.status,
          agreed_price: form.agreed_price,
          kosten: form.kosten,
          onderdeel_besteld: partsSerialized.onderdeel_besteld,
          onderdeel_naam: partsSerialized.onderdeel_naam,
          onderdeel_leverancier: partsSerialized.onderdeel_leverancier,
          datum_in: form.datum_in,
          datum_uit: form.datum_uit,
          adres: form.adres,
          woonplaats: form.woonplaats,
          accessories: form.accessories || [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "Update mislukt");
      toast.success("Opgeslagen!");
      setRepair(json.data);
      setForm({ ...json.data });
      setParts(parseParts(json.data.onderdeel_naam, json.data.onderdeel_leverancier));
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message || "Fout bij opslaan");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (newStatus: string, extraPayload?: Record<string, any>) => {
    // Intercept "Besteld" — show dialog to enter part name
    if (newStatus === "Besteld" && !extraPayload) {
      setBesteldOnderdeel("");
      setShowBesteldDialog(true);
      return;
    }
    setStatusChanging(true);
    try {
      const payload: any = { status: newStatus, ...extraPayload };
      if (newStatus === "Afgehaald" && !repair.datum_uit) {
        payload.datum_uit = new Date().toISOString().split("T")[0];
      }
      const res = await fetch(`/api/repairs?id=${repair.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Statuswijziging mislukt");
      toast.success(`Status → ${newStatus}`);
      fetchRepair();
    } catch (e: any) {
      toast.error("Statuswijziging mislukt");
    } finally {
      setStatusChanging(false);
    }
  };

  const handleBesteldSubmit = () => {
    if (!besteldOnderdeel.trim()) {
      toast.error("Vul een onderdeel in");
      return;
    }
    setShowBesteldDialog(false);
    handleQuickStatus("Besteld", {
      onderdeel_besteld: true,
      onderdeel_naam: besteldOnderdeel.trim(),
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/repairs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [repair.id] }),
      });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      toast.success("Reparatie verwijderd");
      router.push("/dashboard");
    } catch (e: any) {
      toast.error(e.message);
      setDeleting(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" });
  };
  const formatCurrency = (v: any) => {
    if (!v && v !== 0) return "—";
    const n = typeof v === "string" ? parseFloat(v) : v;
    if (isNaN(n)) return "—";
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }
  if (!repair) return null;

  const jobId = repair.job_id || repair.jobid || id;

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-5xl mx-auto">
      {/* Besteld onderdeel dialog */}
      {showBesteldDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBesteldDialog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">📦 Onderdeel bestellen</h3>
            <p className="text-sm text-gray-500 mb-4">Welk onderdeel wordt besteld?</p>
            <input
              type="text"
              autoFocus
              value={besteldOnderdeel}
              onChange={(e) => setBesteldOnderdeel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBesteldSubmit()}
              placeholder="bijv. Batterij, Scherm, Toetsenbord..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowBesteldDialog(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleBesteldSubmit}
                className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600"
              >
                Bestellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back + Actions */}
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setForm({ ...repair }); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">
                <X className="h-3.5 w-3.5" /> Annuleren
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Opslaan
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-semibold hover:bg-gray-50">
                <Edit3 className="h-3.5 w-3.5" /> Bewerken
              </button>
              <RepairReceiptPrinter repair={repair} />
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                    {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verwijderen"}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-800">
                    Nee
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl border shadow-sm p-3 sm:p-4 md:p-5 mb-3 sm:mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-mono font-black text-xs sm:text-sm flex-shrink-0">
              {jobId}
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-black text-gray-900 truncate">
                {editing ? (
                  <input value={form.customer_name || ""} onChange={(e) => updateField("customer_name", e.target.value)}
                    className="border rounded-lg px-2 py-1 text-lg font-black w-full max-w-xs focus:ring-2 focus:ring-blue-500 outline-none" />
                ) : (
                  repair.customer_name || "Onbekende klant"
                )}
              </h1>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                <span>{repair.device_brand} {repair.device_model}</span>
                <span>Binnen: {formatDate(repair.datum_in || repair.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Quick status changer */}
          <div className="relative">
            <select
              value={editing ? form.status : repair.status}
              onChange={(e) => {
                if (editing) updateField("status", e.target.value);
                else handleQuickStatus(e.target.value);
              }}
              disabled={statusChanging}
              className={`appearance-none cursor-pointer px-3 py-2 pr-8 rounded-xl border text-sm font-bold ${
                STATUS_COLORS[editing ? form.status : repair.status] || "bg-gray-100 text-gray-700 border-gray-200"
              }`}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none opacity-50" />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3 sm:mt-4">
          <div className="bg-green-50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-center">
            <p className="text-sm sm:text-lg font-black text-green-700">{formatCurrency(repair.agreed_price)}</p>
            <p className="text-[9px] sm:text-[10px] text-green-600 font-medium">Prijs</p>
          </div>
          <div className="bg-blue-50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-center">
            <p className="text-sm sm:text-lg font-black text-blue-700">{formatCurrency(repair.kosten)}</p>
            <p className="text-[9px] sm:text-[10px] text-blue-600 font-medium">Kosten</p>
          </div>
          <div className="bg-gray-50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-center">
            <p className="text-sm sm:text-lg font-black text-gray-700">{repair.datum_uit ? formatDate(repair.datum_uit) : "—"}</p>
            <p className="text-[9px] sm:text-[10px] text-gray-500 font-medium">Uitboeken</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: Details sections */}
        <div className="lg:col-span-2 space-y-4">
          {/* Klant + Apparaat combined */}
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Klant info */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <User className="h-3 w-3" /> Klant
                </h3>
                <div className="space-y-2">
                  <Field icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={repair.customer_email}
                    editing={editing} editValue={form.customer_email} onChange={(v) => updateField("customer_email", v)} type="email" />
                  <Field icon={<Phone className="h-3.5 w-3.5" />} label="Telefoon" value={repair.customer_phone}
                    editing={editing} editValue={form.customer_phone} onChange={(v) => updateField("customer_phone", v)} />
                  <Field icon={<Hash className="h-3.5 w-3.5" />} label="Klantnr" value={repair.klantnummer}
                    editing={editing} editValue={form.klantnummer} onChange={(v) => updateField("klantnummer", v)} />
                  <Field icon={<MapPin className="h-3.5 w-3.5" />} label="Adres" value={[repair.adres, repair.woonplaats].filter(Boolean).join(", ")}
                    editing={editing} editValue={form.adres} onChange={(v) => updateField("adres", v)} />
                  {editing && (
                    <Field icon={<MapPin className="h-3.5 w-3.5" />} label="Woonplaats" value=""
                      editing editValue={form.woonplaats} onChange={(v) => updateField("woonplaats", v)} />
                  )}
                  {/* WeFact koppeling */}
                  {editing && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {wefactDebtor ? (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 text-xs">
                            <Link2 className="h-3.5 w-3.5 text-green-600" />
                            <span className="font-semibold text-green-800">WeFact: {wefactDebtor.DebtorCode}</span>
                          </div>
                          <button onClick={handleWefactDisconnect} className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 font-medium">
                            <Unlink className="h-3 w-3" /> Ontkoppelen
                          </button>
                        </div>
                      ) : showWefactSearch ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase">WeFact koppelen</span>
                            <button onClick={() => setShowWefactSearch(false)} className="text-xs text-gray-400 hover:text-gray-600">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <WeFactDebtorSearch onSelect={handleWefactSelect} placeholder="Zoek klant in WeFact..." />
                        </div>
                      ) : (
                        <button onClick={() => setShowWefactSearch(true)}
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                          <Link2 className="h-3.5 w-3.5" /> Koppel aan WeFact
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Apparaat info */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Monitor className="h-3 w-3" /> Apparaat
                </h3>
                <div className="space-y-2">
                  <Field icon={<Monitor className="h-3.5 w-3.5" />} label="Type" value={repair.device_type}
                    editing={editing} editValue={form.device_type} onChange={(v) => updateField("device_type", v)} />
                  <Field icon={<Wrench className="h-3.5 w-3.5" />} label="Merk" value={repair.device_brand}
                    editing={editing} editValue={form.device_brand} onChange={(v) => updateField("device_brand", v)} />
                  <Field icon={<Wrench className="h-3.5 w-3.5" />} label="Model" value={repair.device_model}
                    editing={editing} editValue={form.device_model} onChange={(v) => updateField("device_model", v)} />
                  <Field icon={<Hash className="h-3.5 w-3.5" />} label="Serie" value={repair.serial_number} mono
                    editing={editing} editValue={form.serial_number} onChange={(v) => updateField("serial_number", v)} />
                  <Field icon={<Key className="h-3.5 w-3.5" />} label="Wachtwoord" value={repair.device_password}
                    editing={editing} editValue={form.device_password} onChange={(v) => updateField("device_password", v)} />
                </div>
              </div>
            </div>
          </div>

          {/* Probleem */}
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Probleem
            </h3>
            {editing ? (
              <textarea value={form.problem_description || ""} onChange={(e) => updateField("problem_description", e.target.value)}
                rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
            ) : (
              <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                {repair.problem_description || <span className="text-gray-400 italic">Geen beschrijving</span>}
              </p>
            )}
          </div>

          {/* Financieel + Onderdelen */}
          {editing && (
            <div className="bg-white rounded-2xl border shadow-sm p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Euro className="h-3 w-3" /> Financieel & Onderdelen
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Prijsafspraak</label>
                  <input type="number" step="0.01" value={form.agreed_price || ""} onChange={(e) => updateField("agreed_price", e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-sm mt-0.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Kosten</label>
                  <input type="number" step="0.01" value={form.kosten || ""} onChange={(e) => updateField("kosten", e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-sm mt-0.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Datum in</label>
                  <input type="date" value={form.datum_in || ""} onChange={(e) => updateField("datum_in", e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-sm mt-0.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Datum uit</label>
                  <input type="date" value={form.datum_uit || ""} onChange={(e) => updateField("datum_uit", e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-sm mt-0.5 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="mt-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Package className="h-3 w-3" /> Bestelde onderdelen
                </h4>
                <div className="space-y-2">
                  {parts.map((part, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                      <input value={part.naam} onChange={(e) => {
                        const updated = [...parts]; updated[idx] = { ...updated[idx], naam: e.target.value }; setParts(updated);
                      }} placeholder="Onderdeel" className="flex-1 border rounded px-2 py-1 text-sm" />
                      <input value={part.leverancier} onChange={(e) => {
                        const updated = [...parts]; updated[idx] = { ...updated[idx], leverancier: e.target.value }; setParts(updated);
                      }} placeholder="Leverancier" className="w-28 border rounded px-2 py-1 text-sm" />
                      <input type="date" value={part.besteld_op} onChange={(e) => {
                        const updated = [...parts]; updated[idx] = { ...updated[idx], besteld_op: e.target.value }; setParts(updated);
                      }} className="w-32 border rounded px-2 py-1 text-sm" />
                      <select value={part.status} onChange={(e) => {
                        const updated = [...parts]; updated[idx] = { ...updated[idx], status: e.target.value }; setParts(updated);
                      }} className="w-28 border rounded px-2 py-1 text-sm">
                        {PART_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={() => setParts(parts.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => setParts([...parts, { naam: "", leverancier: "DDKM", besteld_op: new Date().toISOString().split("T")[0], status: "besteld" }])}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Onderdeel toevoegen</button>
                </div>
              </div>
            </div>
          )}

          {/* Accessories */}
          {(repair.accessories?.length > 0 || editing) && (
            <div className="bg-white rounded-2xl border shadow-sm p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Package className="h-3 w-3" /> Accessoires
              </h3>
              {editing ? (
                <div className="space-y-2">
                  {(form.accessories || []).map((acc: Accessory, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                      <input value={acc.label} onChange={(e) => {
                        const updated = [...(form.accessories || [])];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        updateField("accessories", updated);
                      }} placeholder="Label" className="flex-1 border rounded px-2 py-1 text-sm" />
                      <input type="number" value={acc.quantity} onChange={(e) => {
                        const updated = [...(form.accessories || [])];
                        updated[idx] = { ...updated[idx], quantity: parseInt(e.target.value) || 1 };
                        updateField("accessories", updated);
                      }} className="w-16 border rounded px-2 py-1 text-sm text-center" />
                      <button onClick={() => {
                        const updated = (form.accessories || []).filter((_: any, i: number) => i !== idx);
                        updateField("accessories", updated);
                      }} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => updateField("accessories", [...(form.accessories || []), { type: "overig", label: "", quantity: 1, notes: "" }])}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Accessoire toevoegen</button>
                </div>
              ) : (
                <div className="space-y-1">
                  {repair.accessories.map((acc: Accessory, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm py-1">
                      <span className="text-gray-800">{acc.label} <span className="text-gray-400 text-xs">({acc.type})</span></span>
                      <span className="text-blue-700 font-semibold text-xs">x{acc.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bestelde onderdelen (view mode) */}
          {!editing && parseParts(repair.onderdeel_naam, repair.onderdeel_leverancier).length > 0 && (
            <div className="bg-white rounded-2xl border shadow-sm p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Package className="h-3 w-3" /> Bestelde onderdelen
              </h3>
              <div className="space-y-2">
                {parseParts(repair.onderdeel_naam, repair.onderdeel_leverancier).map((part, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-orange-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-orange-800">{part.naam}</span>
                      {part.leverancier && <span className="text-xs text-orange-600">({part.leverancier})</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {part.besteld_op && (
                        <span className="text-[10px] text-gray-500">{new Date(part.besteld_op).toLocaleDateString("nl-NL", { day: "2-digit", month: "short" })}</span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PART_STATUS_COLORS[part.status] || "bg-gray-100 text-gray-700"}`}>
                        {part.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <RepairNotes jobid={jobId} />
        </div>

        {/* RIGHT: Timeline + Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          {/* Timeline */}
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Tijdslijn
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-900">Ingenomen</p>
                  <p className="text-xs text-gray-500">{formatDate(repair.datum_in || repair.created_at)}</p>
                </div>
              </div>
              {repair.datum_uit && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">Uitgeboekt</p>
                    <p className="text-xs text-gray-500">{formatDate(repair.datum_uit)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-900">Aangemaakt</p>
                  <p className="text-xs text-gray-500">{formatDate(repair.created_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick status buttons */}
          {!editing && (
            <div className="bg-white rounded-2xl border shadow-sm p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Snelle acties</h3>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.filter((s) => s !== repair.status).slice(0, 6).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleQuickStatus(s)}
                    disabled={statusChanging}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-colors border ${STATUS_COLORS[s] || "bg-gray-100 text-gray-600 border-gray-200"} hover:opacity-80`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Field component ────────────────────────── */

function Field({
  icon, label, value, editing, editValue, onChange, type = "text", mono = false,
}: {
  icon: React.ReactNode; label: string; value: string; editing: boolean;
  editValue?: string; onChange?: (v: string) => void; type?: string; mono?: boolean;
}) {
  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-400 flex-shrink-0">{icon}</span>
        <input type={type} value={editValue || ""} onChange={(e) => onChange?.(e.target.value)}
          placeholder={label} className="flex-1 border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>
    );
  }
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400 flex-shrink-0">{icon}</span>
      <span className={`text-gray-700 text-xs ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
