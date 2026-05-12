"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import UsedPartsTable from "./UsedPartsTable";
import { useEffect } from "react";
import { ArrowLeft, Home } from "lucide-react";

// Direct Supabase client for server-side queries
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Part = {
  id: string;
  category: string;
  brand: string;
  model: string;
  specs: string;
  note?: string;
  status: string;
  created_at: string;
  used_by_client?: string;
  used_in_device?: string;
  used_date?: string;
};

function UsedPartsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scanInput, setScanInput] = useState("");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch used parts on mount and when searchTerm changes
  useEffect(() => {
    const fetchParts = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("pulled_parts")
          .select(
            "id, category, brand, model, specs, note, status, created_at, used_by_client, used_in_device, used_date"
          )
          .eq("status", "Gebruikt")
          .order("used_date", { ascending: false });

        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          query = query.or(
            `category.ilike.%${term}%,specs.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%,used_by_client.ilike.%${term}%`
          );
        }

        const { data, error } = await query;
        if (error) {
          console.error("Used parts query error:", error);
          setParts([]);
        } else {
          setParts((data || []) as Part[]);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setParts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParts();
  }, [searchTerm]);

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = scanInput.trim().toUpperCase();

      // Check if it looks like a Part ID (starts with "P")
      if (value.startsWith("P")) {
        console.log("🔍 Detected Part ID:", value);
        router.push(`/parts/${value}`);
      } else {
        // Otherwise, treat as search term
        console.log("🔍 Searching for:", value);
        setSearchTerm(value);
        setScanInput("");
      }
    }
  };

  const handleSearchFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(scanInput);
    setScanInput("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/parts/inventory">
              <button className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm">
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                Terug naar Voorraad
              </button>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">📦 Gebruikte Onderdelen</h1>
          <p className="text-gray-600 mt-1 text-sm">Overzicht van verbruikte componenten</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="bg-white border-2 border-gray-400 hover:bg-gray-100 text-gray-700 font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-lg text-sm sm:text-lg transition-colors inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <Home className="w-4 h-4 sm:w-5 sm:h-5" />
          Dashboard
        </button>
      </div>

      {/* Scan/Search Bar - Large Input */}
      <Card className="mb-6 border-2 border-blue-400 shadow-lg">
        <CardContent className="pt-6">
          <input
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={handleScanKeyDown}
            placeholder="🔍 Scan barcode of zoek..."
            className="w-full h-12 sm:h-16 px-4 sm:px-6 border-2 border-gray-300 rounded-lg text-lg sm:text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            autoFocus
          />
          <p className="text-sm text-gray-500 mt-3">
            💡 Scan een barcode (P123456) om direct naar het onderdeel te gaan, of typ zoektermen (klant, onderdeel, etc.)
          </p>
        </CardContent>
      </Card>

      {/* Search and Filter Card */}
      {searchTerm && (
        <Card className="mb-6 border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">
                Zoekresultaten voor: <span className="text-blue-600">"{searchTerm}"</span>
              </h2>
              <button
                onClick={() => setSearchTerm("")}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                ✕ Wissen
              </button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Results */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-800">
            Resultaten ({parts.length})
          </h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 text-center py-8">Laden...</p>
          ) : parts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {searchTerm
                ? `Geen gebruikte onderdelen gevonden voor "${searchTerm}".`
                : "Geen gebruikte onderdelen in archief."}
            </p>
          ) : (
            <UsedPartsTable parts={parts} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function UsedPartsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Laden...</div>}>
      <UsedPartsPageClient />
    </Suspense>
  );
}
