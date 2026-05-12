"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Filter, Search, X, Calendar } from "lucide-react";

const ACTION_OPTIONS = [
  { value: "", label: "Alle acties" },
  { value: "CREATE", label: "Aangemaakt" },
  { value: "UPDATE", label: "Bijgewerkt" },
  { value: "DELETE", label: "Verwijderd" },
  { value: "PRINT", label: "Geprint" },
  { value: "LOGIN", label: "Ingelogd" },
];

const ENTITY_OPTIONS = [
  { value: "", label: "Alle types" },
  { value: "REPAIR", label: "Reparatie" },
  { value: "REPAIR_LABEL", label: "Reparatie Label" },
  { value: "PART", label: "Onderdeel" },
  { value: "PART_LABEL", label: "Onderdeel Label" },
  { value: "TEAM", label: "Team" },
  { value: "APK", label: "APK" },
  { value: "REFURBISHED", label: "Refurbished" },
  { value: "CUSTOMER", label: "Klant" },
];

const DATE_OPTIONS = [
  { value: "", label: "Alle periodes" },
  { value: "today", label: "Vandaag" },
  { value: "yesterday", label: "Gisteren" },
  { value: "7days", label: "Afgelopen 7 dagen" },
  { value: "30days", label: "Afgelopen 30 dagen" },
  { value: "custom", label: "Kies datum..." },
];

interface OverzichtFiltersProps {
  employees?: { id: string; name: string }[];
}

export default function OverzichtFilters({ employees = [] }: OverzichtFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentAction = searchParams.get("action") || "";
  const currentEntity = searchParams.get("entity") || "";
  const currentDate = searchParams.get("date") || "";
  const currentSearch = searchParams.get("q") || "";
  const currentEmployee = searchParams.get("employee") || "";
  const currentFrom = searchParams.get("from") || "";
  const currentTo = searchParams.get("to") || "";

  const hasFilters = currentAction || currentEntity || currentDate || currentSearch || currentEmployee || currentFrom;

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Clear custom date fields when switching to preset
      if (key === "date" && value !== "custom") {
        params.delete("from");
        params.delete("to");
      }
      params.delete("page");
      router.push(`/overzicht?${params.toString()}`);
    },
    [router, searchParams]
  );

  const updateDateRange = useCallback(
    (from: string, to: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("date", "custom");
      if (from) params.set("from", from);
      else params.delete("from");
      if (to) params.set("to", to);
      else params.delete("to");
      params.delete("page");
      router.push(`/overzicht?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearAll = useCallback(() => {
    router.push("/overzicht");
  }, [router]);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700">
        <Filter className="w-4 h-4 text-gray-400" />
        Filters
        {hasFilters && (
          <button
            onClick={clearAll}
            className="ml-auto inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
          >
            <X className="w-3 h-3" /> Wis alles
          </button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Zoek op beschrijving, naam..."
            defaultValue={currentSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParam("q", (e.target as HTMLInputElement).value);
              }
            }}
            onBlur={(e) => {
              if (e.target.value !== currentSearch) {
                updateParam("q", e.target.value);
              }
            }}
            className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Employee filter */}
        {employees.length > 0 && (
          <select
            value={currentEmployee}
            onChange={(e) => updateParam("employee", e.target.value)}
            className="px-2.5 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle medewerkers</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        )}

        {/* Date filter */}
        <select
          value={currentDate}
          onChange={(e) => updateParam("date", e.target.value)}
          className="px-2.5 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Action filter */}
        <select
          value={currentAction}
          onChange={(e) => updateParam("action", e.target.value)}
          className="px-2.5 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Entity filter */}
        <select
          value={currentEntity}
          onChange={(e) => updateParam("entity", e.target.value)}
          className="px-2.5 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ENTITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom date range */}
      {currentDate === "custom" && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-1">
          <Calendar className="w-4 h-4 text-gray-400 hidden sm:block" />
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Van</label>
            <input
              type="date"
              value={currentFrom}
              onChange={(e) => updateDateRange(e.target.value, currentTo)}
              className="px-2.5 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Tot</label>
            <input
              type="date"
              value={currentTo}
              onChange={(e) => updateDateRange(currentFrom, e.target.value)}
              className="px-2.5 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
