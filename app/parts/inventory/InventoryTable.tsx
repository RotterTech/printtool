"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, Printer } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { queuePartLabel } from "@/lib/print-queue-helpers";
import {
  MemoryStick, HardDrive, Wifi, Battery, Monitor,
  Keyboard, Cable, Cpu, Box, HelpCircle, Gamepad2,
} from "lucide-react";
import { PartCheckoutDialog } from "@/components/PartCheckoutDialog";

type Part = {
  id: string;
  short_id?: string;
  category: string;
  brand: string;
  model: string;
  specs: string;
  note?: string;
  status: string;
  created_at: string;
};

interface InventoryTableProps {
  parts: Part[];
}

const PART_ICONS: Record<string, React.ReactNode> = {
  RAM: <MemoryStick size={18} className="text-blue-600" />,
  SSD: <HardDrive size={18} className="text-purple-600" />,
  HDD: <HardDrive size={18} className="text-purple-600" />,
  WiFi: <Wifi size={18} className="text-green-600" />,
  Battery: <Battery size={18} className="text-yellow-600" />,
  Screen: <Monitor size={18} className="text-cyan-600" />,
  Keyboard: <Keyboard size={18} className="text-indigo-600" />,
  Adapter: <Cable size={18} className="text-gray-600" />,
  CPU: <Cpu size={18} className="text-red-600" />,
  GPU: <Gamepad2 size={18} className="text-pink-600" />,
  Motherboard: <Cpu size={18} className="text-red-500" />,
  Overig: <Box size={18} className="text-gray-500" />,
};

const STATUS_COLORS: Record<string, string> = {
  "Op Voorraad": "bg-green-100 text-green-800",
  "Verkocht": "bg-gray-100 text-gray-800",
  "Gebruikt": "bg-yellow-100 text-yellow-800",
  "Defect": "bg-red-100 text-red-800",
};

