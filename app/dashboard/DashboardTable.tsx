"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { formatDate } from "@/lib/utils";
// Bulk delete helper
async function bulkDeleteRepairs(ids: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/repairs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      const json = await res.json();
      return { success: false, error: json.error || "Verwijderen mislukt" };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "Verwijderen mislukt (serverfout)" };
  }
}
import {
  Eye,
  Pencil,
  Printer,
  LogOut,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { getDisplayName } from "@/lib/repair-fields";

type Repair = {
  id: string;
  job_id: string;
  first_name?: string;
  last_name?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  device_brand?: string;
  device_model?: string;
  serial_number?: string;
  problem_description?: string;
  status: string;
  created_at: string;
  agreed_price?: string;
};

interface DashboardTableProps {
  repairs: Repair[];
}

export default function DashboardTable({ repairs }: DashboardTableProps) {
  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allSelected = repairs.length > 0 && selectedIds.length === repairs.length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const selectAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(repairs.map((r) => r.id));
  };
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Weet je zeker dat je ${selectedIds.length} reparaties wilt verwijderen?`)) return;
    const result = await bulkDeleteRepairs(selectedIds);
    if (result.success) {
      toast.success(`${selectedIds.length} reparaties verwijderd.`);
      setSelectedIds([]);
      router.refresh();
    } else {
      toast.error(result.error || "Verwijderen mislukt");
    }
  };

  const handleDeleteRepair = async (id: string, jobId?: string) => {
    if (!window.confirm(`Weet je zeker dat je reparatie ${jobId || id} wilt verwijderen?`)) return;
    const result = await bulkDeleteRepairs([id]);
    if (result.success) {
      toast.success("Reparatie verwijderd.");
      router.refresh();
      setOpenMenuId(null);
    } else {
      toast.error(result.error || "Verwijderen mislukt");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Nieuw: "bg-blue-100 text-blue-800",
      Besteld: "bg-orange-100 text-orange-800",
      "In reparatie": "bg-yellow-100 text-yellow-800",
      "Reparatie klaar": "bg-green-100 text-green-800",
      Afgehaald: "bg-gray-100 text-gray-800",
      Geannuleerd: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };


  const formatPrice = (price?: string) => {
    if (!price) return "-";
    const num = parseFloat(price);
    if (isNaN(num)) return price;
    return `€ ${num.toFixed(2)}`;
  };

  const toggleMenu = (id: string) => {
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  const handlePrintLabel = (jobId: string) => {
    if (typeof window !== 'undefined') {
      window.open(`/print/${jobId}`, "_blank");
    }
  };

  const handleUitboeken = async (id: string) => {
    try {
      let datum_uit = "";
      if (typeof window !== 'undefined') {
        datum_uit = new Date().toISOString();
      } else {
        datum_uit = ""; // fallback, let server fill in if needed
      }
      const res = await fetch("/api/repairs/out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          datum_uit,
          status: "Afgehaald",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("Uitboeken error:", json);
        toast.error("Uitboeken mislukt.");
        return;
      }

      toast.success("Reparatie uitgeboekt.");
      router.refresh();
      setOpenMenuId(null);
    } catch (e) {
      console.error("Uitboeken error:", e);
      toast.error("Uitboeken mislukt (serverfout).");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-visible">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Resultaten ({repairs.length})
        </h2>
        <button
          onClick={handleBulkDelete}
          disabled={selectedIds.length === 0}
          className={`px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors ${
            selectedIds.length === 0
              ? "bg-gray-100 text-gray-400 border-gray-200"
              : "bg-red-600 text-white border-red-600 hover:bg-red-700"
          }`}
        >
          Verwijder ({selectedIds.length})
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 font-semibold text-xs text-gray-600 uppercase tracking-wide">
          <div className="col-span-1 flex items-center gap-1">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={selectAll}
              className="w-3.5 h-3.5"
              aria-label="Selecteer alles"
            />
            ID
          </div>
          <div className="col-span-2">Klant</div>
          <div className="col-span-2">Apparaat</div>
          <div className="col-span-2">Probleem</div>
          <div className="col-span-1">Prijs</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Datum</div>
          <div className="col-span-2 text-right">Actie</div>
        </div>

        {repairs.map((repair) => (
          <div
            key={repair.id}
            onClick={() => router.push(`/repairs/${repair.job_id}`)}
            className="grid grid-cols-12 gap-2 px-3 py-1.5 border-b border-gray-50 hover:bg-blue-50/50 items-center cursor-pointer transition-colors"
          >
            <div className="col-span-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selectedIds.includes(repair.id)}
                onChange={() => toggleSelect(repair.id)}
                className="w-3.5 h-3.5"
                aria-label={`Selecteer ${repair.job_id}`}
              />
              <span className="text-xs font-mono text-gray-400">#{repair.job_id}</span>
            </div>

            <div className="col-span-2 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{getDisplayName(repair)}</p>
              {(repair.customer_phone || repair.customer_email) && (
                <p className="text-[11px] text-gray-400 truncate">
                  {repair.customer_phone || repair.customer_email}
                </p>
              )}
            </div>

            <div className="col-span-2 min-w-0">
              <p className="text-sm text-gray-900 truncate">
                {(repair.device_brand || "—")} {(repair.device_model || "")}
              </p>
              {repair.serial_number && (
                <p className="text-[11px] text-gray-400 truncate font-mono">{repair.serial_number}</p>
              )}
            </div>

            <div className="col-span-2 min-w-0">
              <p className="text-xs text-gray-600 truncate">
                {repair.problem_description || "—"}
              </p>
            </div>

            <div className="col-span-1">
              <p className="text-sm text-gray-900 font-medium">
                {formatPrice(repair.agreed_price)}
              </p>
            </div>

            <div className="col-span-1">
              <span
                className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${getStatusColor(repair.status)}`}
              >
                {repair.status}
              </span>
            </div>

            <div className="col-span-1">
              <p className="text-xs text-gray-500">{formatDate(repair.created_at)}</p>
            </div>

            <div className="col-span-2 flex justify-end relative" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePrintLabel(repair.job_id)}
                  className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  title="Print label"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <div className="relative">
                  <button
                    onClick={() => toggleMenu(repair.id)}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-400 transition-colors"
                    title="Meer acties"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {openMenuId === repair.id && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden text-left py-1">
                        <button
                          onClick={() => {
                            router.push(`/repairs/${repair.job_id}`);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Bekijken
                        </button>
                        <button
                          onClick={() => {
                            router.push(`/repairs/${repair.job_id}?edit=true`);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Bewerken
                        </button>
                        <button
                          onClick={() => handleUitboeken(repair.id)}
                          className="w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Uitboeken
                        </button>
                        <button
                          onClick={() => handleDeleteRepair(repair.id, repair.job_id)}
                          className="w-full px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Verwijderen
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk delete bar */}
      {selectedIds.length > 0 && (
        <div className="px-3 py-2 bg-red-50 border-t border-red-200 flex items-center gap-3">
          <span className="text-red-700 text-sm font-medium">{selectedIds.length} geselecteerd</span>
          <button
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1.5 rounded text-sm"
            onClick={handleBulkDelete}
          >
            Verwijderen
          </button>
        </div>
      )}

      {/* Mobile Card Layout */}
      <div className="lg:hidden divide-y divide-gray-100">
        {repairs.map((repair) => (
          <div
            key={repair.id}
            onClick={() => router.push(`/repairs/${repair.job_id}`)}
            className="p-2.5 sm:p-3 hover:bg-blue-50/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(repair.id)}
                  onChange={() => toggleSelect(repair.id)}
                  className="w-3.5 h-3.5"
                />
                <span className="text-xs font-mono text-gray-400">#{repair.job_id}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded font-semibold text-[11px] ${getStatusColor(repair.status)}`}
              >
                {repair.status}
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm text-gray-900">{getDisplayName(repair)}</p>
                <p className="text-xs text-gray-500">
                  {repair.device_brand} {repair.device_model}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{formatPrice(repair.agreed_price)}</p>
                <p className="text-[11px] text-gray-400">{formatDate(repair.created_at)}</p>
              </div>
            </div>

            {repair.problem_description && (
              <p className="text-xs text-gray-500 mt-1 truncate">{repair.problem_description}</p>
            )}

            {/* Mobile action buttons */}
            <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => handlePrintLabel(repair.job_id)}
                className="p-2 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Print label"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  router.push(`/repairs/${repair.job_id}?edit=true`);
                }}
                className="p-2 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Bewerken"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <div className="relative">
                <button
                  onClick={() => toggleMenu(repair.id)}
                  className="p-2 hover:bg-gray-100 rounded text-gray-400 transition-colors"
                  title="Meer acties"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {openMenuId === repair.id && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setOpenMenuId(null)}
                    />
                    <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden text-left py-1">
                      <button
                        onClick={() => {
                          router.push(`/repairs/${repair.job_id}`);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Bekijken
                      </button>
                      <button
                        onClick={() => handleUitboeken(repair.id)}
                        className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Uitboeken
                      </button>
                      <button
                        onClick={() => handleDeleteRepair(repair.id, repair.job_id)}
                        className="w-full px-3 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Verwijderen
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
