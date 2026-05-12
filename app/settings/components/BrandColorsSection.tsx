"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Palette, Save, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";
import { BRAND_COLORS, getBrandColor, getBrandModels } from "@/lib/config";

/**
 * BrandColorsSection - Manage custom brand colors
 * 
 * Allows customizing colors for each brand per device type.
 * Saved to localStorage with backwards-compatible fallback to config.ts defaults.
 */

// All unique brands from all device types
function getAllBrands() {
  const brandModels = getBrandModels();
  const allBrands = new Set<string>();
  
  Object.values(brandModels).forEach((brands) => {
    Object.keys(brands).forEach((brand) => {
      allBrands.add(brand);
    });
  });
  
  return Array.from(allBrands).sort();
}

export default function BrandColorsSection() {
  const [customColors, setCustomColors] = useState<Record<string, string>>({});
  const [editingBrand, setEditingBrand] = useState<string | null>(null);
  const [tempColor, setTempColor] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  
  // Load custom colors from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("printtool_brand_colors");
    if (saved) {
      try {
        setCustomColors(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const handleColorChange = (brand: string, color: string) => {
    const newColors = { ...customColors, [brand]: color };
    setCustomColors(newColors);
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem("printtool_brand_colors", JSON.stringify(customColors));
    toast.success("Merkenkleuren opgeslagen!");
    setHasChanges(false);
  };

  const handleReset = (brand: string) => {
    const newColors = { ...customColors };
    delete newColors[brand];
    setCustomColors(newColors);
    setHasChanges(true);
  };

  const handleResetAll = () => {
    setCustomColors({});
    localStorage.removeItem("printtool_brand_colors");
    toast.success("Alle kleuren teruggezet naar standaard");
    setHasChanges(false);
  };

  const getEffectiveColor = (brand: string) => {
    return customColors[brand] || BRAND_COLORS[brand]?.hex || "#6B7280";
  };

  const allBrands = getAllBrands();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Palette className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Merkenkleuren</h2>
              <p className="text-sm text-gray-600">Pas kleuren aan voor visuele herkenning</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAll}
              className="text-gray-600"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset Alles
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges}
              className={hasChanges ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <Save className="w-4 h-4 mr-1" />
              Opslaan
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {allBrands.map((brand) => {
            const effectiveColor = getEffectiveColor(brand);
            const isCustom = !!customColors[brand];
            const isEditing = editingBrand === brand;
            
            return (
              <div 
                key={brand}
                className={`relative p-3 rounded-lg border-2 transition-all ${
                  isCustom ? "border-purple-400 bg-purple-50" : "border-gray-200 bg-white"
                }`}
              >
                {/* Color Preview */}
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-8 h-8 rounded-lg border-2 border-gray-300 cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: effectiveColor }}
                    onClick={() => {
                      setEditingBrand(brand);
                      setTempColor(effectiveColor);
                    }}
                  />
                  <span className="font-medium text-sm truncate flex-1">{brand}</span>
                </div>

                {/* Color Picker (inline) */}
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      <Input
                        type="color"
                        value={tempColor}
                        onChange={(e) => setTempColor(e.target.value)}
                        className="w-10 h-8 p-0 border-0 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={tempColor}
                        onChange={(e) => setTempColor(e.target.value)}
                        placeholder="#RRGGBB"
                        className="flex-1 h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                        onClick={() => setEditingBrand(null)}
                      >
                        Annuleer
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          handleColorChange(brand, tempColor);
                          setEditingBrand(null);
                        }}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        OK
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <code className="text-[10px] text-gray-500 font-mono flex-1">
                      {effectiveColor}
                    </code>
                    {isCustom && (
                      <button
                        onClick={() => handleReset(brand)}
                        className="text-xs text-gray-400 hover:text-red-500"
                        title="Reset naar standaard"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}

                {/* Custom Badge */}
                {isCustom && !isEditing && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-[8px]">✓</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            💡 <strong>Tip:</strong> Klik op een kleurvak om de kleur aan te passen. 
            Kleuren worden weergegeven op merkknoppen en labels.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
