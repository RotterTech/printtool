"use client";

import { useState, useEffect } from "react";
import { Building2, Save, Loader2, CheckCircle, Globe, Mail, Phone, MapPin, FileText, CreditCard, Crown, Clock, Plus } from "lucide-react";
import { useCompany } from "@/lib/useCompany";
import { useAuth } from "@/lib/SupabaseAuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function CompanyProfileSection() {
  const { company, loading, refreshCompany, isTrialExpired, daysLeftInTrial } = useCompany();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    billing_email: "",
    vat_number: "",
    phone: "",
    address: "",
    zipcode: "",
    city: "",
    country: "NL",
    website: "",
    kvk_number: "",
  });

  // Load company data into form
  useEffect(() => {
    if (company) {
      const s = company.settings as any;
      setForm({
        name: company.name || "",
        billing_email: (company as any).billing_email || s?.billing_email || "",
        vat_number: (company as any).vat_number || s?.vat_number || "",
        phone: s?.phone || "",
        address: s?.address || "",
        zipcode: s?.zipcode || "",
        city: s?.city || "",
        country: s?.country || "NL",
        website: s?.website || "",
        kvk_number: s?.kvk_number || "",
      });
    }
  }, [company]);

  const handleSave = async () => {
    if (!company) return;
    setSaving(true);

    try {
      // Update company name + billing fields in companies table
      const { error: companyError } = await supabase
        .from("companies")
        .update({
          name: form.name,
          billing_email: form.billing_email,
          vat_number: form.vat_number,
          settings: {
            ...company.settings,
            phone: form.phone,
            address: form.address,
            zipcode: form.zipcode,
            city: form.city,
            country: form.country,
            website: form.website,
            kvk_number: form.kvk_number,
          },
        })
        .eq("id", company.id);

      if (companyError) throw companyError;

      await refreshCompany();
      toast.success("Bedrijfsprofiel opgeslagen");
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error("Opslaan mislukt: " + (err.message || "Onbekende fout"));
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!company) {
    return <CreateCompanyForm userId={user?.id} onCreated={refreshCompany} />;
  }

  // Plan display
  const planLabels: Record<string, string> = {
    trial: "Proefperiode",
    basic: "Basic",
    pro: "Pro",
    enterprise: "Enterprise",
  };
  const planColors: Record<string, string> = {
    trial: "bg-yellow-100 text-yellow-800 border-yellow-200",
    basic: "bg-blue-100 text-blue-800 border-blue-200",
    pro: "bg-purple-100 text-purple-800 border-purple-200",
    enterprise: "bg-green-100 text-green-800 border-green-200",
  };

  return (
    <div className="space-y-5">
      {/* Header + Plan Badge */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Bedrijfsprofiel
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">Beheer je bedrijfsgegevens voor facturen en het platform.</p>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${planColors[company.plan] || planColors.trial}`}>
            <Crown className="w-3 h-3" />
            {planLabels[company.plan] || company.plan}
          </span>
          {company.plan === "trial" && (
            <div className="mt-1">
              {isTrialExpired ? (
                <span className="text-xs text-red-600 font-medium">Trial verlopen</span>
              ) : (
                <span className="text-xs text-yellow-700 flex items-center justify-end gap-1">
                  <Clock className="w-3 h-3" /> {daysLeftInTrial} dag{daysLeftInTrial !== 1 ? "en" : ""} over
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Company Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bedrijfsnaam */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Bedrijfsnaam *</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={form.name}
              onChange={e => update("name", e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Jouw Bedrijf B.V."
            />
          </div>
        </div>

        {/* KVK */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">KVK-nummer</label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={form.kvk_number}
              onChange={e => update("kvk_number", e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="12345678"
            />
          </div>
        </div>

        {/* BTW */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">BTW-nummer</label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={form.vat_number}
              onChange={e => update("vat_number", e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="NL123456789B01"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Factuur e-mail</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={form.billing_email}
              onChange={e => update("billing_email", e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="factuur@bedrijf.nl"
            />
          </div>
        </div>

        {/* Telefoon */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoon</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              value={form.phone}
              onChange={e => update("phone", e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="06-12345678"
            />
          </div>
        </div>

        {/* Adres */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Adres</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={form.address}
              onChange={e => update("address", e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Straatnaam 123"
            />
          </div>
        </div>

        {/* Postcode */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Postcode</label>
          <input
            type="text"
            value={form.zipcode}
            onChange={e => update("zipcode", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="1234 AB"
          />
        </div>

        {/* Plaats */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Plaats</label>
          <input
            type="text"
            value={form.city}
            onChange={e => update("city", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Amsterdam"
          />
        </div>

        {/* Website */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Website</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="url"
              value={form.website}
              onChange={e => update("website", e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://jouwbedrijf.nl"
            />
          </div>
        </div>
      </div>

      {/* Slug / ID info */}
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 flex flex-wrap gap-x-6 gap-y-1">
        <span>Slug: <code className="font-mono text-gray-700">{company.slug}</code></span>
        <span>ID: <code className="font-mono text-gray-700">{company.id.slice(0, 8)}…</code></span>
        <span>Status: {(company as any).is_active !== false ? "✅ Actief" : "❌ Inactief"}</span>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !form.name.trim()}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Opslaan
        </button>
      </div>
    </div>
  );
}

function CreateCompanyForm({ userId, onCreated }: { userId?: string; onCreated: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!userId || !companyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/create-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, companyName: companyName.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon bedrijf niet aanmaken");
      toast.success("Bedrijf aangemaakt!");
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Fout bij aanmaken bedrijf");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center py-4">
        <Building2 className="w-10 h-10 text-blue-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900">Bedrijf aanmaken</h3>
        <p className="text-sm text-gray-500 mt-1">Stel je bedrijf in om aan de slag te gaan.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Bedrijfsnaam *</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Jouw Bedrijf B.V."
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">E-mailadres</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="info@bedrijf.nl"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleCreate}
          disabled={creating || !companyName.trim()}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Bedrijf aanmaken
        </button>
      </div>
    </div>
  );
}
