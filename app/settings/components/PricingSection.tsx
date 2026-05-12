"use client";

import { useState, useEffect } from "react";
import { DollarSign, Save, RefreshCw, Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { DEVICE_TYPES, QUICK_PRICES, PRICING, type DeviceType } from "@/lib/config";
import { toast } from "sonner";

interface QuickPrice {
  label: string;
  price: number;
}

type QuickPricesData = Record<DeviceType, QuickPrice[]>;

const STORAGE_KEY = "printtool_custom_prices";

export default function PricingSection() {
  const [quickPrices, setQuickPrices] = useState<QuickPricesData>(QUICK_PRICES as unknown as QuickPricesData);
  const [expandedDevice, setExpandedDevice] = useState<DeviceType | null>("laptop");
  const [hasChanges, setHasChanges] = useState(false);
  const [addingFor, setAddingFor] = useState<DeviceType | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newPrice, setNewPrice] = useState("");
  
  // Drag & drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Load custom prices on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setQuickPrices(parsed);
      } catch (e) {
        console.error("Failed to parse saved prices:", e);
      }
    }
  }, []);

  // Save prices
  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quickPrices));
    setHasChanges(false);
    toast.success("Prijzen opgeslagen!");
  };

  // Reset to defaults
  const handleReset = () => {
    if (confirm("Weet je zeker dat je wilt resetten naar standaard prijzen?")) {
      localStorage.removeItem(STORAGE_KEY);
      setQuickPrices(QUICK_PRICES as unknown as QuickPricesData);
      setHasChanges(false);
      toast.success("Reset naar standaard prijzen");
    }
  };

  // Add new price
  const handleAddPrice = (deviceType: DeviceType) => {
    if (!newLabel.trim() || !newPrice) return;

    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      toast.error("Voer een geldige prijs in");
      return;
    }

    setQuickPrices(prev => ({
      ...prev,
      [deviceType]: [...(prev[deviceType] || []), { label: newLabel.trim(), price }]
    }));

    setNewLabel("");
    setNewPrice("");
    setAddingFor(null);
    setHasChanges(true);
    toast.success("Prijs toegevoegd");
  };

  // Remove price
  const handleRemovePrice = (deviceType: DeviceType, index: number) => {
    setQuickPrices(prev => ({
      ...prev,
      [deviceType]: prev[deviceType].filter((_, i) => i !== index)
    }));
    setHasChanges(true);
    toast.success("Prijs verwijderd");
  };

  // Update price
  const handleUpdatePrice = (deviceType: DeviceType, index: number, field: "label" | "price", value: string) => {
    setQuickPrices(prev => ({
      ...prev,
      [deviceType]: prev[deviceType].map((item, i) => {
        if (i !== index) return item;
        if (field === "price") {
          const parsed = parseFloat(value);
          return { ...item, price: isNaN(parsed) ? 0 : parsed };
        }
        return { ...item, label: value };
      })
    }));
    setHasChanges(true);
  };

  // Drag & drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (deviceType: DeviceType, dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const prices = [...(quickPrices[deviceType] || [])];
    const [removed] = prices.splice(draggedIndex, 1);
    prices.splice(dropIndex, 0, removed);

    setQuickPrices(prev => ({
      ...prev,
      [deviceType]: prices
    }));

    setDraggedIndex(null);
    setDragOverIndex(null);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const deviceInfo = DEVICE_TYPES.find(d => d.value === expandedDevice);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Prijzen & Tarieven
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Beheer snelknoppen voor prijzen per apparaat type
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
          
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 ${
              hasChanges
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Save className="w-4 h-4" />
            Opslaan
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          ⚠️ Je hebt onopgeslagen wijzigingen
        </div>
      )}

      {/* Device Type Selector */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-2">
          {DEVICE_TYPES.map((device) => {
            const isActive = expandedDevice === device.value;
            const priceCount = (quickPrices[device.value] || []).length;
            
            return (
              <button
                key={device.value}
                onClick={() => setExpandedDevice(isActive ? null : device.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                  isActive
                    ? "bg-green-600 text-white shadow"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                }`}
              >
                <span className="text-lg">{device.emoji}</span>
                <span>{device.label}</span>
                <span className={`px-1.5 py-0.5 text-xs rounded ${
                  isActive ? "bg-green-500" : "bg-gray-200"
                }`}>
                  {priceCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Prices List for Selected Device */}
        {expandedDevice && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-xl">{deviceInfo?.emoji}</span>
                Prijzen voor {deviceInfo?.label}
              </h4>
              
              {addingFor === expandedDevice ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Omschrijving..."
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 w-40"
                    autoFocus
                  />
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="€"
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 w-20"
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={() => handleAddPrice(expandedDevice)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    Toevoegen
                  </button>
                  <button
                    onClick={() => {
                      setAddingFor(null);
                      setNewLabel("");
                      setNewPrice("");
                    }}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                  >
                    Annuleer
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingFor(expandedDevice)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Prijs Toevoegen
                </button>
              )}
            </div>

            {/* Prices Grid */}
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <GripVertical className="w-3 h-3" /> Sleep om volgorde aan te passen
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(quickPrices[expandedDevice] || []).map((item, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(expandedDevice, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 bg-white border rounded-lg transition-all cursor-grab active:cursor-grabbing ${
                    draggedIndex === index
                      ? "border-green-400 bg-green-50 opacity-50"
                      : dragOverIndex === index && draggedIndex !== null
                        ? "border-green-400 bg-green-50"
                        : "border-gray-200 hover:border-green-300"
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => handleUpdatePrice(expandedDevice, index, "label", e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-green-500"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">€</span>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleUpdatePrice(expandedDevice, index, "price", e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-green-500 text-right font-medium"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <button
                    onClick={() => handleRemovePrice(expandedDevice, index)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Verwijderen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {(quickPrices[expandedDevice] || []).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>Geen prijzen voor dit apparaat type</p>
                <p className="text-sm">Klik op "Prijs Toevoegen" om te beginnen</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tip for SaaS */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-semibold text-blue-900 mb-1">💡 SaaS Tip</h5>
        <p className="text-sm text-blue-800">
          Deze prijzen worden opgeslagen per browser. In de toekomst worden deze per bedrijf opgeslagen zodat elke klant eigen tarieven kan instellen.
        </p>
      </div>
    </div>
  );
}