export default function InventoryTable({ parts }: InventoryTableProps) {
  const router = useRouter();
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = useMemo(
    () => parts.length > 0 && selectedIds.size === parts.length,
    [parts.length, selectedIds]
  );

  const getPartId = (part: Part) => part.short_id || part.id.substring(0, 8).toUpperCase();
  const getCategoryIcon = (category: string) => PART_ICONS[category] || <HelpCircle size={18} className="text-gray-400" />;

  const handleRowClick = (partId: string) => {
    router.push(`/parts/${partId}`);
  };

  const handleOpenCheckout = (part: Part, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPart(part);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedPart(null);
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (parts.length === 0) return prev;
      if (prev.size === parts.length) return new Set();
      return new Set(parts.map((p) => p.id));
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Weet je zeker dat je ${selectedIds.size} onderdeel(eren) wilt verwijderen?`)) return;

    try {
      const res = await fetch("/api/parts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || "Verwijderen mislukt");
        return;
      }
      toast.success("Onderdelen verwijderd");
      setSelectedIds(new Set());
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Verwijderen mislukt");
    }
  };

  const handleDeletePart = async (part: Part, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Weet je zeker dat je ${getPartId(part)} wilt verwijderen?`)) return;

    try {
      const res = await fetch(`/api/parts?id=${encodeURIComponent(part.id)}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || "Verwijderen mislukt");
        return;
      }
      toast.success("Onderdeel verwijderd");
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Verwijderen mislukt");
    }
  };

  if (parts.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        Geen onderdelen gevonden in voorraad.
      </div>
    );
  }

  return (
    <div>
      {/* Bulk Actions */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="text-sm text-gray-600">
          {selectedIds.size > 0 ? `${selectedIds.size} geselecteerd` : ""}
        </div>
        <button
          onClick={handleDeleteSelected}
          disabled={selectedIds.size === 0}
          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border transition-colors ${
            selectedIds.size === 0
              ? "bg-gray-100 text-gray-400 border-gray-200"
              : "bg-red-600 text-white border-red-600 hover:bg-red-700"
          }`}
        >
          Verwijder ({selectedIds.size})
        </button>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-2">
        {parts.map((part) => (
          <div
            key={part.id}
            onClick={() => handleRowClick(part.id)}
            className="bg-white border rounded-xl p-3 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer active:bg-blue-50"
          >
            {/* Top Row: Checkbox + ID + Date */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(part.id)}
                  onChange={(e) => toggleSelect(part.id, e as any)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded"
                />
                <span className="bg-blue-100 text-blue-800 font-mono font-bold text-xs px-2 py-0.5 rounded-full">
                  {getPartId(part)}
                </span>
              </div>
              <span className="text-[10px] text-gray-400">{formatDate(part.created_at)}</span>
            </div>

            {/* Main Info */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                {getCategoryIcon(part.category)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{part.category || "Onderdeel"}</p>
                <p className="text-xs text-gray-600 truncate">{part.specs || "—"}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {part.brand || "—"} {part.model ? `• ${part.model}` : ""}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${STATUS_COLORS[part.status] || "bg-gray-100 text-gray-700"}`}>
                {part.status}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  queuePartLabel(part).then(r => {
                    if (r.success) toast.success("Part label naar printer gestuurd!");
                    else toast.error(r.error || "Printen mislukt");
                  }).catch(() => toast.error("Kon niet verbinden met print queue"));
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer size={14} />
              </button>
              {part.status === "Op Voorraad" && (
                <button
                  onClick={(e) => handleOpenCheckout(part, e)}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogOut size={14} />
                  Uitboeken
                </button>
              )}
              <button
                onClick={(e) => handleDeletePart(part, e)}
                className="bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left py-3 px-3 font-bold text-gray-700 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              </th>
              <th className="text-left py-3 px-3 font-bold text-gray-700">ID</th>
              <th className="text-left py-3 px-3 font-bold text-gray-700">Categorie</th>
              <th className="text-left py-3 px-3 font-bold text-gray-700">Specs</th>
              <th className="text-left py-3 px-3 font-bold text-gray-700">Herkomst</th>
              <th className="text-left py-3 px-3 font-bold text-gray-700">Datum</th>
              <th className="text-left py-3 px-3 font-bold text-gray-700">Status</th>
              <th className="text-center py-3 px-3 font-bold text-gray-700">Acties</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr
                key={part.id}
                onClick={() => handleRowClick(part.id)}
                className="border-b border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(part.id)}
                    onChange={(e) => toggleSelect(part.id, e as any)}
                  />
                </td>
                <td className="py-3 px-3">
                  <span className="bg-blue-100 text-blue-800 font-mono font-bold text-xs px-2 py-1 rounded-full">
                    {getPartId(part)}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(part.category)}
                    <span className="font-semibold text-gray-900">{part.category || "—"}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-gray-700 max-w-[200px] truncate">
                  {part.specs || "—"}
                </td>
                <td className="py-3 px-3">
                  <div className="text-gray-900 font-semibold">{part.brand || "—"}</div>
                  <div className="text-gray-600 text-xs">{part.model || "—"}</div>
                </td>
                <td className="py-3 px-3 text-gray-700 text-xs whitespace-nowrap">
                  {formatDate(part.created_at)}
                </td>
                <td className="py-3 px-3">
                  <span className={`inline-block font-semibold text-xs px-3 py-1 rounded-full ${STATUS_COLORS[part.status] || "bg-gray-100 text-gray-700"}`}>
                    {part.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        queuePartLabel(part).then(r => {
                          if (r.success) toast.success("Part label naar printer gestuurd!");
                          else toast.error(r.error || "Printen mislukt");
                        }).catch(() => toast.error("Kon niet verbinden met print queue"));
                      }}
                      className="hover:bg-emerald-50 p-2 rounded-lg transition-colors"
                      title="Print label via USB"
                    >
                      <Printer className="h-4 w-4 text-emerald-600" />
                    </button>
                    <button
                      onClick={(e) => handleDeletePart(part, e)}
                      className="hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                    {part.status === "Op Voorraad" && (
                      <button
                        onClick={(e) => handleOpenCheckout(part, e)}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-3 rounded-lg text-sm flex items-center gap-1.5 transition-colors"
                      >
                        <LogOut size={16} />
                        Gebruik
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Checkout Dialog */}
      {selectedPart && (
        <PartCheckoutDialog
          part={selectedPart}
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          onSuccess={() => {
            handleCloseDialog();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
