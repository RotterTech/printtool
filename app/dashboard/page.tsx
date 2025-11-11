"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import Link from "next/link";

type Repair = {
  id: string;
  jobId: string;
  klant: string;
  email?: string;
  telefoon?: string;
  merk?: string;
  model?: string;
  omschrijving?: string;
  status: string;
  onderdeel_besteld: boolean;
  onderdeel_naam?: string;
  datum_in: string;
  datum_uit?: string;
};

const STATUS_OPTIONS = [
  "Ingeboekt",
  "Onderweg",
  "Besteld",
  "Reparatie klaar",
  "Afgehaald",
];

export default function DashboardPage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "all",
    klant: "",
    from: "",
    to: "",
    q: "",
  });

  useEffect(() => {
    loadRepairs();
  }, [filters]);

  const loadRepairs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== "all") params.append("status", filters.status);
      if (filters.klant) params.append("klant", filters.klant);
      if (filters.from) params.append("from", filters.from);
      if (filters.to) params.append("to", filters.to);
      if (filters.q) params.append("q", filters.q);

      const res = await fetch(`/api/repairs?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setRepairs(json.data || []);
      }
    } catch (e) {
      console.error("Error loading repairs:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Ingeboekt: "bg-blue-100 text-blue-800",
      Onderweg: "bg-yellow-100 text-yellow-800",
      Besteld: "bg-purple-100 text-purple-800",
      "Reparatie klaar": "bg-green-100 text-green-800",
      Afgehaald: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Navigation */}
      <div className="mb-6 flex gap-2 justify-end">
        <Link href="/" prefetch={false} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50">
          <span>📦</span> Inboeken
        </Link>
        <Link href="/uitboeken" prefetch={false} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50">
          <span>🧾</span> Uitboeken
        </Link>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <h1 className="text-2xl font-bold">📊 Dashboard</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pb-4 border-b">
            <Select
              onValueChange={(v) => handleFilterChange("status", v)}
              value={filters.status}
            >
              <SelectTrigger>
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
              value={filters.klant}
              onChange={(e) => handleFilterChange("klant", e.target.value)}
            />

            <Input
              type="date"
              placeholder="Van datum"
              value={filters.from}
              onChange={(e) => handleFilterChange("from", e.target.value)}
            />

            <Input
              type="date"
              placeholder="Tot datum"
              value={filters.to}
              onChange={(e) => handleFilterChange("to", e.target.value)}
            />

            <Input
              placeholder="Zoeken..."
              value={filters.q}
              onChange={(e) => handleFilterChange("q", e.target.value)}
            />
          </div>

          {/* Results */}
          {loading ? (
            <p>Laden...</p>
          ) : repairs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Geen reparaties gevonden</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Job ID</th>
                    <th className="text-left p-2">Klant</th>
                    <th className="text-left p-2">Apparaat</th>
                    <th className="text-left p-2">Omschrijving</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Datum in</th>
                    <th className="text-left p-2">Datum uit</th>
                  </tr>
                </thead>
                <tbody>
                  {repairs.map((repair) => (
                    <tr key={repair.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-mono">{repair.jobId}</td>
                      <td className="p-2">{repair.klant}</td>
                      <td className="p-2">
                        {repair.merk} {repair.model}
                      </td>
                      <td className="p-2">{repair.omschrijving || "—"}</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${getStatusColor(
                            repair.status
                          )}`}
                        >
                          {repair.status}
                        </span>
                      </td>
                      <td className="p-2">
                        {new Date(repair.datum_in).toLocaleDateString("nl-NL")}
                      </td>
                      <td className="p-2">
                        {repair.datum_uit
                          ? new Date(repair.datum_uit).toLocaleDateString("nl-NL")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-sm text-gray-500 pt-4 border-t">
            Totaal: {repairs.length} reparatie(s)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

