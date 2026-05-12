"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RefurbishedLabel, { RefurbishedData } from "@/components/RefurbishedLabel";
import InventoryTable from "./InventoryTable";
import { LaptopSaleDialog } from "@/components/LaptopSaleDialog";
import { Home, Printer, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

// Direct Supabase client
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
};

type Laptop = {
  id: string;
  brand: string;
  model: string;
  cpu: string;
  ram: string;
  ssd: string;
  screen: string;
  graphics: string;
  ports: string[];
  os: string;
  price: string;
  status: string;
  created_at: string;
};

function InventoryPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'parts' | 'laptops'>('parts');
  const [scanInput, setScanInput] = useState("");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [parts, setParts] = useState<Part[]>([]);
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [loading, setLoading] = useState(true);
  const [printItem, setPrintItem] = useState<RefurbishedData | null>(null);
  const [selectedLaptopIds, setSelectedLaptopIds] = useState<Set<string>>(new Set());
  
  // Sale dialog state
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [selectedLaptopForSale, setSelectedLaptopForSale] = useState<Laptop | null>(null);

  const handleOpenSaleDialog = (laptop: Laptop, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLaptopForSale(laptop);
    setSaleDialogOpen(true);
  };

  const handleCloseSaleDialog = () => {
    setSaleDialogOpen(false);
    setSelectedLaptopForSale(null);
  };

  const handleSaleSuccess = () => {
    fetchLaptops();
  };

  // Fetch parts
  const fetchParts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("pulled_parts")
        .select("id, category, brand, model, specs, note, status, created_at")
        .neq("status", "Gebruikt")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        query = query.or(
          `category.ilike.%${term}%,specs.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%`
        );
      }

      const { data, error } = await query;
      if (error) {
        console.error("Parts query error:", error);
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

  // Fetch laptops
  const fetchLaptops = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("refurbished_stock")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        query = query.or(
          `brand.ilike.%${term}%,model.ilike.%${term}%,cpu.ilike.%${term}%`
        );
      }

      const { data, error } = await query;
      if (error) {
        console.error("Laptops query error:", error);
        setLaptops([]);
      } else {
        setLaptops((data || []) as Laptop[]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setLaptops([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load: fetch both to get accurate counts
  useEffect(() => {
    const loadBoth = async () => {
      setLoading(true);
      try {
        // Fetch parts
        const { data: partsData } = await supabase
          .from("pulled_parts")
          .select("id, category, brand, model, specs, note, status, created_at")
          .neq("status", "Gebruikt")
          .order("created_at", { ascending: false });
        setParts((partsData || []) as Part[]);

        // Fetch laptops
        const { data: laptopsData } = await supabase
          .from("refurbished_stock")
          .select("*")
          .order("created_at", { ascending: false });
        setLaptops((laptopsData || []) as Laptop[]);
      } catch (err) {
        console.error("Initial load error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadBoth();
  }, []);

  // Fetch data when tab or search term changes (for search filtering)
  useEffect(() => {
    if (!searchTerm) return; // Skip if no search term, initial load handles it
    if (activeTab === 'parts') {
      fetchParts();
    } else {
      fetchLaptops();
    }
  }, [activeTab, searchTerm]);

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = scanInput.trim().toUpperCase();

      if (value.startsWith("P")) {
        console.log("🔍 Detected Part ID:", value);
        router.push(`/parts/${value}`);
      } else {
        console.log("🔍 Searching for:", value);
        setSearchTerm(value);
        setScanInput("");
      }
    }
  };

  const handlePrintLabel = (laptop: Laptop) => {
    // Create label data from laptop
    const labelData: RefurbishedData = {
      brand: laptop.brand,
      model: laptop.model,
      cpu: laptop.cpu,
      ram: laptop.ram,
      ssd: laptop.ssd,
      screen: laptop.screen,
      graphics: laptop.graphics,
      ports: laptop.ports || [],
      os: laptop.os,
      price: laptop.price,
    };
    
    setPrintItem(labelData);
    
    // Trigger print after a short delay to ensure render
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDeleteLaptop = async (laptop: Laptop) => {
    const confirmed = window.confirm(
      `Weet je zeker dat je laptop ${laptop.brand} ${laptop.model} wilt verwijderen?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/refurbished?id=${encodeURIComponent(laptop.id)}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Verwijderen mislukt");
        return;
      }

      toast.success("Laptop verwijderd");
      fetchLaptops();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Verwijderen mislukt");
    }
  };

  const toggleSelectLaptop = (id: string) => {
    setSelectedLaptopIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllLaptops = () => {
    setSelectedLaptopIds((prev) => {
      if (laptops.length === 0) return prev;
      if (prev.size === laptops.length) return new Set();
      return new Set(laptops.map((l) => l.id));
    });
  };

  const handleDeleteSelectedLaptops = async () => {
    if (selectedLaptopIds.size === 0) return;
    const confirmed = window.confirm(
      `Weet je zeker dat je ${selectedLaptopIds.size} laptop(s) wilt verwijderen?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/refurbished", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedLaptopIds) }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Verwijderen mislukt");
        return;
      }

      toast.success("Laptops verwijderd");
      setSelectedLaptopIds(new Set());
      fetchLaptops();
    } catch (err) {
      console.error("Bulk delete error:", err);
      toast.error("Verwijderen mislukt");
    }
  };

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page { margin: 0; size: auto; }
          body { padding: 0; margin: 0; background: white; }
        }
      `}</style>

      {/* Hidden Label for Print */}
      <div className="hidden print:block print:fixed print:top-0 print:left-0 print:w-[62mm] print:h-auto print:z-50 print:m-0 print:p-0 print:bg-white">
        {printItem && <RefurbishedLabel data={printItem} />}
      </div>

      {/* Main Content (Hidden on Print) */}
      <div className="min-h-screen bg-gray-50 p-3 sm:p-4 print:hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-gray-900">📦 Voorraad</h1>
          <p className="text-gray-600 mt-0.5 text-xs sm:text-sm">Goederen management</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => router.push("/")}
            className="bg-white border-2 border-gray-400 hover:bg-gray-100 text-gray-700 font-bold py-2 px-3 sm:py-3 sm:px-6 rounded-lg text-sm sm:text-lg transition-colors inline-flex items-center gap-2"
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5" />
            Dashboard
          </button>
          <button
            onClick={() => router.push("/parts/used")}
            className="bg-white border-2 border-gray-400 hover:bg-gray-100 text-gray-700 font-bold py-2 px-3 sm:py-3 sm:px-6 rounded-lg text-sm sm:text-lg transition-colors"
          >
            📂 Archief
          </button>
          <button
            onClick={() => router.push(activeTab === 'parts' ? '/parts' : '/refurbished')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 sm:py-3 sm:px-6 rounded-lg text-sm sm:text-lg transition-colors"
          >
            ➕ Nieuw {activeTab === 'parts' ? 'Onderdeel' : 'Laptop'}
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="mb-6 flex gap-2 sm:gap-4 border-b-2 border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('parts')}
          className={`px-3 sm:px-6 py-2.5 sm:py-4 text-sm sm:text-lg font-semibold transition-all whitespace-nowrap ${
            activeTab === 'parts'
              ? 'bg-blue-600 text-white rounded-t-lg border-2 border-b-0 border-blue-600'
              : 'text-gray-600 hover:text-gray-900 border-2 border-transparent'
          }`}
        >
          🧩 Onderdelen ({parts.length})
        </button>
        <button
          onClick={() => setActiveTab('laptops')}
          className={`px-3 sm:px-6 py-2.5 sm:py-4 text-sm sm:text-lg font-semibold transition-all whitespace-nowrap ${
            activeTab === 'laptops'
              ? 'bg-indigo-600 text-white rounded-t-lg border-2 border-b-0 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900 border-2 border-transparent'
          }`}
        >
          💻 Refurbished ({laptops.length})
        </button>
      </div>

      {/* Scan/Search Bar */}
      <Card className="mb-6 border-2 border-blue-400 shadow-lg">
        <CardContent className="pt-6">
          <input
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={handleScanKeyDown}
            placeholder={`🔍 Scan barcode of zoek ${activeTab === 'parts' ? 'onderdelen' : 'laptops'}...`}
            className="w-full h-12 sm:h-16 px-4 sm:px-6 border-2 border-gray-300 rounded-lg text-lg sm:text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            autoFocus
          />
          <p className="text-sm text-gray-500 mt-3">
            💡 {activeTab === 'parts' 
              ? 'Scan een barcode (P123456) om direct naar het onderdeel te gaan' 
              : 'Zoek op merk, model, of CPU'}
          </p>
        </CardContent>
      </Card>

      {/* Search Term Display */}
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

      {/* Results Table */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Resultaten ({activeTab === 'parts' ? parts.length : laptops.length})
            </h2>
            {activeTab === 'laptops' && (
              <button
                onClick={handleDeleteSelectedLaptops}
                disabled={selectedLaptopIds.size === 0}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  selectedLaptopIds.size === 0
                    ? "bg-gray-100 text-gray-400 border-gray-200"
                    : "bg-red-600 text-white border-red-600 hover:bg-red-700"
                }`}
              >
                Verwijder geselecteerde
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 text-center py-8">Laden...</p>
          ) : activeTab === 'parts' ? (
            parts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {searchTerm
                  ? `Geen onderdelen gevonden voor "${searchTerm}".`
                  : "Geen onderdelen gevonden in voorraad."}
              </p>
            ) : (
              <InventoryTable parts={parts} />
            )
          ) : (
            laptops.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {searchTerm
                  ? `Geen laptops gevonden voor "${searchTerm}".`
                  : "Geen refurbished laptops gevonden in voorraad."}
              </p>
            ) : (
              <>
                {/* Mobile Card Layout for Laptops */}
                <div className="md:hidden space-y-2">
                  {laptops.map((laptop) => (
                    <div
                      key={laptop.id}
                      onClick={() => router.push(`/refurbished/${laptop.id}`)}
                      className="bg-white border rounded-xl p-3 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer active:bg-indigo-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedLaptopIds.has(laptop.id)}
                            onChange={() => toggleSelectLaptop(laptop.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded"
                          />
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            laptop.status === 'Verkocht' 
                              ? 'bg-gray-200 text-gray-700' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {laptop.status || 'Beschikbaar'}
                          </span>
                        </div>
                        <span className="font-bold text-green-700 text-sm">€ {laptop.price}</span>
                      </div>
                      
                      <div className="mb-2">
                        <p className="font-bold text-gray-900">{laptop.brand} {laptop.model}</p>
                        <p className="text-xs text-gray-600">{laptop.cpu}</p>
                        <p className="text-xs text-gray-500">{laptop.ram} / {laptop.ssd}</p>
                      </div>

                      <div className="flex gap-2">
                        {laptop.status !== 'Verkocht' && (
                          <button
                            onClick={(e) => handleOpenSaleDialog(laptop, e)}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            Verkoop
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePrintLabel(laptop); }}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteLaptop(laptop); }}
                          className="bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table for Laptops */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="p-3 font-semibold">
                          <input
                            type="checkbox"
                            checked={laptops.length > 0 && selectedLaptopIds.size === laptops.length}
                            onChange={toggleSelectAllLaptops}
                            aria-label="Selecteer alles"
                          />
                        </th>
                        <th className="p-3 font-semibold">Merk</th>
                        <th className="p-3 font-semibold">Model</th>
                        <th className="p-3 font-semibold">CPU</th>
                        <th className="p-3 font-semibold">RAM/SSD</th>
                        <th className="p-3 font-semibold">Prijs</th>
                        <th className="p-3 font-semibold">Status</th>
                        <th className="p-3 font-semibold">Acties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {laptops.map((laptop) => (
                        <tr 
                          key={laptop.id} 
                          onClick={() => router.push(`/refurbished/${laptop.id}`)}
                          className="border-b border-gray-200 hover:bg-indigo-50 cursor-pointer transition-colors"
                        >
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedLaptopIds.has(laptop.id)}
                              onChange={() => toggleSelectLaptop(laptop.id)}
                              aria-label={`Selecteer ${laptop.brand} ${laptop.model}`}
                            />
                          </td>
                          <td className="p-3 font-medium">{laptop.brand}</td>
                          <td className="p-3">{laptop.model}</td>
                          <td className="p-3 text-sm">{laptop.cpu}</td>
                          <td className="p-3 text-sm">
                            {laptop.ram} / {laptop.ssd}
                          </td>
                          <td className="p-3 font-bold text-green-700">€ {laptop.price}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              laptop.status === 'Verkocht' 
                                ? 'bg-gray-200 text-gray-700' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {laptop.status || 'Beschikbaar'}
                            </span>
                          </td>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                              {laptop.status !== 'Verkocht' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenSaleDialog(laptop)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1"
                                >
                                  <ShoppingCart className="w-4 h-4" />
                                  Verkoop
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handlePrintLabel(laptop)}
                                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                              >
                                <Printer className="w-4 h-4" />
                                Print
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteLaptop(laptop)}
                                className="border-red-300 text-red-700 hover:bg-red-50 flex items-center gap-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )
          )}
        </CardContent>
      </Card>
      </div>

      {/* Laptop Sale Dialog */}
      <LaptopSaleDialog
        laptop={selectedLaptopForSale}
        isOpen={saleDialogOpen}
        onClose={handleCloseSaleDialog}
        onSuccess={handleSaleSuccess}
      />
    </>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Laden...</div>}>
      <InventoryPageClient />
    </Suspense>
  );
}
