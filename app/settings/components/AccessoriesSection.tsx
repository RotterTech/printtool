"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Plus, Save, Trash2, GripVertical, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ACCESSORY_TYPES } from "@/lib/config";

/**
 * AccessoriesSection - Manage custom accessories list
 * 
 * Allows adding, editing, reordering and removing accessories.
 * Saved to localStorage with backwards-compatible fallback to config.ts defaults.
 */

type Accessory = {
  value: string;
  label: string;
  emoji: string;
  defaultIncluded: boolean;
};

export default function AccessoriesSection() {
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [newAccessory, setNewAccessory] = useState({ value: "", label: "", emoji: "📎" });
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Load accessories from localStorage or use defaults
  useEffect(() => {
    const saved = localStorage.getItem("printtool_accessories");
    if (saved) {
      try {
        setAccessories(JSON.parse(saved));
      } catch {
        setAccessories([...ACCESSORY_TYPES]);
      }
    } else {
      setAccessories([...ACCESSORY_TYPES]);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("printtool_accessories", JSON.stringify(accessories));
    toast.success("Accessoires opgeslagen!");
    setHasChanges(false);
  };

  const handleResetAll = () => {
    setAccessories([...ACCESSORY_TYPES]);
    localStorage.removeItem("printtool_accessories");
    toast.success("Accessoires teruggezet naar standaard");
    setHasChanges(false);
  };

  const handleAdd = () => {
    if (!newAccessory.label.trim()) {
      toast.error("Vul een label in");
      return;
    }
    const value = newAccessory.value.trim() || newAccessory.label.toLowerCase().replace(/\s+/g, "_");
    const newItem: Accessory = {
      value,
      label: newAccessory.label.trim(),
      emoji: newAccessory.emoji || "📎",
      defaultIncluded: false,
    };
    setAccessories([...accessories, newItem]);
    setNewAccessory({ value: "", label: "", emoji: "📎" });
    setHasChanges(true);
  };

  const handleDelete = (index: number) => {
    const newList = accessories.filter((_, i) => i !== index);
    setAccessories(newList);
    setHasChanges(true);
  };

  const handleUpdate = (index: number, field: keyof Accessory, value: string | boolean) => {
    const newList = [...accessories];
    newList[index] = { ...newList[index], [field]: value };
    setAccessories(newList);
    setHasChanges(true);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    
    const newList = [...accessories];
    const draggedItem = newList[draggedIdx];
    newList.splice(draggedIdx, 1);
    newList.splice(index, 0, draggedItem);
    setAccessories(newList);
    setDraggedIdx(index);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  // Common emojis for quick selection
  const quickEmojis = ["🔌", "💼", "🖱️", "⌨️", "🔗", "🖥️", "💾", "💿", "🎧", "📷", "📄", "📦", "📎", "🔋", "🎮"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Accessoires</h2>
              <p className="text-sm text-gray-600">Beheer de lijst met accessoires voor intake</p>
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
              Reset
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
      <CardContent className="space-y-4">
        {/* Add New Accessory */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg space-y-3">
          <p className="text-sm font-bold text-amber-800">➕ Nieuw Accessoire Toevoegen</p>
          <div className="flex gap-2 flex-wrap">
            {/* Emoji Picker */}
            <div className="flex gap-1 flex-wrap">
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewAccessory({ ...newAccessory, emoji })}
                  className={`w-8 h-8 rounded border text-lg ${
                    newAccessory.emoji === emoji 
                      ? "bg-amber-500 border-amber-700" 
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Label (bijv. 'Externe HDD')"
              value={newAccessory.label}
              onChange={(e) => setNewAccessory({ ...newAccessory, label: e.target.value })}
              className="flex-1"
            />
            <Button onClick={handleAdd} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-1" />
              Toevoegen
            </Button>
          </div>
        </div>

        {/* Accessories List */}
        <div className="space-y-2">
          {accessories.map((acc, idx) => (
            <div
              key={acc.value}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 p-3 rounded-lg border bg-white transition-all ${
                draggedIdx === idx ? "opacity-50 border-amber-400 bg-amber-50" : "border-gray-200"
              }`}
            >
              {/* Drag Handle */}
              <div className="cursor-grab text-gray-400 hover:text-gray-600">
                <GripVertical className="w-5 h-5" />
              </div>

              {/* Emoji */}
              <span className="text-2xl">{acc.emoji}</span>

              {/* Label */}
              <Input
                value={acc.label}
                onChange={(e) => handleUpdate(idx, "label", e.target.value)}
                className="flex-1 font-medium"
              />

              {/* Default Checkbox */}
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={acc.defaultIncluded}
                  onChange={(e) => handleUpdate(idx, "defaultIncluded", e.target.checked)}
                  className="rounded border-gray-300"
                />
                Standaard
              </label>

              {/* Delete */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(idx)}
                className="text-red-500 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            💡 <strong>Tip:</strong> Sleep accessoires om de volgorde aan te passen. 
            Accessoires met &quot;Standaard&quot; aangevinkt worden automatisch geselecteerd bij nieuwe reparaties.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
