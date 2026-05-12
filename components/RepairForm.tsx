"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  DEVICE_TYPES, 
  DEVICE_PROBLEMS,
  getQuickPrices,
  getBrandModels,
  getBrandColor,
  getAccessoryTypes,
  type DeviceType 
} from "@/lib/config";
import { CheckCircle } from "lucide-react";

// Compact constants for grid layouts
const GRID_2COL = "grid grid-cols-1 md:grid-cols-2 gap-3";
const INPUT_SIZE = "h-12 text-base font-medium";
const LABEL_SIZE = "block text-sm font-bold mb-1";

type FormData = {
  // Client Details (WeFact Integration)
  bedrijf: string;
  voornaam: string;
  klant: string;
  achternaam: string;
  kvk: string;
  btw: string;
  geslacht: string;
  straat: string;
  postcode: string;
  plaats: string;
  
  // Contact
  email: string;
  telefoon: string;
  klantnummer: string;
  
  // Address (legacy)
  adres: string;
  woonplaats: string;
  
  // Device Details
  device_type: DeviceType;
  merk: string;
  model: string;
  serial_number: string;
  device_password: string;
  omschrijving: string;
  
  // Accessories
  accessories: { type: string; label: string; quantity: number; notes: string }[];
  
  // Parts
  onderdeel_besteld: boolean;
  onderdeel_naam: string;
  onderdeel_leverancier: string;
  
  // Dates & Costs
  datum_in: string;
  prijsafspraak: string;
  kosten: string;
};

type RepairFormProps = {
  id?: string;
  onCreated?: (jobId: string) => void;
  onFormChange?: (form: FormData, jobId: string, editedField?: string) => void;
  onSubmit?: () => Promise<void>;
  submitting?: boolean;
  manualMode?: boolean;
  initialData?: Partial<FormData>;
};

export type RepairFormRef = {
  submit: (overrides?: Partial<FormData>) => Promise<void>;
  getFormData: () => FormData;
};

