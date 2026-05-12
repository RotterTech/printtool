"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Search, Plus, Mail, Phone, Wrench,
  ChevronRight, X, Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  klantnummer: string | null;
  created_at: string;
}

export default function KlantenPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [repairCounts, setRepairCounts] = useState<Record<string, number>>({});
  const [isDerived, setIsDerived] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // New customer form
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    adres: "", woonplaats: "", klantnummer: "", notities: "",
  });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    const res = await fetch(`/api/customers?${params}`);
    const json = await res.json();
    const data = json.data || [];
    setCustomers(data);
    // Check if we're in derived mode (customers auto-generated from repairs)
    if (data.length > 0 && data[0]._derived) setIsDerived(true);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    // Check auth
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
    });
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  // Fetch repair counts per customer (only for real customers, derived have _repair_count)
  useEffect(() => {
    if (customers.length === 0) return;
    // For derived customers, use embedded _repair_count
    const derivedCounts: Record<string, number> = {};
    const realIds: string[] = [];
    for (const c of customers) {
      if ((c as any)._derived && (c as any)._repair_count) {
        derivedCounts[c.id] = (c as any)._repair_count;
      } else {
        realIds.push(c.id);
      }
    }
    setRepairCounts(prev => ({ ...prev, ...derivedCounts }));

    if (realIds.length > 0) {
      fetch(`/api/customers/counts?ids=${realIds.join(",")}`)
        .then((r) => r.json())
        .then((json) => setRepairCounts(prev => ({ ...prev, ...json.counts })))
        .catch(() => {});
    }
  }, [customers]);

  const handleAdd = async () => {
    if (!form.last_name.trim()) return;
    setSaving(true);
    setAddError(null);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowAdd(false);
      setForm({ first_name: "", last_name: "", email: "", phone: "", adres: "", woonplaats: "", klantnummer: "", notities: "" });
      fetchCustomers();
    } else {
      const json = await res.json().catch(() => ({}));
      setAddError(json.error || "Er ging iets mis bij het opslaan");
    }
    setSaving(false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-100 p-2 rounded-xl">
            <Users className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">Klanten</h1>
            <p className="text-xs sm:text-sm text-gray-500">{customers.length} klant{customers.length !== 1 ? "en" : ""}</p>
          </div>
        </div>
        {!isDerived && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm"
          >
            {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAdd ? "Annuleren" : "Nieuwe klant"}
          </button>
        )}
      </div>

      {/* Add customer form */}
      {showAdd && (
        <div className="bg-white rounded-2xl border shadow-sm p-5 mb-6">
          <h3 className="font-bold text-lg mb-4">Nieuwe klant toevoegen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Voornaam"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <input
              placeholder="Achternaam *"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <input
              placeholder="E-mailadres"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <input
              placeholder="Telefoonnummer"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <input
              placeholder="Adres"
              value={form.adres}
              onChange={(e) => setForm({ ...form, adres: e.target.value })}
              className="border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <input
              placeholder="Woonplaats"
              value={form.woonplaats}
              onChange={(e) => setForm({ ...form, woonplaats: e.target.value })}
              className="border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <input
              placeholder="Klantnummer"
              value={form.klantnummer}
              onChange={(e) => setForm({ ...form, klantnummer: e.target.value })}
              className="border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <textarea
            placeholder="Notities"
            value={form.notities}
            onChange={(e) => setForm({ ...form, notities: e.target.value })}
            className="mt-3 w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            rows={2}
          />
          <div className="mt-4 flex justify-end">
            {addError && (
              <p className="text-sm text-red-600 mr-auto self-center">{addError}</p>
            )}
            <button
              onClick={handleAdd}
              disabled={saving || !form.last_name.trim()}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Opslaan
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      {isDerived && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4 text-sm text-blue-700">
          Klanten worden automatisch afgeleid uit reparaties. Maak een reparatie aan om een klant toe te voegen.
        </div>
      )}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Zoek op naam, e-mail, telefoon of klantnummer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* Customers list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {search ? "Geen klanten gevonden" : "Nog geen klanten"}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? "Probeer een andere zoekopdracht" : "Voeg je eerste klant toe"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border shadow-sm divide-y">
          {customers.map((c) => (
            <Link
              key={c.id}
              href={`/klanten/${c.id}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {(c.first_name?.[0] || "").toUpperCase()}
                {(c.last_name?.[0] || "").toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate">
                    {c.display_name || `${c.first_name} ${c.last_name}`.trim() || "Naamloos"}
                  </p>
                  {c.klantnummer && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      #{c.klantnummer}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                  {c.email && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" /> {c.email}
                    </span>
                  )}
                  {c.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Wrench className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {repairCounts[c.id] || 0}
                </span>
                <span className="hidden sm:inline">{formatDate(c.created_at)}</span>
              </div>

              <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
