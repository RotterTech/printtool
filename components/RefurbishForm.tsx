"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEVICE_TYPES, getBrandModels, getAccessoryTypes, type DeviceType } from "@/lib/config";
import CustomerSearch, { type UnifiedCustomer } from "./CustomerSearch";
import { User, Mail, Phone, Hash, SkipForward } from "lucide-react";

type Step = "source" | "donor" | "device" | "brand" | "model" | "status";

// Donor info for donatie/inkoop
interface DonorInfo {
  name: string;
  email: string;
  phone: string;
  klantnummer: string;
}

// Source types with styling
const SOURCE_TYPES = [
  { key: "donatie", label: "💚 Donatie (Gratis)", color: "bg-green-600 hover:bg-green-700" },
  { key: "inkoop", label: "💙 Inkoop", color: "bg-blue-600 hover:bg-blue-700" },
  { key: "interne_refurb", label: "⚪ Interne Refurb", color: "bg-gray-600 hover:bg-gray-700" },
];

// Status options
const STATUS_OPTIONS = [
  { key: "te_koop", label: "🏷️ Te Koop" },
  { key: "nog_testen", label: "🧪 Nog Testen" },
  { key: "in_behandeling", label: "⚙️ In Behandeling" },
  { key: "wacht_onderdelen", label: "📦 Wacht op Onderdelen" },
];

