"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

export type ApkJob = {
  id: string;
  job_id: string;
  customer_name: string;
  device_brand: string;
  device_model: string;
  created_at: string;
  status: string;
};

interface DashboardApkTableProps {
  jobs: ApkJob[];
}

export default function DashboardApkTable({ jobs }: DashboardApkTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allSelected = useMemo(
    () => jobs.length > 0 && selectedIds.size === jobs.length,
    [jobs.length, selectedIds]
  );


  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (jobs.length === 0) return prev;
      if (prev.size === jobs.length) return new Set();
      return new Set(jobs.map((j) => j.id));
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      `Weet je zeker dat je ${selectedIds.size} APK job(s) wilt verwijderen?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/apk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Verwijderen mislukt");
        return;
      }

      toast.success("APK jobs verwijderd");
      setSelectedIds(new Set());
      router.refresh();
    } catch (err) {
      console.error("Bulk delete error:", err);
      toast.error("Verwijderen mislukt");
    }
  };

  const handleDeleteJob = async (id: string, jobId: string) => {
    const confirmed = window.confirm(
      `Weet je zeker dat je APK job ${jobId} wilt verwijderen?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/apk?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Verwijderen mislukt");
        return;
      }

      toast.success("APK job verwijderd");
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Verwijderen mislukt");
    }
  };

  return (
    <div className="bg-white border rounded-lg overflow-visible">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Resultaten ({jobs.length})
        </h2>
        <button
          onClick={handleBulkDelete}
          disabled={selectedIds.size === 0}
          className={`px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors ${
            selectedIds.size === 0
              ? "bg-gray-100 text-gray-400 border-gray-200"
              : "bg-red-600 text-white border-red-600 hover:bg-red-700"
          }`}
        >
          Verwijder ({selectedIds.size})
        </button>
      </div>

      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-gray-500 uppercase">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5"
                  aria-label="Selecteer alles"
                />
              </th>
              <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-gray-500 uppercase">ID</th>
              <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-gray-500 uppercase">Klant</th>
              <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-gray-500 uppercase">Apparaat</th>
              <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-gray-500 uppercase">Datum</th>
              <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-3 py-1.5 text-right text-[11px] font-semibold text-gray-500 uppercase">Actie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                onClick={() => router.push(`/apk/${job.id}`)}
              >
                <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(job.id)}
                    onChange={() => toggleSelect(job.id)}
                    className="w-3.5 h-3.5"
                    aria-label={`Selecteer ${job.job_id}`}
                  />
                </td>
                <td className="px-3 py-1.5 font-mono text-xs text-gray-400">#{job.job_id}</td>
                <td className="px-3 py-1.5 text-sm text-gray-900 font-medium">{job.customer_name}</td>
                <td className="px-3 py-1.5 text-sm text-gray-700">{job.device_brand} {job.device_model}</td>
                <td className="px-3 py-1.5 text-xs text-gray-500">{formatDate(job.created_at)}</td>
                <td className="px-3 py-1.5">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                    job.status === "Ingeboekt"
                      ? "bg-blue-100 text-blue-700"
                      : job.status === "Bezig"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/apk/${job.id}/print`}
                      className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      title="Label printen"
                    >
                      <Printer className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteJob(job.id, job.job_id)}
                      className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="lg:hidden divide-y divide-gray-100">
        {jobs.map((job) => (
          <div
            key={job.id}
            onClick={() => router.push(`/apk/${job.id}`)}
            className="p-3 hover:bg-blue-50/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(job.id)}
                  onChange={() => toggleSelect(job.id)}
                  className="w-3.5 h-3.5"
                />
                <span className="text-xs font-mono text-gray-400">#{job.job_id}</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded font-semibold text-[11px] ${
                job.status === "Ingeboekt"
                  ? "bg-blue-100 text-blue-700"
                  : job.status === "Bezig"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-green-100 text-green-700"
              }`}>
                {job.status}
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm text-gray-900">{job.customer_name}</p>
                <p className="text-xs text-gray-500">{job.device_brand} {job.device_model}</p>
              </div>
              <p className="text-[11px] text-gray-400">{formatDate(job.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
