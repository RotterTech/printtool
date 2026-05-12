"use client";

import { useState, useEffect } from "react";
import { User, Laptop, Mail, Phone, Hash } from "lucide-react";
import { DEVICE_TYPES, getBrandModels, getAccessoryTypes, type DeviceType } from "@/lib/config";
import CustomerSearch, { type UnifiedCustomer } from "./CustomerSearch";

export type APKData = {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  klantnummer?: string;
  deviceType: DeviceType;
  brand: string;
  model: string;
  customModel?: string;
  accessories: { type: string; label: string; quantity: number; notes: string }[];
};

interface APKFormProps {
  formData: APKData;
  setFormData: (data: APKData) => void;
  onSubmit: () => void;
}

export default function APKForm({ formData, setFormData, onSubmit }: APKFormProps) {
  // Get brands and models from central config (with custom overrides)
  const [brandModels, setBrandModels] = useState(getBrandModels());
  const [accessoryTypes, setAccessoryTypes] = useState(getAccessoryTypes());
  
  // Refresh brand models and accessory types when component mounts (to pick up changes from settings)
  useEffect(() => {
    setBrandModels(getBrandModels());
    setAccessoryTypes(getAccessoryTypes());
  }, []);
  
  const deviceBrands = brandModels[formData.deviceType] || {};
  const brandList = Object.keys(deviceBrands);
  const selectedModels = formData.brand ? (deviceBrands[formData.brand] || []) : [];
  
  const isCustomSelected = formData.model === "Anders...";
  const deviceModel = isCustomSelected ? (formData.customModel || "").trim() : (formData.model || "").trim();

  // Ensure accessories array exists
  const accessories = formData.accessories || [];

  const handleDeviceTypeSelect = (type: DeviceType) => {
    setFormData({
      ...formData,
      deviceType: type,
      brand: "",
      model: "",
      customModel: ""
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">🔍 APK Inboeken</h2>
        <p className="text-gray-600 text-sm sm:text-base">Vul klant- en apparaatgegevens in</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4 sm:space-y-8"
      >
        {/* Customer */}
        <section className="bg-white rounded-xl shadow p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Klant</h3>
          </div>

          <div className="space-y-4">
            {/* Customer Search */}
            <div>
              <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">🔍 Zoek klant</label>
              <CustomerSearch
                initialValue={formData.customerName || ""}
                onSelect={(customer: UnifiedCustomer) => {
                  setFormData({
                    ...formData,
                    customerName: customer.name,
                    customerEmail: customer.email || "",
                    customerPhone: customer.phone || "",
                    klantnummer: customer.klantnummer || "",
                  });
                }}
                placeholder="Zoek op naam, e-mail of telefoon..."
              />
            </div>

            {/* Manual input fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Naam
                </label>
                <input
                  type="text"
                  value={formData.customerName || ""}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Naam van de klant"
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> E-mail
                </label>
                <input
                  type="email"
                  value={formData.customerEmail || ""}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="klant@email.nl"
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Telefoon
                </label>
                <input
                  type="tel"
                  value={formData.customerPhone || ""}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder="06-12345678"
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Klantnummer
                </label>
                <input
                  type="text"
                  value={formData.klantnummer || ""}
                  onChange={(e) => setFormData({ ...formData, klantnummer: e.target.value })}
                  placeholder="Optioneel"
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Device Type Selection */}
        <section className="bg-white rounded-xl shadow p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
              <span className="text-base sm:text-lg">📱</span>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Apparaat Type</h3>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
            {DEVICE_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleDeviceTypeSelect(type.value)}
                className={`h-14 sm:h-20 rounded-lg font-bold text-sm sm:text-base transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 sm:gap-1 ${
                  formData.deviceType === type.value
                    ? "bg-purple-500 text-white border-2 border-purple-700 shadow-lg"
                    : "bg-white text-gray-900 border border-gray-200 hover:bg-purple-50 hover:border-purple-300"
                }`}
              >
                <span className="text-xl sm:text-2xl">{type.emoji}</span>
                <span className="text-xs sm:text-sm">{type.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Brand & Model Selection */}
        {formData.deviceType && (
          <section className="bg-white rounded-xl shadow p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 bg-indigo-100 rounded-lg">
                <Laptop className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Merk & Model</h3>
            </div>

            {/* Brand grid */}
            <div className="mb-4 sm:mb-6">
              <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 block">🏭 Selecteer Merk</label>
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {brandList.map((b) => {
                  const active = formData.brand === b;
                  return (
                    <button
                      type="button"
                      key={b}
                      onClick={() => setFormData({ ...formData, brand: b, model: "", customModel: "" })}
                      className={`p-2.5 sm:p-4 rounded-xl border-2 transition-all text-center select-none font-semibold text-sm sm:text-base ${
                        active
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 bg-white text-gray-800 hover:border-gray-400"
                      }`}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Model selection */}
            {formData.brand && (
              <div className="space-y-2 sm:space-y-3">
                <label className="text-xs sm:text-sm font-semibold text-gray-700">💻 Model / Serie</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  {selectedModels.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormData({ ...formData, model: m })}
                      className={`p-2 sm:p-3 rounded-xl border-2 transition-all text-center font-medium text-sm ${
                        formData.model === m
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-300 bg-white text-gray-800 hover:border-gray-400"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {isCustomSelected && (
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 mt-2 sm:mt-3">
                    <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">📝 Model handmatig</label>
                    <input
                      type="text"
                      value={formData.customModel || ""}
                      onChange={(e) => setFormData({ ...formData, customModel: e.target.value })}
                      placeholder="Specifiek model (bijv. T480)"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-base sm:text-lg"
                    />
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* 🎒 Accessories Section */}
        {formData.brand && (
          <section className="bg-amber-50 border-2 border-amber-200 rounded-xl shadow p-4 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="p-1.5 sm:p-2 bg-amber-100 rounded-lg">
                <span className="text-base sm:text-lg">🎒</span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Accessoires</h3>
                <p className="text-xs sm:text-sm text-gray-600">Welke accessoires heeft de klant ingeleverd?</p>
              </div>
            </div>

            {/* Quick Select Accessory Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2">
              {accessoryTypes.map((acc) => {
                const isSelected = accessories.some(a => a.type === acc.value);
                return (
                  <button
                    key={acc.value}
                    type="button"
                    onClick={() => {
                      let newAccessories = [...accessories];
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
                      setFormData({ ...formData, accessories: newAccessories });
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
            {accessories.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-bold text-amber-800">Geselecteerde accessoires:</p>
                {accessories.map((acc, idx) => {
                  const accType = accessoryTypes.find(a => a.value === acc.type);
                  return (
                    <div key={acc.type} className="bg-white p-2 rounded border border-amber-300 flex items-center gap-2">
                      <span className="text-lg">{accType?.emoji || "📎"}</span>
                      <span className="font-medium text-sm flex-1">{acc.label}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const newAccessories = [...accessories];
                            if (newAccessories[idx].quantity > 1) {
                              newAccessories[idx].quantity--;
                              setFormData({ ...formData, accessories: newAccessories });
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
                            const newAccessories = [...accessories];
                            newAccessories[idx].quantity++;
                            setFormData({ ...formData, accessories: newAccessories });
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
                          const newAccessories = [...accessories];
                          newAccessories[idx].notes = e.target.value;
                          setFormData({ ...formData, accessories: newAccessories });
                        }}
                        className="w-24 px-2 py-1 text-xs border rounded"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newAccessories = accessories.filter((_, i) => i !== idx);
                          setFormData({ ...formData, accessories: newAccessories });
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
          </section>
        )}

        {/* Submit */}
        <div className="flex">
          <button
            type="submit"
            disabled={!formData.customerName?.trim() || !formData.brand || !deviceModel}
            className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✅ APK Inboeken & Label Printen
          </button>
        </div>
      </form>
    </div>
  );
}