export const RepairForm = forwardRef<RepairFormRef, RepairFormProps>(function RepairForm({ id, onCreated, onFormChange, onSubmit: onSubmitProp, submitting: submittingProp, initialData, manualMode }, ref) {
  const [formData, setFormData] = useState<FormData>({
    bedrijf: initialData?.bedrijf || "",
    voornaam: initialData?.voornaam || "",
    klant: initialData?.klant || "",
    achternaam: initialData?.achternaam || "",
    kvk: initialData?.kvk || "",
    btw: initialData?.btw || "",
    geslacht: initialData?.geslacht || "m",
    straat: initialData?.straat || "",
    postcode: initialData?.postcode || "",
    plaats: initialData?.plaats || "",
    email: initialData?.email || "",
    telefoon: initialData?.telefoon || "",
    klantnummer: initialData?.klantnummer || "",
    adres: initialData?.adres || "",
    woonplaats: initialData?.woonplaats || "",
    device_type: "laptop" as DeviceType,
    merk: "",
    model: "",
    serial_number: "",
    device_password: "",
    omschrijving: "",
    accessories: initialData?.accessories || [],
    onderdeel_besteld: false,
    onderdeel_naam: "",
    onderdeel_leverancier: "",
    datum_in: new Date().toISOString().slice(0, 16),
    prijsafspraak: "",
    kosten: "",
  });

  const [jobId, setJobId] = useState("");
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [openSection, setOpenSection] = useState<string>('customer');
  const [showOptionalClient, setShowOptionalClient] = useState(false);
  const [showExtraDetails, setShowExtraDetails] = useState(
    !!(initialData?.adres || initialData?.woonplaats || initialData?.klantnummer)
  );
  
  // Get brands and models from central config (with custom overrides)
  const [brandModels, setBrandModels] = useState(getBrandModels());
  // Get quick prices from central config (with custom overrides)
  const [quickPrices, setQuickPrices] = useState(getQuickPrices());
  // Get accessory types from central config (with custom overrides)
  const [accessoryTypes, setAccessoryTypes] = useState(getAccessoryTypes());

  useEffect(() => {
    setMounted(true);
    setJobId(Math.random().toString(16).substring(2, 8).toUpperCase());
    // Refresh brand models (to pick up changes from settings)
    setBrandModels(getBrandModels());
    // Refresh quick prices (to pick up changes from settings)
    setQuickPrices(getQuickPrices());
    // Refresh accessory types (to pick up changes from settings)
    setAccessoryTypes(getAccessoryTypes());
  }, []);

  // Expose submit and getFormData to parent via ref
  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
    getFormData: () => formData,
  }));

  const updateField = (key: keyof FormData, value: string | boolean) => {
    let newFormData = { ...formData, [key]: value };
    
    // 🔄 Auto-sync legacy velden met nieuwe velden
    if (key === 'straat') {
      newFormData.adres = value as string;
    }
    if (key === 'postcode' || key === 'plaats') {
      newFormData.woonplaats = `${newFormData.postcode} ${newFormData.plaats}`.trim();
    }
    if (key === 'klant') {
      newFormData.achternaam = value as string;
    }
    
    setFormData(newFormData);
    
    // Notify parent about which field changed (includes field name for customer field detection)
    onFormChange?.(newFormData, jobId, key as string);
  };

  const handleBrandSelect = (brand: string) => {
    const newFormData = { ...formData, merk: brand, model: "" };
    setFormData(newFormData);
    setIsCustomModel(false);
    onFormChange?.(newFormData, jobId);
  };

  const handleChangeBrand = () => {
    const newFormData = { ...formData, merk: "", model: "" };
    setFormData(newFormData);
    setIsCustomModel(false);
    onFormChange?.(newFormData, jobId);
  };

  const handleModelSelect = (value: string) => {
    if (value === "Anders...") {
      setIsCustomModel(true);
      const newFormData = { ...formData, model: "" };
      setFormData(newFormData);
      onFormChange?.(newFormData, jobId);
    } else {
      setIsCustomModel(false);
      const newFormData = { ...formData, model: value };
      setFormData(newFormData);
      onFormChange?.(newFormData, jobId);
    }
  };

  const handleSubmit = async (overrides?: Partial<FormData>) => {
    const dataToUse = overrides ? { ...formData, ...overrides } as FormData : formData;

    if (!dataToUse.klant.trim()) {
      toast.error("Naam klant is verplicht");
      return;
    }

    if (!dataToUse.merk.trim()) {
      toast.error("Merk is verplicht");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        job_id: jobId,
        first_name: dataToUse.voornaam,
        last_name: dataToUse.klant,
        customer_name: `${dataToUse.voornaam} ${dataToUse.klant}`.trim(),
        customer_email: dataToUse.email,
        customer_phone: dataToUse.telefoon,
        customer_number: dataToUse.klantnummer,
        adres: dataToUse.adres,
        woonplaats: dataToUse.woonplaats,
        device_brand: dataToUse.merk,
        device_model: dataToUse.model,
        serial_number: dataToUse.serial_number,
        device_password: dataToUse.device_password,
        problem_description: dataToUse.omschrijving,
        onderdeel_besteld: dataToUse.onderdeel_besteld,
        onderdeel_naam: dataToUse.onderdeel_naam,
        onderdeel_leverancier: dataToUse.onderdeel_leverancier,
        datum_in: dataToUse.datum_in,
        prijsafspraak: dataToUse.prijsafspraak,
        kosten: dataToUse.kosten,
        accessories: Array.isArray(dataToUse.accessories) ? dataToUse.accessories : [],
        device_type: dataToUse.device_type,
        send_to_wefact: (dataToUse as any).send_to_wefact !== undefined ? (dataToUse as any).send_to_wefact : true,
      };

      const response = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fout bij opslaan reparatie");
      }

      await response.json();

      toast.success(`✅ Reparatie #${jobId} opgeslagen!`);
      onCreated?.(jobId);

      // Reset form
      const newJobId = Math.random().toString(16).substring(2, 8).toUpperCase();
      setJobId(newJobId);
      const emptyForm: FormData = {
        bedrijf: "",
        voornaam: "",
        klant: "",
        achternaam: "",
        kvk: "",
        btw: "",
        geslacht: "m",
        straat: "",
        postcode: "",
        plaats: "",
        email: "",
        telefoon: "",
        klantnummer: "",
        adres: "",
        woonplaats: "",
        device_type: "laptop" as DeviceType,
        merk: "",
        model: "",
        serial_number: "",
        device_password: "",
        omschrijving: "",
        accessories: [],
        onderdeel_besteld: false,
        onderdeel_naam: "",
        onderdeel_leverancier: "",
        datum_in: new Date().toISOString().slice(0, 16),
        prijsafspraak: "",
        kosten: "",
      };
      setFormData(emptyForm);
      setIsCustomModel(false);
      setShowExtraDetails(false);
      setOpenSection('customer');
      onFormChange?.(emptyForm, newJobId);
    } catch (error: any) {
      toast.error(error.message || "Fout bij opslaan");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  // Get models based on device type AND brand (from custom config or defaults)
  const deviceBrands = brandModels[formData.device_type] || {};
  const availableModels = formData.merk
    ? deviceBrands[formData.merk] || []
    : [];
  const selectModelValue = isCustomModel ? "Anders..." : formData.model;

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
      className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-800 hover:bg-blue-900 text-white font-bold text-left transition-colors"
    >
      <span className="text-base sm:text-lg">{number}. {title}</span>
      <svg 
        className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  return (
    <div className="space-y-2">
      {/* SECTION 1: KLANTGEGEVENS */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <AccordionHeader 
          section="customer" 
          number="1" 
          title="Klantgegevens" 
          isOpen={openSection === 'customer'} 
        />
        {openSection === 'customer' && (
          <div className="p-3 sm:p-4 bg-white space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-between mx-0 sm:mx-10 items-start sm:items-center">
              <div className="flex gap-2 sm:gap-3 items-center">
                <label className={LABEL_SIZE}>🏢 Klantnummer</label>
                <p className="text-sm text-gray-500">
                  {formData.klantnummer || "—"}
                </p>
              </div>
              <div className="flex gap-2 sm:gap-3 items-center">
                <label className={LABEL_SIZE}>💾 WeFact</label>
                <CheckCircle className={`${formData.klantnummer ? 'text-green-500' : 'text-gray-300'}`} />
              </div>
            </div>

            {/* VERPLICHTE VELDEN - Altijd zichtbaar */}
            
            {/* Geslacht als KNOPPEN */}
            <div className="text-center">
              <label className={LABEL_SIZE}>👤 Aanhef *</label>
              <div className="flex gap-2 items-center justify-center">
                <button
                  type="button"
                  onClick={() => updateField("geslacht", "m")}
                  className={`px-3 sm:px-5 h-10 sm:h-12 rounded-lg font-bold text-sm sm:text-base transition-all active:scale-95 ${
                    formData.geslacht === "m"
                      ? "bg-blue-500 text-white border-2 border-blue-700 shadow-lg"
                      : "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  👔 Man
                </button>
                <button
                  type="button"
                  onClick={() => updateField("geslacht", "f")}
                  className={`px-3 sm:px-5 h-10 sm:h-12 rounded-lg font-bold text-sm sm:text-base transition-all active:scale-95 ${
                    formData.geslacht === "f"
                      ? "bg-pink-500 text-white border-2 border-pink-700 shadow-lg"
                      : "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  👗 Mevrouw
                </button>
              </div>
            </div>

            {/* Achternaam & Email - verplicht */}
            <div className={GRID_2COL}>
              <div>
                <label className={LABEL_SIZE}>👤 Voornaam*</label>
                <Input
                  placeholder="bijv. Jan"
                  value={formData.voornaam}
                  onChange={(e) => updateField("voornaam", e.target.value)}
                  className={`${INPUT_SIZE} text-lg`}
                />
              </div>
              <div>
                <label className={LABEL_SIZE}>👤 Achternaam *</label>
                <Input
                  placeholder="bijv. de Vries"
                  value={formData.klant}
                  onChange={(e) => updateField("klant", e.target.value)}
                  className={`${INPUT_SIZE} text-lg`}
                />
              </div>
            </div>

            {/* Email & Telefoon */}
            <div className={GRID_2COL}>
              <div>
                <label className={LABEL_SIZE}>📧 Email *</label>
                  <Input
                    placeholder="klant@voorbeeld.nl"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className={`${INPUT_SIZE} text-lg`}
                  />
                </div>
              <div>
              <label className={LABEL_SIZE}>📞 Telefoon *</label>
              <Input
                placeholder="06-12345678"
                value={formData.telefoon}
                onChange={(e) => updateField("telefoon", e.target.value)}
                className={INPUT_SIZE}
              />
              </div>
            </div>

            {/* OPTIONEEL TOGGLE KNOP */}
            <button
              type="button"
              onClick={() => setShowOptionalClient(!showOptionalClient)}
              className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <span>📋</span>
                <span>Meer klantgegevens (optioneel)</span>
              </span>
              <svg
                className={`w-5 h-5 transition-transform ${showOptionalClient ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* OPTIONELE VELDEN - Uitklapbaar */}
            {showOptionalClient && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {/* Bedrijfsgegevens */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={LABEL_SIZE}>🏢 Bedrijfsnaam</label>
                    <Input
                      placeholder="bijv. Tech Solutions BV"
                      value={formData.bedrijf}
                      onChange={(e) => updateField("bedrijf", e.target.value)}
                      className={INPUT_SIZE}
                    />
                  </div>
                  <div>
                    <label className={LABEL_SIZE}>📋 KvK</label>
                    <Input
                      placeholder="12345678"
                      value={formData.kvk}
                      onChange={(e) => updateField("kvk", e.target.value)}
                      className={INPUT_SIZE}
                    />
                  </div>
                  <div>
                    <label className={LABEL_SIZE}>🆔 BTW</label>
                    <Input
                      placeholder="NL123456789B01"
                      value={formData.btw}
                      onChange={(e) => updateField("btw", e.target.value)}
                      className={INPUT_SIZE}
                    />
                  </div>
                </div>

                {/* Adresgegevens */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={LABEL_SIZE}>🏠 Straat</label>
                    <Input
                      placeholder="Straatnaam 123"
                      value={formData.straat}
                      onChange={(e) => updateField("straat", e.target.value)}
                      className={INPUT_SIZE}
                    />
                  </div>
                  <div>
                    <label className={LABEL_SIZE}>📮 Postcode</label>
                    <Input
                      placeholder="1234 AB"
                      value={formData.postcode}
                      onChange={(e) => updateField("postcode", e.target.value)}
                      className={INPUT_SIZE}
                    />
                  </div>
                  <div>
                    <label className={LABEL_SIZE}>🏘️ Plaats</label>
                    <Input
                      placeholder="Amsterdam"
                      value={formData.plaats}
                      onChange={(e) => updateField("plaats", e.target.value)}
                      className={INPUT_SIZE}
                    />
                  </div>
                </div>
              </div>
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
          <div className="p-4 bg-white space-y-4">
            
            {/* Step 1: Device Type Selection */}
            <div>
              <label className="block text-sm font-bold mb-2">📱 Apparaat Type *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {DEVICE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      const newFormData = { ...formData, device_type: type.value, merk: "", model: "" };
                      setFormData(newFormData);
                      setIsCustomModel(false);
                      onFormChange?.(newFormData, jobId);
                    }}
                    className={`h-14 rounded-lg font-bold text-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${
                      formData.device_type === type.value 
                        ? "bg-blue-500 text-white border-2 border-blue-700 shadow-lg" 
                        : "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-xl">{type.emoji}</span>
                    <span className="text-xs">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Brand Selection */}
            {!formData.merk ? (
              <div>
                <label className="block text-sm font-bold mb-2">🏭 Selecteer Merk *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Object.keys(brandModels[formData.device_type] || {}).map((brand) => {
                    const brandColor = getBrandColor(brand);
                    return (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => handleBrandSelect(brand)}
                        className="h-12 rounded-lg font-bold text-sm transition-all active:scale-95 border hover:opacity-80"
                        style={{
                          backgroundColor: `${brandColor.hex}20`,
                          borderColor: brandColor.hex,
                        }}
                      >
                        {brand}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div 
                className="p-3 rounded-lg flex justify-between items-center border"
                style={{ 
                  backgroundColor: `${getBrandColor(formData.merk).hex}15`, 
                  borderColor: getBrandColor(formData.merk).hex 
                }}
              >
                <div>
                  <p className="text-sm text-gray-600">Geselecteerd merk:</p>
                  <p className="text-lg font-bold" style={{ color: getBrandColor(formData.merk).hex }}>
                    {formData.merk}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleChangeBrand}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-bold hover:bg-blue-600"
                >
                  Wijzig
                </button>
              </div>
            )}

            {/* Model Selection - Show only after brand selected */}
            {formData.merk && (
              <div className="space-y-2">
                <label className={LABEL_SIZE}>Model *</label>
                
                {/* Quick Select Buttons for common models */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                  {availableModels.filter(m => m !== "Anders...").slice(0, 6).map((model) => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => {
                        const newFormData = { ...formData, model: model };
                        setFormData(newFormData);
                        setIsCustomModel(false);
                        onFormChange?.(newFormData, jobId);
                      }}
                      className={`px-3 py-2 text-sm rounded-lg font-medium transition-all border ${
                        formData.model === model 
                          ? "bg-blue-500 text-white border-blue-700" 
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>

                {/* Always show input field for typing/editing model */}
                <Input
                  placeholder="Of typ model hier..."
                  value={formData.model}
                  onChange={(e) => {
                    updateField("model", e.target.value);
                    setIsCustomModel(true);
                  }}
                  className={INPUT_SIZE}
                />
              </div>
            )}

            {/* Serial Number */}
            {formData.merk && (
              <div>
                <label className={LABEL_SIZE}>Serienummer (optioneel)</label>
                <Input
                  placeholder="SN / Service Tag"
                  value={formData.serial_number}
                  onChange={(e) => updateField("serial_number", e.target.value)}
                  className={INPUT_SIZE}
                />
              </div>
            )}

            {/* Device Password Field */}
            {formData.merk && (
              <div>
                <label className={LABEL_SIZE}>🔒 Wachtwoord / PIN Apparaat</label>
                <Input
                  type="text"
                  placeholder="1234 / wachtwoord"
                  value={formData.device_password}
                  onChange={(e) => updateField("device_password", e.target.value)}
                  className={INPUT_SIZE}
                />
              </div>
            )}

            {/* 🎒 Accessories Section */}
            {formData.merk && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg space-y-3">
                <label className="block text-sm font-bold">🎒 Meegenomen Accessoires</label>
                <p className="text-xs text-gray-600 -mt-1">Selecteer welke accessoires de klant heeft ingeleverd</p>
                
                {/* Quick Select Accessory Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {accessoryTypes.map((acc) => {
                    const isSelected = formData.accessories.some(a => a.type === acc.value);
                    return (
                      <button
                        key={acc.value}
                        type="button"
                        onClick={() => {
                          let newAccessories = [...formData.accessories];
                          if (isSelected) {
                            newAccessories = newAccessories.filter(a => a.type !== acc.value);
                          } else {
                            newAccessories.push({ 
                              type: acc.value, 
                              label: acc.label, 
                              quantity: 1, 
                              notes: "" 
                            });
                          }
                          const newFormData = { ...formData, accessories: newAccessories };
                          setFormData(newFormData);
                          onFormChange?.(newFormData, jobId);
                        }}
                        className={`px-3 py-2 text-sm rounded-lg font-medium transition-all border flex items-center gap-1.5 ${
                          isSelected 
                            ? "bg-amber-500 text-white border-amber-700" 
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <span>{acc.emoji}</span>
                        <span className="truncate">{acc.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Accessories Details */}
                {formData.accessories.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-bold text-amber-800">Geselecteerde accessoires:</p>
                    {formData.accessories.map((acc, idx) => {
                      const accType = accessoryTypes.find(a => a.value === acc.type);
                      return (
                        <div key={acc.type} className="bg-white p-2 rounded border border-amber-300 flex items-center gap-2">
                          <span className="text-lg">{accType?.emoji || "📎"}</span>
                          <span className="font-medium text-sm flex-1">{acc.label}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const newAccessories = [...formData.accessories];
                                if (newAccessories[idx].quantity > 1) {
                                  newAccessories[idx].quantity--;
                                  const newFormData = { ...formData, accessories: newAccessories };
                                  setFormData(newFormData);
                                  onFormChange?.(newFormData, jobId);
                                }
                              }}
                              className="w-6 h-6 bg-gray-200 rounded text-sm font-bold hover:bg-gray-300"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-bold text-sm">{acc.quantity}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newAccessories = [...formData.accessories];
                                newAccessories[idx].quantity++;
                                const newFormData = { ...formData, accessories: newAccessories };
                                setFormData(newFormData);
                                onFormChange?.(newFormData, jobId);
                              }}
                              className="w-6 h-6 bg-gray-200 rounded text-sm font-bold hover:bg-gray-300"
                            >
                              +
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Notitie..."
                            value={acc.notes}
                            onChange={(e) => {
                              const newAccessories = [...formData.accessories];
                              newAccessories[idx].notes = e.target.value;
                              const newFormData = { ...formData, accessories: newAccessories };
                              setFormData(newFormData);
                              onFormChange?.(newFormData, jobId);
                            }}
                            className="w-24 px-2 py-1 text-xs border rounded"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newAccessories = formData.accessories.filter((_, i) => i !== idx);
                              const newFormData = { ...formData, accessories: newAccessories };
                              setFormData(newFormData);
                              onFormChange?.(newFormData, jobId);
                            }}
                            className="text-red-500 hover:text-red-700 text-lg font-bold"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Date/Time */}
            {formData.merk && (
              <div>
                <label className={LABEL_SIZE}>📅 Datum & Tijd</label>
                <Input
                  type="datetime-local"
                  value={formData.datum_in}
                  onChange={(e) => updateField("datum_in", e.target.value)}
                  className={INPUT_SIZE}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 3: KLACHT & STATUS */}
      {formData.merk && (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <AccordionHeader 
            section="problem" 
            number="3" 
            title="Klacht & Status" 
            isOpen={openSection === 'problem'} 
          />
          {openSection === 'problem' && (
            <div className="p-4 bg-white space-y-4">
              {/* Problem Description */}
              <div>
                <label className="block text-sm font-bold mb-3">💬 Omschrijving</label>
                
                {/* Dynamic Problems Grid - Based on Device Type */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase flex items-center gap-2">
                    🔧 Problemen voor {DEVICE_TYPES.find(d => d.value === formData.device_type)?.emoji} {DEVICE_TYPES.find(d => d.value === formData.device_type)?.label || "Apparaat"}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {(DEVICE_PROBLEMS[formData.device_type] || DEVICE_PROBLEMS.laptop).map((btn) => (
                      <button
                        key={btn.value}
                        type="button"
                        onClick={() => {
                          const currentText = formData.omschrijving.trim();
                          const separator = currentText ? "\n" : "";
                          updateField("omschrijving", currentText + separator + btn.value);
                        }}
                        className="px-2 py-2 text-xs bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg font-medium transition-all border border-blue-200 hover:border-blue-400 text-blue-900 shadow-sm hover:shadow truncate"
                        title={btn.value}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  placeholder="Beschrijf het probleem (bv: Laptop start niet op, Scherm zwart, etc.)"
                  value={formData.omschrijving}
                  onChange={(e) => updateField("omschrijving", e.target.value)}
                  className="min-h-[100px] text-base font-medium resize-none"
                  rows={4}
                />
              </div>

              {/* Parts Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg bg-gray-50">
                  <input
                    type="checkbox"
                    id="onderdeel_besteld"
                    checked={formData.onderdeel_besteld}
                    onChange={(e) => {
                      const newFormData = { ...formData, onderdeel_besteld: e.target.checked };
                      setFormData(newFormData);
                      onFormChange?.(newFormData, jobId);
                    }}
                    className="w-6 h-6 cursor-pointer"
                  />
                  <label htmlFor="onderdeel_besteld" className="text-base font-bold cursor-pointer">
                    ⚙️ Onderdeel besteld
                  </label>
                </div>

                {formData.onderdeel_besteld && (
                  <>
                    <div>
                      <label className="block text-sm font-bold mb-2">📦 Onderdelen</label>
                      <Textarea
                        placeholder="Lijst onderdelen (elke regel een onderdeel)"
                        value={formData.onderdeel_naam || ''}
                        onChange={(e) => {
                          const newFormData = { ...formData, onderdeel_naam: e.target.value };
                          setFormData(newFormData);
                          onFormChange?.(newFormData, jobId);
                        }}
                        className="min-h-[80px] text-base font-medium resize-none"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className={LABEL_SIZE}>🏢 Leverancier</label>
                      <Input
                        placeholder="Vul leverancier in"
                        value={formData.onderdeel_leverancier || ''}
                        onChange={(e) => {
                          const newFormData = { ...formData, onderdeel_leverancier: e.target.value };
                          setFormData(newFormData);
                          onFormChange?.(newFormData, jobId);
                        }}
                        className={INPUT_SIZE}
                      />
                    </div>
                  </>
                )}
              </div>

{/* Financial Section with Quick Price Buttons */}
              <div className="border-t-2 border-orange-300 pt-3">
                <h4 className="text-base font-bold mb-3">💰 Financieel / Afspraken</h4>
                
                {/* Quick Price Buttons - Dynamic per device type */}
                <div className="mb-4">
                  <h5 className="text-xs font-semibold text-gray-600 mb-2 uppercase">⚡ Snelkeuze prijs</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
                    {(quickPrices[formData.device_type] || quickPrices.laptop).map((price) => (
                      <button
                        key={price.label}
                        type="button"
                        onClick={() => updateField("prijsafspraak", `€ ${price.price},-`)}
                        className="px-2 py-2 text-xs bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg font-medium transition-all border border-green-200 hover:border-green-400 text-green-900 truncate"
                        title={`${price.label}: € ${price.price},-`}
                      >
                        <span className="block truncate">{price.label}</span>
                        <span className="block font-bold">€{price.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className={GRID_2COL}>
                  <div>
                    <label className={LABEL_SIZE}>Prijsafspraak</label>
                    <Input
                      placeholder="€ 50,00"
                      value={formData.prijsafspraak}
                      onChange={(e) => updateField("prijsafspraak", e.target.value)}
                      className={INPUT_SIZE}
                    />
                  </div>
                  <div>
                    <label className={LABEL_SIZE}>Kosten</label>
                    <Input
                      placeholder="€ 0,00"
                      value={formData.kosten}
                      onChange={(e) => updateField("kosten", e.target.value)}
                      className={INPUT_SIZE}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

