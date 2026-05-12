"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, Mail, Phone, MapPin, Hash, Wrench,
  ShoppingBag, Copy, Check, Save, Edit3,
  Loader2, FileText, Clock, Euro, AlertCircle, Package,
  ClipboardCheck, Search, Plus, Laptop, Settings
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const STATUS_COLORS: Record<string, string> = {
  "Nieuw": "bg-blue-100 text-blue-800",
  "In reparatie": "bg-yellow-100 text-yellow-800",
  "Besteld": "bg-orange-100 text-orange-800",
  "Reparatie klaar": "bg-green-100 text-green-800",
  "Afgehaald": "bg-gray-100 text-gray-700",
  "Geannuleerd": "bg-red-100 text-red-800",
};

type TabType = "all" | "repairs" | "apk" | "purchases" | "parts" | "donations";

interface Dossier {
  customer: any;
  repairs: any[];
  apk: any[];
  unlinked_repairs: any[];
  purchases: any[];
  parts: any[];
  donations: any[];
  stats: { total_repairs: number; active_repairs: number; total_spent: number; total_purchases: number; total_apk: number; total_parts: number; total_donations: number };
}

export default function KlantDossierPage() {
  const router = useRouter();
  const { id } = useParams();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [linking, setLinking] = useState(false);

  const fetchDossier = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/customers/${id}`);
    if (!res.ok) {
      router.push("/klanten");
      return;
    }
    const json = await res.json();
    if (!json.apk) json.apk = [];
    if (!json.donations) json.donations = [];
    if (!json.stats.total_apk) json.stats.total_apk = 0;
    if (!json.stats.total_donations) json.stats.total_donations = 0;
    setDossier(json);
    setEditForm({
      first_name: json.customer.first_name || "",
      last_name: json.customer.last_name || "",
      email: json.customer.email || "",
      phone: json.customer.phone || "",
      adres: json.customer.adres || "",
      woonplaats: json.customer.woonplaats || "",
      klantnummer: json.customer.klantnummer || "",
      notities: json.customer.notities || "",
    });
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
      else fetchDossier();
    });
  }, [router, fetchDossier]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/customers?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditing(false);
      fetchDossier();
    }
    setSaving(false);
  };

  // Link unlinked repairs to this customer
  const linkRepairs = async () => {
    if (!dossier?.unlinked_repairs.length) return;
    setLinking(true);
    for (const r of dossier.unlinked_repairs) {
      await fetch(`/api/repairs?id=${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: id }),
      });
    }
    setLinking(false);
    fetchDossier();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(v);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!dossier) return null;

  const { customer: c, repairs, apk, unlinked_repairs, purchases, parts = [], donations = [], stats } = dossier;
  const allRepairs = [...repairs, ...unlinked_repairs];

  // Build unified timeline for "all" tab
  const buildTimeline = () => {
    const items: { type: string; data: any; date: string }[] = [];
    allRepairs.forEach((r) => items.push({ type: "repair", data: r, date: r.datum_in || r.created_at }));
    (apk || []).forEach((a) => items.push({ type: "apk", data: a, date: a.created_at }));
    purchases.forEach((p) => items.push({ type: "purchase", data: p, date: p.sold_date || p.created_at }));
    parts.forEach((p) => items.push({ type: "part", data: p, date: p.used_date || p.created_at }));
    donations.forEach((d) => items.push({ type: "donation", data: d, date: d.created_at }));
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  };

  const totalActivities = allRepairs.length + (apk?.length || 0) + purchases.length + parts.length + donations.length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Back */}
      <Link href="/klanten" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Terug naar klanten
      </Link>

      {/* Header — compact */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
              {(c.first_name?.[0] || c.display_name?.[0] || "?").toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">
                {c.display_name || `${c.first_name} ${c.last_name}`.trim() || "Naamloos"}
              </h1>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                {c.klantnummer && <span>#{c.klantnummer}</span>}
                <span>Klant sinds {formatDate(c.created_at)}</span>
              </div>
            </div>
          </div>
          {!c._derived && (
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors hover:bg-gray-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? <Save className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              {editing ? "Opslaan" : "Bewerken"}
            </button>
          )}
        </div>

        {/* Stats row — compact */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-4">
          <div className="bg-blue-50 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-black text-blue-700">{stats.total_repairs}</p>
            <p className="text-[10px] text-blue-600 font-medium">Reparaties</p>
          </div>
          <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-black text-green-700">{stats.active_repairs}</p>
            <p className="text-[10px] text-green-600 font-medium">Actief</p>
          </div>
          <div className="bg-indigo-50 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-black text-indigo-700">{stats.total_apk}</p>
            <p className="text-[10px] text-indigo-600 font-medium">APK/Onderhoud</p>
          </div>
          <div className="bg-purple-50 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-black text-purple-700">{formatCurrency(stats.total_spent)}</p>
            <p className="text-[10px] text-purple-600 font-medium">Besteed</p>
          </div>
          <div className="bg-orange-50 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-black text-orange-700">{stats.total_purchases}</p>
            <p className="text-[10px] text-orange-600 font-medium">Aankopen</p>
          </div>
          <div className="bg-teal-50 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-black text-teal-700">{stats.total_parts || 0}</p>
            <p className="text-[10px] text-teal-600 font-medium">Onderdelen</p>
          </div>
          <div className="bg-emerald-50 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-black text-emerald-700">{stats.total_donations || 0}</p>
            <p className="text-[10px] text-emerald-600 font-medium">Donaties</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          <Link
            href={`/inboeken?customer=${encodeURIComponent(c.display_name || `${c.first_name || ''} ${c.last_name || ''}`.trim())}&email=${encodeURIComponent(c.email || '')}&phone=${encodeURIComponent(c.phone || '')}&klantnummer=${encodeURIComponent(c.klantnummer || '')}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nieuwe reparatie
          </Link>
          <Link
            href={`/inboeken?type=apk&customer=${encodeURIComponent(c.display_name || `${c.first_name || ''} ${c.last_name || ''}`.trim())}&email=${encodeURIComponent(c.email || '')}&phone=${encodeURIComponent(c.phone || '')}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Nieuwe APK
          </Link>
          <Link
            href={`/refurbished?action=sell&customer=${encodeURIComponent(c.display_name || `${c.first_name || ''} ${c.last_name || ''}`.trim())}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg text-xs font-semibold hover:bg-orange-700 transition-colors"
          >
            <Laptop className="h-3.5 w-3.5" />
            Laptop verkopen
          </Link>
          <Link
            href={`/parts/inventory?action=sell&customer=${encodeURIComponent(c.display_name || `${c.first_name || ''} ${c.last_name || ''}`.trim())}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors"
          >
            <Package className="h-3.5 w-3.5" />
            Onderdeel verkopen
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: Contact + Notes */}
        <div className="lg:col-span-1 space-y-4">
          {/* Contact info */}
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm">
              <User className="h-4 w-4" /> Contactgegevens
            </h3>

            {editing ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    placeholder="Voornaam" className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  <input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    placeholder="Achternaam" className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="E-mail" className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="Telefoon" className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <input value={editForm.adres} onChange={(e) => setEditForm({ ...editForm, adres: e.target.value })}
                  placeholder="Adres" className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <input value={editForm.woonplaats} onChange={(e) => setEditForm({ ...editForm, woonplaats: e.target.value })}
                  placeholder="Woonplaats" className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <input value={editForm.klantnummer} onChange={(e) => setEditForm({ ...editForm, klantnummer: e.target.value })}
                  placeholder="Klantnummer" className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-800">Annuleren</button>
              </div>
            ) : (
              <div className="space-y-3">
                {c.email && (
                  <div className="flex items-center gap-2 text-sm group">
                    <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700 flex-1 truncate">{c.email}</span>
                    <button onClick={() => copyToClipboard(c.email, "email")} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {copied === "email" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                    </button>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2 text-sm group">
                    <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700 flex-1">{c.phone}</span>
                    <button onClick={() => copyToClipboard(c.phone, "phone")} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {copied === "phone" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                    </button>
                  </div>
                )}
                {(c.adres || c.woonplaats) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">{[c.adres, c.woonplaats].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                {c.klantnummer && (
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">{c.klantnummer}</span>
                  </div>
                )}
                {!c.email && !c.phone && !c.adres && !c.klantnummer && (
                  <p className="text-sm text-gray-400 italic">Geen contactgegevens ingevuld</p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" /> Notities
            </h3>
            {editing ? (
              <textarea
                value={editForm.notities}
                onChange={(e) => setEditForm({ ...editForm, notities: e.target.value })}
                rows={3}
                className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Notities..."
              />
            ) : (
              <p className="text-xs text-gray-600 whitespace-pre-wrap">
                {c.notities || <span className="text-gray-400 italic">Geen notities</span>}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT: Activity tabs */}
        <div className="lg:col-span-2">
          {/* Unlinked repairs banner */}
          {unlinked_repairs.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  <strong>{unlinked_repairs.length}</strong> reparatie{unlinked_repairs.length !== 1 ? "s" : ""} niet gekoppeld
                </p>
              </div>
              <button
                onClick={linkRepairs}
                disabled={linking}
                className="bg-amber-600 text-white px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors flex items-center gap-1"
              >
                {linking ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Koppelen
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-3 bg-gray-100 rounded-xl p-1 overflow-x-auto">
            {[
              { key: "all" as TabType, label: "Alles", count: totalActivities },
              { key: "repairs" as TabType, label: "Reparaties", count: allRepairs.length },
              { key: "apk" as TabType, label: "APK", count: apk?.length || 0 },
              { key: "purchases" as TabType, label: "Aankopen", count: purchases.length },
              { key: "parts" as TabType, label: "Onderdelen", count: parts.length },
              { key: "donations" as TabType, label: "Donaties", count: donations.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* All / Timeline tab */}
          {activeTab === "all" && (
            <div className="space-y-2">
              {totalActivities === 0 ? (
                <div className="bg-white rounded-xl border p-8 text-center">
                  <Search className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium text-sm">Geen activiteit gevonden</p>
                </div>
              ) : (
                buildTimeline().map((item) => {
                  if (item.type === "repair") return <RepairCard key={`r-${item.data.id}`} r={item.data} formatDate={formatDate} />;
                  if (item.type === "apk") return <ApkCard key={`a-${item.data.id}`} a={item.data} formatDate={formatDate} />;
                  if (item.type === "purchase") return <PurchaseCard key={`p-${item.data.id}`} p={item.data} formatDate={formatDate} formatCurrency={formatCurrency} />;
                  if (item.type === "part") return <PartsCard key={`pt-${item.data.id}`} p={item.data} formatDate={formatDate} formatCurrency={formatCurrency} />;
                  if (item.type === "donation") return <DonationCard key={`d-${item.data.id}`} d={item.data} formatDate={formatDate} />;
                  return null;
                })
              )}
            </div>
          )}

          {/* Repairs tab */}
          {activeTab === "repairs" && (
            <div className="space-y-2">
              {allRepairs.length === 0 ? (
                <div className="bg-white rounded-xl border p-8 text-center">
                  <Wrench className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium text-sm">Geen reparaties</p>
                </div>
              ) : (
                allRepairs.map((r) => <RepairCard key={r.id} r={r} formatDate={formatDate} />)
              )}
            </div>
          )}

          {/* APK tab */}
          {activeTab === "apk" && (
            <div className="space-y-2">
              {!apk?.length ? (
                <div className="bg-white rounded-xl border p-8 text-center">
                  <ClipboardCheck className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium text-sm">Geen APK/onderhoud</p>
                </div>
              ) : (
                apk.map((a) => <ApkCard key={a.id} a={a} formatDate={formatDate} />)
              )}
            </div>
          )}

          {/* Purchases tab */}
          {activeTab === "purchases" && (
            <div className="space-y-2">
              {purchases.length === 0 ? (
                <div className="bg-white rounded-xl border p-8 text-center">
                  <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium text-sm">Geen aankopen</p>
                </div>
              ) : (
                purchases.map((p) => <PurchaseCard key={p.id} p={p} formatDate={formatDate} formatCurrency={formatCurrency} />)
              )}
            </div>
          )}

          {/* Parts tab */}
          {activeTab === "parts" && (
            <div className="space-y-2">
              {parts.length === 0 ? (
                <div className="bg-white rounded-xl border p-8 text-center">
                  <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium text-sm">Geen onderdelen</p>
                </div>
              ) : (
                parts.map((p) => <PartsCard key={p.id} p={p} formatDate={formatDate} formatCurrency={formatCurrency} />)
              )}
            </div>
          )}

          {/* Donations tab */}
          {activeTab === "donations" && (
            <div className="space-y-2">
              {donations.length === 0 ? (
                <div className="bg-white rounded-xl border p-8 text-center">
                  <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium text-sm">Geen donaties/inkoop</p>
                </div>
              ) : (
                donations.map((d) => <DonationCard key={d.id} d={d} formatDate={formatDate} />)
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────── */

function RepairCard({ r, formatDate }: { r: any; formatDate: (d: string) => string }) {
  return (
    <Link
      href={`/repairs/${r.job_id || r.id}`}
      className="block bg-white rounded-xl border p-3 hover:ring-2 hover:ring-blue-200 transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Wrench className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs">{r.job_id}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600"}`}>
                {r.status}
              </span>
            </div>
            <p className="text-xs text-gray-600 truncate">
              {[r.device_brand, r.device_model].filter(Boolean).join(" ") || "Onbekend apparaat"}
              {r.problem_description ? ` — ${r.problem_description}` : ""}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-gray-400">{formatDate(r.datum_in || r.created_at)}</p>
          {(r.kosten || r.agreed_price) && (
            <p className="text-xs font-bold text-gray-700">€{parseFloat(r.kosten || r.agreed_price).toFixed(2)}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

function ApkCard({ a, formatDate }: { a: any; formatDate: (d: string) => string }) {
  return (
    <Link
      href={`/apk/${a.id}`}
      className="block bg-white rounded-xl border p-3 hover:ring-2 hover:ring-indigo-200 transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs">{a.job_id}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[a.status] || "bg-gray-100 text-gray-600"}`}>
                {a.status}
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700">APK</span>
            </div>
            <p className="text-xs text-gray-600 truncate">
              {[a.device_brand, a.device_model].filter(Boolean).join(" ") || "Onbekend apparaat"}
            </p>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 flex-shrink-0">{formatDate(a.created_at)}</p>
      </div>
    </Link>
  );
}

function PurchaseCard({ p, formatDate, formatCurrency }: { p: any; formatDate: (d: string) => string; formatCurrency: (v: number) => string }) {
  return (
    <Link
      href={`/refurbished/${p.id}`}
      className="block bg-white rounded-xl border p-3 hover:ring-2 hover:ring-orange-200 transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="h-3.5 w-3.5 text-orange-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900">
              {[p.brand || p.merk, p.model].filter(Boolean).join(" ") || "Onbekend product"}
            </p>
            {p.origin && <p className="text-[10px] text-gray-500">{p.origin}</p>}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {(p.price || p.verkoop_prijs) && (
            <p className="text-xs font-bold text-gray-700">{formatCurrency(p.price || p.verkoop_prijs)}</p>
          )}
          <p className="text-[10px] text-gray-400">{formatDate(p.sold_date || p.created_at)}</p>
        </div>
      </div>
    </Link>
  );
}

function PartsCard({ p, formatDate, formatCurrency }: { p: any; formatDate: (d: string) => string; formatCurrency: (v: number) => string }) {
  const partName = [p.category, p.brand, p.model].filter(Boolean).join(" ") || "Onbekend onderdeel";
  return (
    <Link
      href={`/parts/${p.id}`}
      className="block bg-white rounded-xl border p-3 hover:ring-2 hover:ring-teal-200 transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Package className="h-3.5 w-3.5 text-teal-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {partName}
              </p>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 text-teal-700">
                {p.status}
              </span>
            </div>
            <p className="text-[10px] text-gray-500 truncate">
              {p.short_id && <span className="font-mono">{p.short_id}</span>}
              {p.used_in_device && ` — ${p.used_in_device}`}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-gray-400">{formatDate(p.used_date || p.created_at)}</p>
        </div>
      </div>
    </Link>
  );
}

function DonationCard({ d, formatDate }: { d: any; formatDate: (d: string) => string }) {
  const deviceName = [d.brand, d.model].filter(Boolean).join(" ") || "Onbekend apparaat";
  const originLabel = d.origin === "donatie" ? "💚 Donatie" : d.origin === "inkoop" ? "💙 Inkoop" : d.origin;
  
  return (
    <Link
      href={`/refurbished/${d.id}`}
      className="block bg-white rounded-xl border p-3 hover:ring-2 hover:ring-emerald-200 transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Laptop className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-gray-900 truncate">{deviceName}</p>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                d.origin === "donatie" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
              }`}>
                {originLabel}
              </span>
              {d.status && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                  {d.status}
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 truncate">
              Van klant {d.origin === "donatie" ? "gedoneerd" : "ingekocht"}
              {d.price && d.origin === "inkoop" && ` voor €${parseFloat(d.price).toFixed(2)}`}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-gray-400">{formatDate(d.created_at)}</p>
        </div>
      </div>
    </Link>
  );
}
