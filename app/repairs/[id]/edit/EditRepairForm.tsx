"use client";

import { useState } from "react";
import WeFactDebtorSearch from "@/components/WeFactDebtorSearch";
import { getAccessoryTypes, DEVICE_TYPES, getBrandModels } from "@/lib/config";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface WeFactDebtor {
  Identifier: string;
  DebtorCode: string;
  CompanyName: string;
  CompanyNumber?: string;
  TaxNumber?: string;
  Sex?: string;
  Initials?: string;
  SurName?: string;
  Address?: string;
  ZipCode?: string;
  City?: string;
  Country?: string;
  EmailAddress: string;
  PhoneNumber?: string;
  MobileNumber?: string;
  FaxNumber?: string;
  Comment?: string;
  InvoiceMethod?: string;
  DirectDebitApplyTo?: string;
  InvoiceAuthorisation?: string;
  MandateDate?: string;
  MandateID?: string;
  AccountNumber?: string;
  AccountIban?: string;
  AccountBIC?: string;
  AccountName?: string;
  AccountBank?: string;
  AccountCity?: string;
  Mailing?: string;
  InvoiceTerm?: string;
  PeriodicInvoiceDays?: string;
  PaymentMail?: string;
  LanguageCode?: string;
  Currency?: string;
  CustomTaxCode?: string;
  ReminderEmailAddress?: string;
  Groups?: any[];
  Created?: string;
  Modified?: string;
  DefaultBillingContactId?: number;
  DefaultQuoteContactId?: number;
  ExtraClientContacts?: any[];
  InvoiceDataForPriceQuote?: string;
  InvoiceCompanyName?: string;
  InvoiceSex?: string;
  InvoiceInitials?: string;
  InvoiceSurName?: string;
  InvoiceAddress?: string;
  InvoiceZipCode?: string;
  InvoiceCity?: string;
  InvoiceCountry?: string;
  InvoiceEmailAddress?: string;
  Translations?: {
    Country?: string;
    InvoiceMethod?: string;
    InvoiceCountry?: string;
    LanguageLabel?: string;
  };
  ExternalMandateId?: string;
  ExternalCustomerId?: string;
  // Fallbacks and legacy fields
  FirstName?: string;
  Surname?: string;
  Zipcode?: string;
  Telephone?: string;
  [key: string]: any;
}

type Accessory = {
  type: string;
  label: string;
  notes: string;
  quantity: number;
};

type RepairData = {
  id: string;
  jobid: string;
  job_id: string;
  first_name: string;
  last_name: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  klantnummer: string;
  device_brand: string;
  device_model: string;
  problem_description: string;
  onderdeel_besteld: boolean;
  onderdeel_naam: string;
  onderdeel_leverancier: string;
  datum_in: string;
  datum_uit: string | null;
  status: string;
  created_at: string;
  serial_number: string;
  adres: string;
  woonplaats: string;
  agreed_price: number;
  kosten: string;
  device_password: string;
  device_type: string;
  company_id: string | null;
  accessories: Accessory[];
  send_to_wefact: boolean;
};

interface EditRepairFormProps {
  repair: RepairData;
}


// Dynamic brands/models from settings
const getBrandsAndModels = () => {
  const brandModels = getBrandModels();
  // Default to laptop if not set
  const windowDeviceType =
    typeof window !== 'undefined'
      ? (window as Window & { __EDIT_REPAIR_FORM_DEVICE_TYPE__?: string }).__EDIT_REPAIR_FORM_DEVICE_TYPE__
      : undefined;
  const deviceType =
    windowDeviceType && windowDeviceType in brandModels
      ? (windowDeviceType as keyof typeof brandModels)
      : ('laptop' as keyof typeof brandModels);
  const brands = Object.keys(brandModels[deviceType] || {});
  return { brands, brandModels: brandModels[deviceType] || {} };
};

const STATUS_OPTIONS = [
  "Nieuw",
  "Besteld",
  "In reparatie",
  "Reparatie klaar",
  "Afgehaald",
  "Geannuleerd",
];

