"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  "Nieuw",
  "Besteld",
  "In reparatie",
  "Reparatie klaar",
  "Afgehaald",
];

interface DashboardFiltersProps {
  currentFilters: {
    status?: string;
    klant?: string;
    from?: string;
    to?: string;
    q?: string;
  };
}

export default function DashboardFilters({ currentFilters }: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`/dashboard?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pb-3 border-b">
      <Select
        onValueChange={(v) => updateFilter("status", v)}
        value={currentFilters.status || "all"}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle statussen</SelectItem>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Zoek klant..."
        defaultValue={currentFilters.klant || ""}
        onChange={(e) => updateFilter("klant", e.target.value)}
        className="h-9 text-sm"
      />

      <Input
        type="date"
        placeholder="Van datum"
        defaultValue={currentFilters.from || ""}
        onChange={(e) => updateFilter("from", e.target.value)}
        className="h-9 text-sm"
      />

      <Input
        type="date"
        placeholder="Tot datum"
        defaultValue={currentFilters.to || ""}
        onChange={(e) => updateFilter("to", e.target.value)}
        className="h-9 text-sm"
      />

      <Input
        placeholder="Zoeken..."
        defaultValue={currentFilters.q || ""}
        onChange={(e) => updateFilter("q", e.target.value)}
        className="h-9 text-sm sm:col-span-2 lg:col-span-1"
      />
    </div>
  );
}