export default function RefurbishForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("source");
  const [selectedSource, setSelectedSource] = useState("");
  const [donorInfo, setDonorInfo] = useState<DonorInfo>({ name: "", email: "", phone: "", klantnummer: "" });
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>("laptop");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [accessories, setAccessories] = useState<{ type: string; label: string; quantity: number; notes: string }[]>([]);
  
  // Get brands and models from central config (with custom overrides)
  const [brandModels, setBrandModels] = useState(getBrandModels());
  const [accessoryTypes, setAccessoryTypes] = useState(getAccessoryTypes());
  
  // Refresh brand models and accessory types on mount
  useEffect(() => {
    setBrandModels(getBrandModels());
    setAccessoryTypes(getAccessoryTypes());
  }, []);

  const handleSourceSelect = (source: string) => {
    setSelectedSource(source);
    // For donatie/inkoop, ask for donor info; for interne_refurb skip
    if (source === "donatie" || source === "inkoop") {
      setStep("donor");
    } else {
      setStep("device");
    }
  };

  const handleDonorSelect = (customer: UnifiedCustomer) => {
    setDonorInfo({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      klantnummer: customer.klantnummer || "",
    });
  };

  const handleDonorContinue = () => {
    setStep("device");
  };

  const handleSkipDonor = () => {
    setDonorInfo({ name: "", email: "", phone: "", klantnummer: "" });
    setStep("device");
  };

  const handleDeviceSelect = (device: DeviceType) => {
    setSelectedDevice(device);
    setSelectedBrand("");
    setSelectedModel("");
    setCustomModel("");
    setStep("brand");
  };

  const handleBrandSelect = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel("");
    setCustomModel("");
    setStep("model");
  };

  const handleModelSelect = (model: string) => {
    if (model === "Anders...") {
      setSelectedModel("Anders...");
      setCustomModel("");
    } else {
      setSelectedModel(model);
      setCustomModel("");
    }
  };

  const handleStatusSelect = (status: string) => {
    setSelectedStatus(status);
    handleSubmit(status);
  };

  const getFullModel = () => {
    return selectedModel === "Anders..." ? customModel : selectedModel;
  };

  const handleSubmit = (status: string) => {
    const fullModel = getFullModel();
    if (!selectedSource || !selectedBrand || !fullModel || !status) {
      alert("Selecteer bron, merk, model en status.");
      return;
    }

    const params = new URLSearchParams();
    params.set("brand", selectedBrand);
    params.set("model", fullModel);
    params.set("origin", selectedSource);
    params.set("status", status);
    params.set("device_type", selectedDevice);
    if (accessories.length > 0) {
      params.set("accessories", JSON.stringify(accessories));
    }
    // Pass donor info for donatie/inkoop
    if ((selectedSource === "donatie" || selectedSource === "inkoop") && donorInfo.name) {
      params.set("donor_name", donorInfo.name);
      if (donorInfo.email) params.set("donor_email", donorInfo.email);
      if (donorInfo.phone) params.set("donor_phone", donorInfo.phone);
      if (donorInfo.klantnummer) params.set("donor_klantnummer", donorInfo.klantnummer);
    }
    router.push(`/refurbished?${params.toString()}`)
  };

  // Get brands and models from config
  const deviceBrands = brandModels[selectedDevice] || {};
  const brandList = Object.keys(deviceBrands);
  const modelOptions = selectedBrand ? (deviceBrands[selectedBrand] || []) : [];
  const deviceInfo = DEVICE_TYPES.find(d => d.value === selectedDevice);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">🎁 Donatie / Inkoop Refurbished</h2>
        <p className="text-sm text-gray-600 mt-1">
          Selecteer bron, apparaat, merk, model en status.
        </p>
      </div>

      {/* STEP 1: Source Selection */}
      {step === "source" && (
        <div className="space-y-4">
          <label className="block text-lg font-bold text-gray-800">
            📥 Stap 1: Type Inname
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SOURCE_TYPES.map((source) => (
              <button
                key={source.key}
                type="button"
                onClick={() => handleSourceSelect(source.key)}
                className={`h-24 rounded-lg font-bold text-base text-white transition-all active:scale-95 ${source.color}`}
              >
                {source.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1.5: Donor Info (only for donatie/inkoop) */}
      {step === "donor" && selectedSource && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-lg font-semibold text-green-900">
              📥 {SOURCE_TYPES.find(s => s.key === selectedSource)?.label}
            </span>
            <button
              type="button"
              onClick={() => {
                setStep("source");
                setSelectedSource("");
              }}
              className="px-3 py-1 text-sm font-semibold text-green-600 hover:bg-green-100 rounded transition"
            >
              Wijzig
            </button>
          </div>

          {/* Donor/Supplier Selection */}
          <div className="space-y-4">
            <label className="block text-lg font-bold text-gray-800">
              👤 {selectedSource === "donatie" ? "Van wie is deze donatie?" : "Van wie kopen we dit apparaat?"}
            </label>
            <p className="text-sm text-gray-600">
              Zoek of vul de klantgegevens in om de {selectedSource === "donatie" ? "donatie" : "inkoop"} te koppelen.
            </p>

            {/* Customer Search */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-4">
              <CustomerSearch
                onSelect={handleDonorSelect}
                placeholder="🔍 Zoek klant (naam, e-mail, telefoon)..."
                initialValue={donorInfo.name}
              />

              {/* Manual Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Naam
                  </label>
                  <Input
                    value={donorInfo.name}
                    onChange={(e) => setDonorInfo({ ...donorInfo, name: e.target.value })}
                    placeholder="Naam van persoon/bedrijf"
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> E-mail
                  </label>
                  <Input
                    type="email"
                    value={donorInfo.email}
                    onChange={(e) => setDonorInfo({ ...donorInfo, email: e.target.value })}
                    placeholder="email@voorbeeld.nl"
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Telefoon
                  </label>
                  <Input
                    type="tel"
                    value={donorInfo.phone}
                    onChange={(e) => setDonorInfo({ ...donorInfo, phone: e.target.value })}
                    placeholder="06-12345678"
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" /> Klantnummer
                  </label>
                  <Input
                    value={donorInfo.klantnummer}
                    onChange={(e) => setDonorInfo({ ...donorInfo, klantnummer: e.target.value })}
                    placeholder="Optioneel"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleDonorContinue}
                disabled={!donorInfo.name.trim()}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold"
              >
                ➜ Verder met klant
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSkipDonor}
                className="h-12 px-6 font-medium flex items-center gap-2"
              >
                <SkipForward className="w-4 h-4" />
                Overslaan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Device Type Selection */}
      {step === "device" && selectedSource && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-lg font-semibold text-green-900">
              📥 {SOURCE_TYPES.find(s => s.key === selectedSource)?.label}
              {donorInfo.name && <span className="ml-2 text-green-700">• {donorInfo.name}</span>}
            </span>
            <button
              type="button"
              onClick={() => {
                if (selectedSource === "donatie" || selectedSource === "inkoop") {
                  setStep("donor");
                } else {
                  setStep("source");
                  setSelectedSource("");
                }
              }}
              className="px-3 py-1 text-sm font-semibold text-green-600 hover:bg-green-100 rounded transition"
            >
              Wijzig
            </button>
          </div>

          {/* Device Type Selection Grid */}
          <div className="space-y-3">
            <label className="block text-lg font-bold text-gray-800">
              📱 Stap 2: Selecteer Apparaat Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {DEVICE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleDeviceSelect(type.value)}
                  className="h-20 rounded-lg font-bold text-base transition-all active:scale-95 flex flex-col items-center justify-center gap-1 bg-white text-gray-900 border border-gray-200 hover:bg-blue-50 hover:border-blue-300"
                >
                  <span className="text-2xl">{type.emoji}</span>
                  <span className="text-sm">{type.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Brand Selection */}
      {step === "brand" && selectedSource && selectedDevice && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-lg font-semibold text-blue-900">
              {SOURCE_TYPES.find(s => s.key === selectedSource)?.label} → {deviceInfo?.emoji} {deviceInfo?.label}
            </span>
            <button
              type="button"
              onClick={() => setStep("device")}
              className="px-3 py-1 text-sm font-semibold text-blue-600 hover:bg-blue-100 rounded transition"
            >
              Wijzig
            </button>
          </div>

          {/* Brand Selection Grid */}
          <div className="space-y-3">
            <label className="block text-lg font-bold text-gray-800">
              🏭 Stap 3: Selecteer Merk
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {brandList.map((brand) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => handleBrandSelect(brand)}
                  className="h-16 rounded-lg font-bold text-base transition-all active:scale-95 bg-white text-gray-900 border border-gray-200 hover:bg-blue-50 hover:border-blue-300"
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Model Selection */}
      {step === "model" && selectedSource && selectedDevice && selectedBrand && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-lg font-semibold text-blue-900">
              {deviceInfo?.emoji} {selectedBrand}
            </span>
            <button
              type="button"
              onClick={() => {
                setStep("brand");
                setSelectedBrand("");
              }}
              className="px-3 py-1 text-sm font-semibold text-blue-600 hover:bg-blue-100 rounded transition"
            >
              Wijzig
            </button>
          </div>

          {/* Model Selection as Buttons */}
          <div className="space-y-3">
            <label className="block text-lg font-bold text-gray-800">
              💻 Stap 4: Selecteer Model
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {modelOptions.map((model) => (
                <button
                  key={model}
                  type="button"
                  onClick={() => handleModelSelect(model)}
                  className={`h-14 px-3 rounded-lg font-medium text-sm transition-all active:scale-95 ${
                    selectedModel === model
                      ? "bg-blue-500 text-white border-2 border-blue-700 shadow-lg"
                      : "bg-white text-gray-900 border border-gray-200 hover:bg-blue-50 hover:border-blue-300"
                  }`}
                >
                  {model}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Model Input (if "Anders..." is selected) */}
          {selectedModel === "Anders..." && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
              <label className="block text-base font-semibold text-gray-800">
                📝 Voer model handmatig in
              </label>
              <Input
                placeholder="e.g., T480, 840 G5, XPS 13"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                className="h-12 text-base"
                autoFocus
              />
            </div>
          )}

          {/* 🎒 Accessories Section */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎒</span>
              <div>
                <h4 className="font-semibold text-gray-900">Meegenomen Accessoires</h4>
                <p className="text-xs text-gray-600">Optioneel: selecteer meegeleverde accessoires</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {accessoryTypes.map((acc) => {
                const isSelected = accessories.some(a => a.type === acc.value);
                return (
                  <button
                    key={acc.value}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setAccessories(accessories.filter(a => a.type !== acc.value));
                      } else {
                        setAccessories([...accessories, { type: acc.value, label: acc.label, quantity: 1, notes: "" }]);
                      }
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

            {accessories.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {accessories.map((acc, idx) => {
                  const accType = accessoryTypes.find(a => a.value === acc.type);
                  return (
                    <div key={acc.type} className="bg-white p-2 rounded border border-amber-300 flex items-center gap-2">
                      <span>{accType?.emoji || "📎"}</span>
                      <span className="font-medium text-sm flex-1">{acc.label}</span>
                      <button type="button" onClick={() => { const n = [...accessories]; if (n[idx].quantity > 1) { n[idx].quantity--; setAccessories(n); } }} className="w-6 h-6 bg-gray-200 rounded text-sm font-bold hover:bg-gray-300">-</button>
                      <span className="w-6 text-center font-bold text-sm">{acc.quantity}</span>
                      <button type="button" onClick={() => { const n = [...accessories]; n[idx].quantity++; setAccessories(n); }} className="w-6 h-6 bg-gray-200 rounded text-sm font-bold hover:bg-gray-300">+</button>
                      <input type="text" placeholder="Notitie..." value={acc.notes} onChange={(e) => { const n = [...accessories]; n[idx].notes = e.target.value; setAccessories(n); }} className="w-20 px-2 py-1 text-xs border rounded" />
                      <button type="button" onClick={() => setAccessories(accessories.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 font-bold">×</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Next Button */}
          <Button
            type="button"
            onClick={() => setStep("status")}
            disabled={!getFullModel()}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-lg font-bold rounded-lg"
          >
            ➜ Volgende: Status
          </Button>
        </div>
      )}

      {/* STEP 5: Status Selection */}
      {step === "status" && selectedSource && selectedDevice && selectedBrand && getFullModel() && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-indigo-900">
                {deviceInfo?.emoji} {selectedBrand} {getFullModel()}
                {accessories.length > 0 && <span className="ml-2 text-amber-600">+ {accessories.length} accessoire(s)</span>}
              </span>
              <button
                type="button"
                onClick={() => {
                  setStep("model");
                  setSelectedModel("");
                  setCustomModel("");
                }}
                className="px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 rounded transition"
              >
                Wijzig
              </button>
            </div>
          </div>

          {/* Status Selection Grid */}
          <div className="space-y-3">
            <label className="block text-lg font-bold text-gray-800">
              📊 Stap 5: Selecteer Status
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.key}
                  type="button"
                  onClick={() => handleStatusSelect(status.key)}
                  className="h-20 rounded-lg font-bold text-base transition-all active:scale-95 bg-white text-gray-900 border-2 border-gray-200 hover:bg-orange-50 hover:border-orange-300"
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