export default function EditRepairForm({ repair }: EditRepairFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<RepairData>({
    ...repair,
    first_name: repair.first_name || "",
    last_name: repair.last_name || "",
    customer_name: repair.customer_name || "",
    accessories: repair.accessories || [],
    datum_in: repair.datum_in?.slice(0, 16) || "",
    status: repair.status || "Nieuw",
    device_brand: repair.device_brand || "",
    device_model: repair.device_model || "",
    device_type: repair.device_type || "laptop",
    send_to_wefact: repair.send_to_wefact !== false,
  });

  // For WeFact klant selector
  const [showWeFactSearch, setShowWeFactSearch] = useState(false);

  // Handler to fill in customer fields from WeFact debtor
  const handleWeFactSelect = (debtor: WeFactDebtor) => {
    let address = debtor.Address || "";

    // Add zipcode if available
    if (debtor.ZipCode)
      address += address ? `, ${debtor.ZipCode}` : debtor.ZipCode;

    let woonplaats = "";
    
    // If we have a city, make the first letter uppercase and rest lowercase
    if (debtor.City)
      woonplaats = debtor.City.charAt(0).toUpperCase() + debtor.City.slice(1).toLowerCase();
    
    // Add country if available (first translation, then fallback)
    if (debtor.Translations && debtor.Translations.Country)
      woonplaats += woonplaats ? `, ${debtor.Translations.Country}` : debtor.Translations.Country;
    else if (debtor.Country)
      woonplaats += woonplaats ? `, ${debtor.Country}` : debtor.Country;

    setForm((prev) => ({
      ...prev,
      first_name: debtor.FirstName || debtor.Initials || "",
      last_name: debtor.SurName || debtor.Surname || "",
      customer_name: debtor.CompanyName || debtor.FirstName || "",
      klantnummer: debtor.DebtorCode || "",
      customer_email: debtor.EmailAddress || "",
      adres: address,
      woonplaats: woonplaats,
      customer_phone: debtor.Telephone || "",
    }));
    setShowWeFactSearch(false);
  };

  // Accessoire types dynamisch laden
  const [accessoryTypes, setAccessoryTypes] = useState(() => getAccessoryTypes());
  // Voor selectie van te verwijderen accessoires
  const [selectedAccessories, setSelectedAccessories] = useState<number[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string>('customer');
  const [showDetails, setShowDetails] = useState<boolean>(!!repair.adres || !!repair.klantnummer);

  // Get available brands/models from settings
  const { brands, brandModels } = getBrandsAndModels();
  const getAvailableModels = () => {
    const models = brandModels[form.device_brand] || [];
    if (form.device_model && !models.includes(form.device_model)) {
      return [form.device_model, ...models];
    }
    return models;
  };

  const update = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAccessorySelect = (idx: number, checked: boolean) => {
    setSelectedAccessories((prev) =>
      checked ? [...prev, idx] : prev.filter((i) => i !== idx)
    );
  };

  const handleRemoveSelectedAccessories = () => {
    if (selectedAccessories.length === 0) return;
    setForm((prev) => ({
      ...prev,
      accessories: prev.accessories.filter((_, idx) => !selectedAccessories.includes(idx)),
    }));
    setSelectedAccessories([]);
  };

  const handleAccessoryChange = (idx: number, key: string, value: any) => {
    setForm((prev) => {
      const updated = [...(prev.accessories || [])];
      updated[idx] = { ...updated[idx], [key]: value };
      return { ...prev, accessories: updated };
    });
  };

  const handleAddAccessory = () => {
    setForm((prev) => ({
      ...prev,
      accessories: [
        ...(prev.accessories || []),
        { type: "", label: "Geen Label", quantity: 1, notes: "" },
      ],
    }));
  };

  const handleSubmit = async () => {
    // Uitgebreidere validatie
    if (!form.last_name?.trim() && !form.customer_name?.trim()) {
      toast.error("Vul achternaam in.");
      return;
    }
    if (!form.device_brand.trim()) {
      toast.error("Kies een merk.");
      return;
    }
    if (!form.device_model.trim()) {
      toast.error("Kies een model.");
      return;
    }
    if (!form.problem_description?.trim()) {
      toast.error("Vul een omschrijving in.");
      return;
    }
    if (form.customer_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.customer_email)) {
      toast.error("Vul een geldig e-mailadres in.");
      return;
    }
    if (form.customer_phone && !/^\+?[0-9\s-]{6,}$/.test(form.customer_phone)) {
      toast.error("Vul een geldig telefoonnummer in.");
      return;
    }
    console.log("[EditRepairForm] Submitting form data:", form);
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Sanitize numeric fields before sending
      // Sanitize all numeric fields (agreed_price, kosten, accessories.quantity)
      const sanitizeNumeric = (val: any) => {
        if (val === null || val === undefined) return null;
        if (typeof val === "string") {
          const trimmed = val.trim();
          if (trimmed === "") return null;
          const num = Number(trimmed);
          return isNaN(num) ? null : num;
        }
        if (typeof val === "number") {
          return isNaN(val) ? null : val;
        }
        return null;
      };
      const sanitizedForm = {
        ...form,
        agreed_price: sanitizeNumeric(form.agreed_price),
        kosten: sanitizeNumeric(form.kosten),
        accessories: Array.isArray(form.accessories)
          ? form.accessories.map((acc) => ({
              ...acc,
              quantity: sanitizeNumeric(acc.quantity),
            }))
          : [],
      };
      const res = await fetch("/api/repairs/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sanitizedForm.id, // Primary key for update
          job_id: sanitizedForm.job_id,
          first_name: sanitizedForm.first_name,
          last_name: sanitizedForm.last_name,
          customer_name: `${sanitizedForm.first_name} ${sanitizedForm.last_name}`.trim() || sanitizedForm.customer_name,
          customer_email: sanitizedForm.customer_email,
          customer_phone: sanitizedForm.customer_phone,
          customer_number: sanitizedForm.klantnummer,
          device_brand: sanitizedForm.device_brand,
          device_model: sanitizedForm.device_model,
          serial_number: sanitizedForm.serial_number,
          device_password: sanitizedForm.device_password,
          problem_description: sanitizedForm.problem_description,
          status: sanitizedForm.status,
          onderdeel_besteld: sanitizedForm.onderdeel_besteld,
          onderdeel_naam: sanitizedForm.onderdeel_naam,
          onderdeel_leverancier: sanitizedForm.onderdeel_leverancier,
          datum_in: sanitizedForm.datum_in,
          adres: sanitizedForm.adres,
          woonplaats: sanitizedForm.woonplaats,
          agreed_price: sanitizedForm.agreed_price,
          kosten: sanitizedForm.kosten,
          accessories: Array.isArray(sanitizedForm.accessories) ? sanitizedForm.accessories : [],
          device_type: sanitizedForm.device_type,
          send_to_wefact: sanitizedForm.send_to_wefact,
        }),
      });

      let json: any = {};
      try {
        json = await res.json();
      } catch (err) {
        console.error("[EditRepairForm] Server gaf geen geldige JSON terug.", err);
        toast.error("Server gaf geen geldige JSON terug.");
        setSubmitError("Server gaf geen geldige JSON terug.");
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        const msg = json.error || json.message || "Update mislukt";
        console.error("[EditRepairForm] Update error:", msg, json);
        toast.error(msg);
        setSubmitError(msg);
        setSubmitting(false);
        return;
      }

      toast.success(json.message || `Reparatie #${form.jobid} bijgewerkt!`);
      setSubmitting(false);
      // Na opslaan: redirect naar detailpagina
      router.push(`/repairs/${form.jobid}`);
    } catch (e: any) {
      console.error("[EditRepairForm] Update error:", e);
      toast.error(e?.message || "Update mislukt (serverfout).");
      setSubmitError(e?.message || "Update mislukt (serverfout).");
      setSubmitting(false);
    }
  };

  // Accordion Header Component
  const AccordionHeader = ({ 
    section, 
    number, 
    title, 
    isOpen 
  }: { 
    section: string; 
    number: string; 
    title: string; 
    isOpen: boolean; 
  }) => (
    <button
      type="button"
      onClick={() => setOpenSection(isOpen ? '' : section)}
      className="w-full flex items-center justify-between px-4 py-3 bg-blue-800 hover:bg-blue-900 text-white font-bold text-left transition-colors"
    >
      <span className="text-lg">{number}. {title}</span>
      <svg 
        className={`w-6 h-6 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 flex gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border hover:bg-gray-100"
        >
          ← Terug naar Dashboard
        </Link>
      </div>

      <Card>
        {submitError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 mb-2 rounded">
            <span className="font-bold">Fout:</span> {submitError}
          </div>
        )}
        <CardHeader>
          <h1 className="text-2xl font-bold">✏️ Bewerk Reparatie</h1>
          <p className="text-sm text-gray-600 mt-2">Job ID: {form.jobid}</p>
        </CardHeader>

        <CardContent className="space-y-2">
          {/* SECTION 1: KLANTGEGEVENS */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            {/* WeFact klant selector button */}
            <div className="p-4 bg-gray-50 flex justify-center items-center gap-2 border-b">
              <button
                type="button"
                className="px-3 py-2 rounded bg-blue-700 text-white font-semibold hover:bg-blue-800 transition"
                onClick={() => setShowWeFactSearch(true)}
              >
                🔍 Kies klant uit WeFact
              </button>
              {showWeFactSearch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                  <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full relative">
                    <button
                      className="absolute top-2 right-2 text-gray-500 hover:text-black"
                      onClick={() => setShowWeFactSearch(false)}
                      aria-label="Sluiten"
                    >
                      ✖
                    </button>
                    <WeFactDebtorSearch onSelect={handleWeFactSelect} />
                  </div>
                </div>
              )}
            </div>
            <AccordionHeader 
              section="customer" 
              number="1" 
              title="Klantgegevens" 
              isOpen={openSection === 'customer'} 
            />
            {openSection === 'customer' && (
              <div className="p-4 bg-white space-y-3">
                {/* Voornaam & Achternaam */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">👤 Voornaam</label>
                    <Input
                      placeholder="Voornaam"
                      value={form.first_name || ""}
                      onChange={(e) => update("first_name", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">👤 Achternaam *</label>
                    <Input
                      placeholder="Achternaam"
                      value={form.last_name || ""}
                      onChange={(e) => update("last_name", e.target.value)}
                    />
                  </div>
                </div>

                {/* Email & Telefoon */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">📧 E-mail</label>
                    <Input
                      placeholder="E-mail"
                      type="email"
                      value={form.customer_email || ""}
                      onChange={(e) => update("customer_email", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">☎️ Telefoon</label>
                    <Input
                      placeholder="Telefoon"
                      value={form.customer_phone || ""}
                      onChange={(e) => update("customer_phone", e.target.value)}
                    />
                  </div>
                </div>

                {/* Checkbox for Extra Details */}
                <div className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg bg-gray-50">
                  <input
                    type="checkbox"
                    id="showDetails"
                    checked={showDetails}
                    onChange={(e) => setShowDetails(e.target.checked)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <label htmlFor="showDetails" className="text-sm font-bold cursor-pointer">
                    ✅ Extra gegevens tonen
                  </label>
                </div>

                {/* Conditional Extra Fields */}
                {showDetails && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold mb-2">#️⃣ Klantnummer</label>
                      <Input
                        placeholder="Klantnummer"
                        value={form.klantnummer || ""}
                        onChange={(e) => update("klantnummer", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">🏠 Adres</label>
                        <Input
                          placeholder="Adres (optioneel)"
                          value={form.adres || ""}
                          onChange={(e) => update("adres", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">🏘️ Woonplaats</label>
                        <Input
                          placeholder="Woonplaats (optioneel)"
                          value={form.woonplaats || ""}
                          onChange={(e) => update("woonplaats", e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: APPARAAT & WACHTWOORD */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <AccordionHeader 
              section="device" 
              number="2" 
              title="Apparaat & Wachtwoord" 
              isOpen={openSection === 'device'} 
            />

            {openSection === 'device' && (
              <div className="p-4 bg-white space-y-3">
                {/* Apparaten type */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Apparaat type</label>
                  <Select
                    value={form.device_type || "laptop"}
                    onValueChange={(v) => update("device_type", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kies type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVICE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.emoji} {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Merk & Model */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Merk & Model</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={form.device_brand || ""}
                      onValueChange={(v) => update("device_brand", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kies merk" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((m) => (
                          <SelectItem key={m} value={m} className="text-black hover:text-blue-700">
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={form.device_model || ""}
                      disabled={!form.device_brand}
                      onValueChange={(v) => update("device_model", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kies model" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableModels().map((mm) => (
                          <SelectItem key={mm} value={mm} className="text-black hover:text-blue-700">
                            {mm}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Serial Number */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Serienummer</label>
                  <Input
                    placeholder="Serienummer (optioneel)"
                    value={form.serial_number || ""}
                    onChange={(e) => update("serial_number", e.target.value)}
                  />
                </div>

                {/* Device Password */}
                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                     Wachtwoord / PIN
                  </label>
                  <Input
                    placeholder="Apparaat wachtwoord (optioneel)"
                    value={form.device_password || ""}
                    onChange={(e) => update("device_password", e.target.value)}
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-semibold mb-2">📅 Datum inname</label>
                  <Input
                    type="datetime-local"
                    value={form.datum_in || ""}
                    onChange={(e) => update("datum_in", e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: STATUS & FINANCIËN */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <AccordionHeader 
              section="status" 
              number="3" 
              title="Status & Financiën" 
              isOpen={openSection === 'status'} 
            />
            {openSection === 'status' && (
              <div className="p-4 bg-white space-y-3">
                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold mb-2">💬 Omschrijving</label>
                  <Textarea
                    placeholder="Omschrijving van het probleem"
                    value={form.problem_description || ""}
                    onChange={(e) => update("problem_description", e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold mb-2">📊 Status</label>
                  <Select value={form.status || "Nieuw"} onValueChange={(v) => update("status", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Financial Info */}
                <div className="border-t pt-3">
                  <h4 className="text-sm font-bold mb-3">💰 Financieel</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Prijsafspraak (€)</label>
                      <Input
                        placeholder="Prijsafspraak (optioneel)"
                        type="number"
                        step="0.01"
                        value={form.agreed_price || ""}
                        onChange={(e) => update("agreed_price", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Kosten (€)</label>
                      <Input
                        placeholder="Kosten (optioneel)"
                        type="number"
                        step="0.01"
                        value={form.kosten || ""}
                        onChange={(e) => update("kosten", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Parts */}
                <div className="border-t pt-3">
                  <div className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg bg-gray-50">
                    <input
                      type="checkbox"
                      id="onderdeel_besteld"
                      checked={form.onderdeel_besteld || false}
                      onChange={(e) => update("onderdeel_besteld", e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="onderdeel_besteld" className="text-sm font-bold cursor-pointer">
                      ⚙️ Onderdeel besteld
                    </label>
                  </div>

                  {form.onderdeel_besteld && (
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="block text-sm font-semibold mb-2">📦 Onderdeel naam</label>
                        <Input
                          placeholder="Onderdeel naam"
                          value={form.onderdeel_naam || ""}
                          onChange={(e) => update("onderdeel_naam", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">🏢 Leverancier</label>
                        <Input
                          placeholder="Leverancier"
                          value={form.onderdeel_leverancier || ""}
                          onChange={(e) => update("onderdeel_leverancier", e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ACCESSOIRES */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <AccordionHeader
              section="accessories"
              number="4"
              title="Accessoires"
              isOpen={openSection === "accessories"}
            />
            {openSection === "accessories" && (
              <div className="p-4 bg-white space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-sm">Meegenomen accessoires</span>
                  <Button size="sm" variant="outline" onClick={handleAddAccessory} type="button">
                    ➕ Accessoire toevoegen
                  </Button>
                </div>
                {form.accessories && form.accessories.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      {form.accessories.map((acc, idx) => {
                        const accType = accessoryTypes.find((a) => a.value === acc.type);
                        return (
                          <div key={idx} className="flex items-center gap-2 border p-2 rounded-lg bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedAccessories.includes(idx)}
                              onChange={(e) => handleAccessorySelect(idx, e.target.checked)}
                              className="w-5 h-5"
                            />
                            <select
                              className="border rounded px-1 py-0.5 text-sm"
                              value={acc.type}
                              onChange={(e) => handleAccessoryChange(idx, "type", e.target.value)}
                            >
                              <option value="">Type</option>
                              {accessoryTypes.map((t) => (
                                <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                              ))}
                            </select>
                            <input
                              className="border rounded px-1 py-0.5 text-sm w-24"
                              placeholder="Label"
                              value={acc.label}
                              onChange={(e) => handleAccessoryChange(idx, "label", e.target.value)}
                            />
                            <input
                              type="number"
                              min={1}
                              className="border rounded px-1 py-0.5 text-sm w-14"
                              value={acc.quantity}
                              onChange={(e) => handleAccessoryChange(idx, "quantity", Number(e.target.value))}
                            />
                            <input
                              className="border rounded px-1 py-0.5 text-sm w-32"
                              placeholder="Notities"
                              value={acc.notes}
                              onChange={(e) => handleAccessoryChange(idx, "notes", e.target.value)}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <Button
                      size="sm"
                      className="mt-2 bg-red-600 text-white hover:bg-red-700"
                      disabled={selectedAccessories.length === 0}
                      onClick={handleRemoveSelectedAccessories}
                      type="button"
                    >
                      🗑️ Verwijder geselecteerde
                    </Button>
                  </>
                ) : (
                  <div className="text-gray-500 text-sm">Geen accessoires toegevoegd.</div>
                )}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              className="flex-1 bg-black text-white hover:bg-gray-800"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Bezig..." : "💾 Wijzigingen opslaan"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={submitting}
              onClick={() => router.back()}
            >
              ❌ Annuleren
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
