"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEVICE_TYPES, getBrandModels, getAccessoryTypes, type DeviceType } from "@/lib/config";

type Step = "device" | "brand" | "model";

export default function DismantleForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("device");
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>("laptop");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [accessories, setAccessories] = useState<{ type: string; label: string; quantity: number; notes: string }[]>([]);
  
  // Get brands and models from central config (with custom overrides)
  const [brandModels, setBrandModels] = useState(getBrandModels());
  const [accessoryTypes, setAccessoryTypes] = useState(getAccessoryTypes());
  
  // Refresh brand models and accessory types when component mounts
  useEffect(() => {
    setBrandModels(getBrandModels());
    setAccessoryTypes(getAccessoryTypes());
  }, []);

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

  const handleSubmit = () => {
    const finalModel = selectedModel === "Anders..." ? customModel : selectedModel;

    if (!selectedBrand.trim() || !finalModel.trim()) {
      alert("Selecteer merk en model.");
      return;
    }

    const params = new URLSearchParams();
    params.set("brand", selectedBrand.trim());
    params.set("model", finalModel.trim());
    params.set("device_type", selectedDevice);
    params.set("mode", "harvest");
    if (accessories.length > 0) {
      params.set("accessories", JSON.stringify(accessories));
    }
    router.push(`/parts?${params.toString()}`);
  };

  // Get brands and models from central config
  const deviceBrands = brandModels[selectedDevice] || {};
  const brandList = Object.keys(deviceBrands);
  const modelOptions = selectedBrand ? deviceBrands[selectedBrand] || [] : [];

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">🔧 Demonteren (Harvesting)</h2>
        <p className="text-sm text-gray-600 mt-1">
          Selecteer apparaat, merk en model om de onderdelen te harvesten.
        </p>
      </div>

      {/* STEP 1: Device Type Selection */}
      {step === "device" && (
        <div className="space-y-4">
          <label className="block text-lg font-bold text-gray-800">
            📱 Selecteer Apparaat Type
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
      )}

      {/* STEP 2: Brand Selection */}
      {step === "brand" && (
        <div className="space-y-4">
          {/* Summary Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-lg font-semibold text-blue-900">
              {DEVICE_TYPES.find(d => d.value === selectedDevice)?.emoji} {DEVICE_TYPES.find(d => d.value === selectedDevice)?.label}
            </span>
            <button
              type="button"
              onClick={() => setStep("device")}
              className="px-3 py-1 text-sm font-semibold text-blue-600 hover:bg-blue-100 rounded transition"
            >
              Wijzig
            </button>
          </div>

          <label className="block text-lg font-bold text-gray-800">
            🏭 Selecteer Merk
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
      )}

      {/* STEP 3: Model Selection */}
      {step === "model" && selectedBrand && (
        <div className="space-y-6">
          {/* Summary Banner with Change Option */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-lg font-semibold text-blue-900">
              {DEVICE_TYPES.find(d => d.value === selectedDevice)?.emoji} {selectedBrand}
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
              💻 Selecteer Model
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
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-base font-semibold text-gray-800">
                📝 Voer model handmatig in
              </label>
              <Input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="e.g., ThinkPad X380 Yoga"
                className="h-12 text-base"
              />
            </div>
          )}

          {/* 🎒 Accessories Section */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎒</span>
              <div>
                <h4 className="font-semibold text-gray-900">Meegeleverde Accessoires</h4>
                <p className="text-xs text-gray-600">Optioneel: accessoires van het gedemonteerde apparaat</p>
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

          {/* Submit Button */}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedBrand || (!selectedModel || (selectedModel === "Anders..." && !customModel))}
            className="w-full h-14 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-lg font-bold rounded-lg"
          >
            ✅ Start Demonteren
          </Button>
        </div>
      )}
    </div>
  );
}
