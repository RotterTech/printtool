"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Printer, Calendar, Package, Tag, Edit3, Save, X,
  Loader2, Monitor, Cpu, HardDrive, MemoryStick, Wrench, LogOut, Trash2, Search, User
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

const STATUS_OPTIONS = ["Op Voorraad", "Gebruikt", "Verkocht", "Defect"];

const STATUS_COLORS: Record<string, string> = {
  "Op Voorraad": "bg-green-100 text-green-800 border-green-200",
  "Gebruikt": "bg-orange-100 text-orange-800 border-orange-200",
  "Verkocht": "bg-blue-100 text-blue-800 border-blue-200",
  "Defect": "bg-red-100 text-red-800 border-red-200",
};

const CATEGORY_ICONS: Record<string, any> = {
  "RAM": MemoryStick,
  "SSD": HardDrive,
  "HDD": HardDrive,
  "CPU": Cpu,
  "GPU": Monitor,
  "Screen": Monitor,
};

export default function PartDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [part, setPart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [siblingParts, setSiblingParts] = useState<any[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutData, setCheckoutData] = useState({ client: "", device: "", notes: "", customerId: "" });
  
  // Customer search
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Helper to get customer display name
  const getCustomerDisplayName = (c: any) => {
    if (c.display_name) return c.display_name;
    return `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Naamloos";
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Fetch customers when dialog opens or search changes
  useEffect(() => {
    if (!showCheckout) return;
    
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const url = customerSearch 
          ? `/api/customers?q=${encodeURIComponent(customerSearch)}`
          : "/api/customers";
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          setCustomers(json.data || []);
        }
      } catch (err) {
        console.error("Error fetching customers:", err);
      } finally {
        setLoadingCustomers(false);
      }
    };
    const timer = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timer);
  }, [showCheckout, customerSearch]);

  const fetchPart = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    try {
      const idStr = String(id);
      const isUuid = idStr.length > 30;
      const normalizedId = idStr.toUpperCase();
      const isNumeric = /^\d+$/.test(normalizedId);

      let query = supabase.from("pulled_parts").select("*");

      if (isUuid) {
        query = query.eq("id", idStr);
      } else if (isNumeric) {
        query = query.eq("short_id", normalizedId);
      } else {
        let searchId = normalizedId;
        if (!searchId.startsWith("P")) searchId = "P" + searchId;
        query = query.eq("short_id", searchId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error("Error fetching part:", error);
        toast.error("Kon onderdeel niet laden");
        return;
      }

      if (data) {
        setPart(data);
        setForm({ ...data });

        // Fetch siblings
        const partCreatedAt = new Date(data.created_at);
        const fiveMinutesEarlier = new Date(partCreatedAt.getTime() - 5 * 60 * 1000);
        const fiveMinutesLater = new Date(partCreatedAt.getTime() + 5 * 60 * 1000);

        const { data: siblings } = await supabase
          .from("pulled_parts")
          .select("id, short_id, category, specs, status")
          .eq("brand", data.brand)
          .eq("model", data.model)
          .gte("created_at", fiveMinutesEarlier.toISOString())
          .lte("created_at", fiveMinutesLater.toISOString())
          .neq("id", data.id)
          .order("created_at", { ascending: false });

        setSiblingParts(siblings || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Er ging iets mis");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPart();
  }, [fetchPart]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("pulled_parts")
        .update({
          category: form.category,
          specs: form.specs,
          note: form.note,
          status: form.status,
          brand: form.brand,
          model: form.model,
        })
        .eq("id", part.id);

      if (error) throw error;

      setPart({ ...part, ...form });
      setEditing(false);
      toast.success("Onderdeel bijgewerkt");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async () => {
    if (!checkoutData.client.trim()) {
      toast.error("Vul klantnaam in");
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        status: "Gebruikt",
        used_by_client: checkoutData.client,
        used_in_device: checkoutData.device,
        used_date: new Date().toISOString(),
        note: checkoutData.notes ? `${part.note || ""} | Checkout: ${checkoutData.notes}`.trim() : part.note,
      };
      
      // Add customer_id if a customer was selected (but not derived IDs)
      if (checkoutData.customerId && !checkoutData.customerId.startsWith('derived-')) {
        updateData.customer_id = checkoutData.customerId;
      }
      
      const { error } = await supabase
        .from("pulled_parts")
        .update(updateData)
        .eq("id", part.id);

      if (error) throw error;

      toast.success("Onderdeel uitgeboekt!");
      setShowCheckout(false);
      setCustomerSearch("");
      setCheckoutData({ client: "", device: "", notes: "", customerId: "" });
      fetchPart();
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Uitboeken mislukt");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Weet je zeker dat je dit onderdeel wilt verwijderen?")) return;

    try {
      const { error } = await supabase.from("pulled_parts").delete().eq("id", part.id);
      if (error) throw error;
      toast.success("Onderdeel verwijderd");
      router.push("/parts/inventory");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Verwijderen mislukt");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!part) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/parts/inventory" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
            <ArrowLeft className="w-4 h-4" /> Terug
          </Link>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <Package className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900">Niet gevonden</h2>
            <p className="text-gray-600 text-sm mt-1">Onderdeel #{id} bestaat niet.</p>
          </div>
        </div>
      </div>
    );
  }

  const CategoryIcon = CATEGORY_ICONS[part.category] || Package;
  const displayId = part.short_id || `PART-${part.id.substring(0, 8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Checkout Dialog */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📦 Onderdeel Uitboeken</h3>
            <div className="space-y-4">
              <div ref={dropdownRef} className="relative">
                <label className="block text-sm font-bold text-gray-700 mb-2">Klant *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={checkoutData.client}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCheckoutData({ ...checkoutData, client: e.target.value, customerId: "" });
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="w-full h-11 px-4 pr-10 border border-gray-300 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Zoek of typ klantnaam..."
                  />
                  {loadingCustomers ? (
                    <Loader2 className="absolute right-3 top-3 w-5 h-5 text-gray-400 animate-spin" />
                  ) : (
                    <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                  )}
                </div>
                
                {/* Customer Dropdown */}
                {showCustomerDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {customers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        {loadingCustomers ? "Laden..." : checkoutData.client ? `"${checkoutData.client}" als nieuwe klant` : "Typ om te zoeken..."}
                      </div>
                    ) : (
                      customers.slice(0, 8).map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            const name = getCustomerDisplayName(customer);
                            setCheckoutData({ ...checkoutData, client: name, customerId: customer.id });
                            setShowCustomerDropdown(false);
                            setCustomerSearch("");
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-orange-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                        >
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-orange-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {getCustomerDisplayName(customer)}
                            </p>
                            {(customer.email || customer.phone) && (
                              <p className="text-xs text-gray-500 truncate">
                                {customer.email || customer.phone}
                              </p>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Apparaat</label>
                <input
                  type="text"
                  value={checkoutData.device}
                  onChange={(e) => setCheckoutData({ ...checkoutData, device: e.target.value })}
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Bijv. HP ProBook 450"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Notities</label>
                <textarea
                  value={checkoutData.notes}
                  onChange={(e) => setCheckoutData({ ...checkoutData, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="Extra opmerkingen..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCheckout(false);
                  setCustomerSearch("");
                  setCheckoutData({ client: "", device: "", notes: "", customerId: "" });
                }}
                className="flex-1 h-11 px-4 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-lg transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleCheckout}
                disabled={saving}
                className="flex-1 h-11 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Bezig..." : "Uitboeken"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto p-3 sm:p-4 md:p-6">
        {/* Top Actions */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/parts/inventory"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-gray-100 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Terug
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); setForm({ ...part }); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">
                  <X className="w-4 h-4" /> Annuleren
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                  <Save className="w-4 h-4" /> {saving ? "..." : "Opslaan"}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-semibold hover:bg-gray-50">
                  <Edit3 className="w-4 h-4" /> Bewerken
                </button>
                <Link href={`/parts/${part.id}/print`} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
                  <Printer className="w-4 h-4" /> Print
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 md:p-5 mb-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <CategoryIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono font-bold text-blue-600 text-sm bg-blue-50 px-2 py-0.5 rounded">
                  {displayId}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[part.status] || "bg-gray-100 text-gray-700"}`}>
                  {part.status}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                {editing ? (
                  <input
                    type="text"
                    value={form.category || ""}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-lg font-bold"
                    placeholder="Categorie"
                  />
                ) : (
                  part.category || "Onderdeel"
                )}
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                {editing ? (
                  <input
                    type="text"
                    value={form.specs || ""}
                    onChange={(e) => setForm({ ...form, specs: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm"
                    placeholder="Specificaties"
                  />
                ) : (
                  part.specs || "Geen specificaties"
                )}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 pt-3 border-t">
            <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-gray-50 rounded-lg">
              <Tag className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500">Merk</span>
              <span className="text-sm font-semibold text-gray-900">
                {editing ? (
                  <input
                    type="text"
                    value={form.brand || ""}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-20 px-1 py-0.5 border rounded text-sm"
                  />
                ) : (
                  part.brand || "—"
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-gray-50 rounded-lg">
              <Monitor className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500">Model</span>
              <span className="text-sm font-semibold text-gray-900">
                {editing ? (
                  <input
                    type="text"
                    value={form.model || ""}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-24 px-1 py-0.5 border rounded text-sm"
                  />
                ) : (
                  part.model || "—"
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-gray-50 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500">Toegevoegd</span>
              <span className="text-sm font-semibold text-gray-900">{formatDate(part.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Details Sections */}
        <div className="space-y-4">
          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">📝 Notities</h3>
            {editing ? (
              <textarea
                value={form.note || ""}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                rows={3}
                placeholder="Voeg notities toe..."
              />
            ) : (
              <p className="text-gray-700 text-sm">{part.note || "Geen notities"}</p>
            )}
          </div>

          {/* Status (edit mode) */}
          {editing && (
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">📊 Status wijzigen</h3>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setForm({ ...form, status })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.status === status
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Used Info (if applicable) */}
          {(part.status === "Gebruikt" || part.status === "Verkocht") && part.used_by_client && (
            <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
              <h3 className="text-sm font-semibold text-orange-800 mb-2">🔧 Gebruikt bij</h3>
              <div className="space-y-1.5 text-sm">
                <p><span className="text-gray-600">Klant:</span> <span className="font-semibold text-gray-900">{part.used_by_client}</span></p>
                {part.used_in_device && <p><span className="text-gray-600">Apparaat:</span> <span className="font-semibold text-gray-900">{part.used_in_device}</span></p>}
                {part.used_date && <p><span className="text-gray-600">Datum:</span> <span className="font-semibold text-gray-900">{formatDate(part.used_date)}</span></p>}
              </div>
            </div>
          )}

          {/* Siblings */}
          {siblingParts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📦 Ook uit dit apparaat</h3>
              <div className="space-y-2">
                {siblingParts.map((sibling) => (
                  <Link
                    key={sibling.id}
                    href={`/parts/${sibling.id}`}
                    className="block p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors border hover:border-blue-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs text-gray-500">{sibling.short_id || sibling.id.substring(0, 8)}</span>
                        <p className="text-sm font-semibold text-gray-900">{sibling.category}</p>
                        {sibling.specs && <p className="text-xs text-gray-600">{sibling.specs}</p>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[sibling.status] || "bg-gray-100 text-gray-700"}`}>
                        {sibling.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {part.status === "Op Voorraad" && (
            <button
              onClick={() => setShowCheckout(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Uitboeken / Gebruiken
            </button>
          )}
          <Link
            href={`/parts/${part.id}/print`}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            <Printer className="w-5 h-5" />
            Print Label
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            <span className="sm:hidden">Verwijder</span>
          </button>
        </div>
      </div>
    </div>
  );
}
