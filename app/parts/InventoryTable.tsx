"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { PartCheckoutDialog } from "@/components/PartCheckoutDialog";
import { formatDate } from "@/lib/utils";

type Part = {
  id: string;
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

export default function InventoryTable({ parts }: InventoryTableProps) {
  const router = useRouter();
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenCheckout = (part: Part, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setSelectedPart(part);
    setIsDialogOpen(true);
  };

  const handleRowClick = (partId: string) => {
    router.push(`/parts/${partId}`);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedPart(null);
  };

  const handleCheckoutSuccess = () => {
    router.refresh();
  };


  const getPartId = (id: string) => {
    return `PART-${id.substring(0, 8).toUpperCase()}`;
  };

  return (
    <div>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left py-3 px-3 font-bold text-gray-700">ID</th>
              <th className="text-left py-3 px-3 font-bold text-gray-700">Categorie</th>
              <th className="text-left py-3 px-3 font-bold text-gray-700">Specs</th>
              <th className="text-left py-3 px-3 font-bold text-gray-700">Herkomst</th>
              <th className="text-left py-3 px-3 font-bold text-gray-700">Datum</th>
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
                <td className="py-3 px-3 font-mono font-bold text-gray-900 text-xs">
                  {getPartId(part.id)}
                </td>
                <td className="py-3 px-3 text-gray-900 font-semibold">
                  {part.category || "—"}
                </td>
                <td className="py-3 px-3 text-gray-700 truncate max-w-[200px]">
                  {part.specs || "—"}
                </td>
                <td className="py-3 px-3">
                  <div className="text-gray-900 font-semibold">{part.brand || "—"}</div>
                  <div className="text-gray-600 text-xs">{part.model || "—"}</div>
                  {part.note && (
                    <div className="text-gray-500 text-xs italic mt-1 truncate max-w-[180px]">
                      {part.note}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 text-gray-700 text-xs whitespace-nowrap">
                  {formatDate(part.created_at)}
                </td>
                <td className="py-3 px-3 text-center">
                  <button
                    onClick={(e) => handleOpenCheckout(part, e)}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1.5 mx-auto transition-colors"
                  >
                    <LogOut size={16} />
                    Gebruik
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden divide-y divide-gray-100">
        {parts.map((part) => (
          <div 
            key={part.id} 
            onClick={() => handleRowClick(part.id)}
            className="p-3 space-y-2 hover:bg-blue-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-gray-400">{getPartId(part.id)}</span>
              <span className="text-xs text-gray-400">{formatDate(part.created_at)}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-gray-900">{part.category || "—"}</p>
                <p className="text-xs text-gray-600 truncate">{part.specs || "—"}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {part.brand || "—"} {part.model || ""}
                </p>
                {part.note && (
                  <p className="text-xs text-gray-400 italic truncate mt-0.5">{part.note}</p>
                )}
              </div>
              <button
                onClick={(e) => handleOpenCheckout(part, e)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center gap-1.5 flex-shrink-0 transition-colors"
              >
                <LogOut size={14} />
                Gebruik
              </button>
            </div>
          </div>
        ))}
      </div>

      <PartCheckoutDialog
        part={selectedPart}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
}
