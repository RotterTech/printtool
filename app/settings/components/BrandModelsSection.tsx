"use client";

import { useState, useEffect } from "react";
import { Tag, Plus, Trash2, ChevronDown, ChevronUp, Save, RefreshCw, GripVertical } from "lucide-react";
import { DEVICE_TYPES, BRAND_MODELS, type DeviceType } from "@/lib/config";
import { toast } from "sonner";

interface BrandModelsData {
  [deviceType: string]: {
    [brand: string]: string[];
  };
}

const STORAGE_KEY = "printtool_custom_brand_models";

export default function BrandModelsSection() {
  const [data, setData] = useState<BrandModelsData>({});
  const [expandedDevice, setExpandedDevice] = useState<DeviceType | null>("laptop");
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [newBrandName, setNewBrandName] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [addingBrandFor, setAddingBrandFor] = useState<DeviceType | null>(null);
  const [addingModelFor, setAddingModelFor] = useState<{ device: DeviceType; brand: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Drag & drop state
  const [draggedModel, setDraggedModel] = useState<{ device: DeviceType; brand: string; model: string; index: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setData(parsed);
      } catch (e) {
        console.error("Failed to parse saved brand models:", e);
        // Fall back to default
        setData(BRAND_MODELS as unknown as BrandModelsData);
      }
    } else {
      // Use default from config
      setData(BRAND_MODELS as unknown as BrandModelsData);
    }
  }, []);

  // Save to localStorage
  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setHasChanges(false);
    toast.success("Merken en modellen opgeslagen!");
  };

  // Reset to defaults
  const handleReset = () => {
    if (confirm("Weet je zeker dat je wilt resetten naar standaard waarden? Alle aanpassingen gaan verloren.")) {
      localStorage.removeItem(STORAGE_KEY);
      setData(BRAND_MODELS as unknown as BrandModelsData);
      setHasChanges(false);
      toast.success("Reset naar standaard waarden");
    }
  };

  // Add brand
  const handleAddBrand = (deviceType: DeviceType) => {
    if (!newBrandName.trim()) return;
    
    const trimmed = newBrandName.trim();
    const deviceData = data[deviceType] || {};
    
    if (deviceData[trimmed]) {
      toast.error("Dit merk bestaat al");
      return;
    }
    
    setData(prev => ({
      ...prev,
      [deviceType]: {
        ...prev[deviceType],
        [trimmed]: ["Anders..."]
      }
    }));
    
    setNewBrandName("");
    setAddingBrandFor(null);
    setHasChanges(true);
    toast.success(`Merk "${trimmed}" toegevoegd`);
  };

  // Remove brand
  const handleRemoveBrand = (deviceType: DeviceType, brand: string) => {
    if (!confirm(`Merk "${brand}" en alle modellen verwijderen?`)) return;
    
    const newDeviceData = { ...data[deviceType] };
    delete newDeviceData[brand];
    
    setData(prev => ({
      ...prev,
      [deviceType]: newDeviceData
    }));
    
    setHasChanges(true);
    toast.success(`Merk "${brand}" verwijderd`);
  };

  // Add model
  const handleAddModel = (deviceType: DeviceType, brand: string) => {
    if (!newModelName.trim()) return;
    
    const trimmed = newModelName.trim();
    const models = data[deviceType]?.[brand] || [];
    
    if (models.includes(trimmed)) {
      toast.error("Dit model bestaat al");
      return;
    }
    
    // Insert before "Anders..." if it exists
    const andersIndex = models.indexOf("Anders...");
    const newModels = andersIndex >= 0
      ? [...models.slice(0, andersIndex), trimmed, ...models.slice(andersIndex)]
      : [...models, trimmed];
    
    setData(prev => ({
      ...prev,
      [deviceType]: {
        ...prev[deviceType],
        [brand]: newModels
      }
    }));
    
    setNewModelName("");
    setAddingModelFor(null);
    setHasChanges(true);
    toast.success(`Model "${trimmed}" toegevoegd`);
  };

  // Remove model
  const handleRemoveModel = (deviceType: DeviceType, brand: string, model: string) => {
    if (model === "Anders...") {
      toast.error("'Anders...' kan niet worden verwijderd");
      return;
    }
    
    const models = data[deviceType]?.[brand] || [];
    const newModels = models.filter(m => m !== model);
    
    setData(prev => ({
      ...prev,
      [deviceType]: {
        ...prev[deviceType],
        [brand]: newModels
      }
    }));
    
    setHasChanges(true);
    toast.success(`Model "${model}" verwijderd`);
  };

  // Drag & Drop handlers for models
  const handleDragStart = (deviceType: DeviceType, brand: string, model: string, index: number) => {
    setDraggedModel({ device: deviceType, brand, model, index });
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (deviceType: DeviceType, brand: string, dropIndex: number) => {
    if (!draggedModel || draggedModel.device !== deviceType || draggedModel.brand !== brand) {
      setDraggedModel(null);
      setDragOverIndex(null);
      return;
    }

    const models = [...(data[deviceType]?.[brand] || [])];
    const dragIndex = draggedModel.index;
    
    // Don't move "Anders..." from last position
    if (models[dropIndex] === "Anders..." || draggedModel.model === "Anders...") {
      setDraggedModel(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder
    const [removed] = models.splice(dragIndex, 1);
    models.splice(dropIndex, 0, removed);

    setData(prev => ({
      ...prev,
      [deviceType]: {
        ...prev[deviceType],
        [brand]: models
      }
    }));

    setDraggedModel(null);
    setDragOverIndex(null);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedModel(null);
    setDragOverIndex(null);
  };

  // Drag & Drop handlers for brands
  const [draggedBrand, setDraggedBrand] = useState<{ device: DeviceType; brand: string; index: number } | null>(null);
  const [dragOverBrandIndex, setDragOverBrandIndex] = useState<number | null>(null);

  const handleBrandDragStart = (deviceType: DeviceType, brand: string, index: number) => {
    setDraggedBrand({ device: deviceType, brand, index });
  };

  const handleBrandDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverBrandIndex(index);
  };

  const handleBrandDrop = (deviceType: DeviceType, dropIndex: number) => {
    if (!draggedBrand || draggedBrand.device !== deviceType) {
      setDraggedBrand(null);
      setDragOverBrandIndex(null);
      return;
    }

    const brands = Object.keys(data[deviceType] || {});
    const dragIndex = draggedBrand.index;
    
    // Reorder brands
    const [removed] = brands.splice(dragIndex, 1);
    brands.splice(dropIndex, 0, removed);

    // Rebuild the object in new order
    const newDeviceData: { [brand: string]: string[] } = {};
    brands.forEach(brand => {
      newDeviceData[brand] = data[deviceType][brand];
    });

    setData(prev => ({
      ...prev,
      [deviceType]: newDeviceData
    }));

    setDraggedBrand(null);
    setDragOverBrandIndex(null);
    setHasChanges(true);
  };

  const deviceInfo = DEVICE_TYPES.find(d => d.value === expandedDevice);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            Merken & Modellen
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Beheer de beschikbare merken en modellen per apparaat type
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
                ? "bg-blue-600 text-white hover:bg-blue-700"
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

      {/* Device Type Tabs */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Device Type Selector */}
        <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-2">
          {DEVICE_TYPES.map((device) => {
            const isActive = expandedDevice === device.value;
            const brandCount = Object.keys(data[device.value] || {}).length;
            
            return (
              <button
                key={device.value}
                onClick={() => {
                  setExpandedDevice(isActive ? null : device.value);
                  setExpandedBrand(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                }`}
              >
                <span className="text-lg">{device.emoji}</span>
                <span>{device.label}</span>
                <span className={`px-1.5 py-0.5 text-xs rounded ${
                  isActive ? "bg-blue-500" : "bg-gray-200"
                }`}>
                  {brandCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Brand List for Selected Device */}
        {expandedDevice && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-xl">{deviceInfo?.emoji}</span>
                Merken voor {deviceInfo?.label}
              </h4>
              
              {addingBrandFor === expandedDevice ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    placeholder="Nieuw merk..."
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddBrand(expandedDevice);
                      if (e.key === "Escape") setAddingBrandFor(null);
                    }}
                  />
                  <button
                    onClick={() => handleAddBrand(expandedDevice)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    Toevoegen
                  </button>
                  <button
                    onClick={() => {
                      setAddingBrandFor(null);
                      setNewBrandName("");
                    }}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                  >
                    Annuleer
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingBrandFor(expandedDevice)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Merk Toevoegen
                </button>
              )}
            </div>

            {/* Brand Cards */}
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <GripVertical className="w-3 h-3" /> Sleep merken om volgorde aan te passen
            </p>
            <div className="space-y-2">
              {Object.entries(data[expandedDevice] || {}).map(([brand, models], brandIndex) => {
                const isExpanded = expandedBrand === brand;
                
                return (
                  <div
                    key={brand}
                    draggable
                    onDragStart={() => handleBrandDragStart(expandedDevice, brand, brandIndex)}
                    onDragOver={(e) => handleBrandDragOver(e, brandIndex)}
                    onDrop={() => handleBrandDrop(expandedDevice, brandIndex)}
                    onDragEnd={() => { setDraggedBrand(null); setDragOverBrandIndex(null); }}
                    className={`border rounded-lg overflow-hidden transition-all ${
                      draggedBrand?.brand === brand
                        ? "border-blue-400 bg-blue-50 opacity-50"
                        : dragOverBrandIndex === brandIndex && draggedBrand
                          ? "border-green-400 bg-green-50"
                          : "border-gray-200"
                    }`}
                  >
                    {/* Brand Header */}
                    <div
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isExpanded ? "bg-blue-50" : "bg-white hover:bg-gray-50"
                      }`}
                      onClick={() => setExpandedBrand(isExpanded ? null : brand)}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing" />
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-blue-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                        <span className="font-semibold text-gray-900">{brand}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {models.length} modellen
                        </span>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveBrand(expandedDevice, brand);
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Merk verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Models List */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 p-3 bg-gray-50">
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                          <GripVertical className="w-3 h-3" /> Sleep om volgorde aan te passen
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {models.map((model, index) => (
                            <div
                              key={model}
                              draggable={model !== "Anders..."}
                              onDragStart={() => handleDragStart(expandedDevice, brand, model, index)}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDragLeave={handleDragLeave}
                              onDrop={() => handleDrop(expandedDevice, brand, index)}
                              onDragEnd={handleDragEnd}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all ${
                                model === "Anders..."
                                  ? "bg-gray-200 text-gray-600"
                                  : draggedModel?.model === model
                                    ? "bg-blue-200 border-2 border-blue-400 text-blue-700 opacity-50"
                                    : dragOverIndex === index && draggedModel
                                      ? "bg-green-100 border-2 border-green-400"
                                      : "bg-white border border-gray-300 text-gray-700 cursor-grab active:cursor-grabbing hover:border-blue-400"
                              }`}
                            >
                              {model !== "Anders..." && (
                                <GripVertical className="w-3 h-3 text-gray-400" />
                              )}
                              <span>{model}</span>
                              {model !== "Anders..." && (
                                <button
                                  onClick={() => handleRemoveModel(expandedDevice, brand, model)}
                                  className="ml-1 p-0.5 text-gray-400 hover:text-red-500 rounded-full"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Add Model */}
                        {addingModelFor?.device === expandedDevice && addingModelFor?.brand === brand ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newModelName}
                              onChange={(e) => setNewModelName(e.target.value)}
                              placeholder="Nieuw model..."
                              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddModel(expandedDevice, brand);
                                if (e.key === "Escape") setAddingModelFor(null);
                              }}
                            />
                            <button
                              onClick={() => handleAddModel(expandedDevice, brand)}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                            >
                              Toevoegen
                            </button>
                            <button
                              onClick={() => {
                                setAddingModelFor(null);
                                setNewModelName("");
                              }}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                            >
                              Annuleer
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingModelFor({ device: expandedDevice, brand })}
                            className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Model Toevoegen
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {Object.keys(data[expandedDevice] || {}).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Tag className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>Geen merken voor dit apparaat type</p>
                  <p className="text-sm">Klik op "Merk Toevoegen" om te beginnen</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
