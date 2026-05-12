"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Search, X, Cpu, HardDrive, MemoryStick, Battery, Monitor,
  Keyboard, Wifi, Laptop, Package, ChevronRight, Tag, Calendar,
  Loader2, ShoppingBag, ArrowLeft
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type StockTab = "parts" | "devices";

type Part = {
  id: string;
  short_id?: string;
  category: string;
  brand: string;
  model: string;
  specs: string;
  note?: string;
  quantity: number;
  status: string;
  created_at: string;
  serial_number?: string;
};

type Device = {
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
  origin: string;
  status: string;
  created_at: string;
};

const PART_CATEGORIES = [
  { key: "all", label: "Alles", icon: Package },
  { key: "RAM", label: "RAM", icon: MemoryStick },
  { key: "SSD", label: "SSD", icon: HardDrive },
  { key: "HDD", label: "HDD", icon: HardDrive },
  { key: "CPU", label: "CPU", icon: Cpu },
  { key: "GPU", label: "GPU", icon: Monitor },
  { key: "Battery", label: "Accu", icon: Battery },
  { key: "Screen", label: "Scherm", icon: Monitor },
  { key: "Keyboard", label: "Toetsenbord", icon: Keyboard },
  { key: "WiFi", label: "WiFi", icon: Wifi },
  { key: "Adapter", label: "Adapter", icon: Package },
  { key: "Motherboard", label: "Moederbord", icon: Cpu },
];

const STATUS_COLORS: Record<string, string> = {
  "Op Voorraad": "bg-green-100 text-green-800",
  "Te Koop": "bg-green-100 text-green-800",
  "Nog Testen": "bg-yellow-100 text-yellow-800",
  "In Behandeling": "bg-blue-100 text-blue-800",
  "Wacht op Onderdelen": "bg-orange-100 text-orange-800",
  "Verkocht": "bg-gray-100 text-gray-600",
};

const ORIGIN_LABELS: Record<string, string> = {
  "donatie": "🎁 Donatie",
  "inkoop": "💰 Ingekocht",
  "interne_refurb": "🔧 Intern",
};

export default function StockBrowser() {
  const [tab, setTab] = useState<StockTab>("parts");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [parts, setParts] = useState<Part[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const fetchParts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("pulled_parts")
        .select("id, short_id, category, brand, model, specs, note, quantity, status, created_at, serial_number")
        .neq("status", "Gebruikt")
        .order("created_at", { ascending: false });

      if (search) {
        const term = search.toLowerCase();
        query = query.or(`category.ilike.%${term}%,specs.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%`);
      }
      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      const { data, error } = await query;
      if (error) console.error("Parts error:", error);
      setParts((data || []) as Part[]);
    } catch (err) {
      console.error("Parts fetch error:", err);
      setParts([]);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("refurbished_stock")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        const term = search.toLowerCase();
        query = query.or(`brand.ilike.%${term}%,model.ilike.%${term}%,cpu.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) console.error("Devices error:", error);
      setDevices((data || []) as Device[]);
    } catch (err) {
      console.error("Devices fetch error:", err);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (tab === "parts") fetchParts();
    else fetchDevices();
  }, [tab, fetchParts, fetchDevices]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short" });

  const formatPrice = (v: string | number) => {
    const n = typeof v === "string" ? parseFloat(v) : v;
    if (isNaN(n) || n === 0) return null;
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
  };

  // Detail views
  if (selectedPart) {
    return (
      <div className="max-w-3xl">
        <button
          onClick={() => setSelectedPart(null)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Terug naar voorraad
        </button>
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-blue-100 text-xs font-medium">Onderdeel</p>
                <h2 className="text-xl font-black text-white">{selectedPart.category}</h2>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <DetailRow label="ID" value={selectedPart.short_id || selectedPart.id.slice(0, 8)} />
              <DetailRow label="Status" value={
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[selectedPart.status] || "bg-gray-100 text-gray-600"}`}>
                  {selectedPart.status}
                </span>
              } />
              <DetailRow label="Categorie" value={selectedPart.category} />
              <DetailRow label="Aantal" value={String(selectedPart.quantity || 1)} />
              <DetailRow label="Herkomst" value={`${selectedPart.brand || "?"} ${selectedPart.model || ""}`} />
              <DetailRow label="Datum" value={formatDate(selectedPart.created_at)} />
            </div>

            {selectedPart.specs && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Specificaties</p>
                <p className="text-sm font-semibold text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{selectedPart.specs}</p>
              </div>
            )}
            {selectedPart.serial_number && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Serienummer</p>
                <p className="text-sm font-mono text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">{selectedPart.serial_number}</p>
              </div>
            )}
            {selectedPart.note && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Notitie</p>
                <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">{selectedPart.note}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selectedDevice) {
    const price = formatPrice(selectedDevice.price);
    return (
      <div className="max-w-3xl">
        <button
          onClick={() => setSelectedDevice(null)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Terug naar voorraad
        </button>
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Laptop className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-purple-100 text-xs font-medium">{ORIGIN_LABELS[selectedDevice.origin] || selectedDevice.origin}</p>
                  <h2 className="text-xl font-black text-white">{selectedDevice.brand} {selectedDevice.model}</h2>
                </div>
              </div>
              {price && (
                <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2">
                  <p className="text-2xl font-black text-white">{price}</p>
                </div>
              )}
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <DetailRow label="Status" value={
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[selectedDevice.status] || "bg-gray-100 text-gray-600"}`}>
                  {selectedDevice.status}
                </span>
              } />
              <DetailRow label="Datum" value={formatDate(selectedDevice.created_at)} />
              {selectedDevice.cpu && <DetailRow label="Processor" value={selectedDevice.cpu} />}
              {selectedDevice.ram && <DetailRow label="RAM" value={selectedDevice.ram} />}
              {selectedDevice.ssd && <DetailRow label="Opslag" value={selectedDevice.ssd} />}
              {selectedDevice.screen && <DetailRow label="Scherm" value={selectedDevice.screen} />}
              {selectedDevice.graphics && <DetailRow label="Grafisch" value={selectedDevice.graphics} />}
              {selectedDevice.os && <DetailRow label="OS" value={selectedDevice.os} />}
            </div>
            {selectedDevice.ports?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Poorten</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDevice.ports.map((p, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main browser view
  return (
    <div>
      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-shrink-0">
          <button
            onClick={() => { setTab("parts"); setSearch(""); setCategoryFilter("all"); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              tab === "parts" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Package className="h-4 w-4" /> Onderdelen
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${tab === "parts" ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500"}`}>
              {parts.length}
            </span>
          </button>
          <button
            onClick={() => { setTab("devices"); setSearch(""); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              tab === "devices" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Laptop className="h-4 w-4" /> Apparaten
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${tab === "devices" ? "bg-purple-100 text-purple-700" : "bg-gray-200 text-gray-500"}`}>
              {devices.length}
            </span>
          </button>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "parts" ? "Zoek onderdeel..." : "Zoek apparaat..."}
            className="w-full pl-9 pr-8 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Category filter (parts only) */}
      {tab === "parts" && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {PART_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                categoryFilter === cat.key
                  ? "bg-blue-600 text-white"
                  : "bg-white border text-gray-600 hover:border-blue-300 hover:text-blue-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Parts grid */}
      {!loading && tab === "parts" && (
        <>
          {parts.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-medium text-sm">Geen onderdelen gevonden</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {parts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPart(p)}
                  className="bg-white rounded-xl border p-3 text-left hover:ring-2 hover:ring-blue-200 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <PartIcon category={p.category} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{p.category}</p>
                        <p className="text-[10px] text-gray-500 truncate">{p.brand} {p.model}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-1 transition-colors" />
                  </div>
                  {p.specs && (
                    <p className="text-xs text-gray-700 mt-2 bg-gray-50 px-2 py-1 rounded truncate">{p.specs}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-600"}`}>
                      {p.status}
                    </span>
                    <span className="text-[10px] text-gray-400">{formatDate(p.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Devices grid */}
      {!loading && tab === "devices" && (
        <>
          {devices.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <Laptop className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-medium text-sm">Geen apparaten gevonden</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {devices.map((d) => {
                const price = formatPrice(d.price);
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDevice(d)}
                    className="bg-white rounded-xl border p-4 text-left hover:ring-2 hover:ring-purple-200 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                          <Laptop className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900">{d.brand} {d.model}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {[d.cpu, d.ram, d.ssd].filter(Boolean).join(" • ")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {price && (
                          <p className="text-base font-black text-purple-700">{price}</p>
                        )}
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-purple-500 ml-auto transition-colors" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[d.status] || "bg-gray-100 text-gray-600"}`}>
                          {d.status}
                        </span>
                        {d.origin && (
                          <span className="text-[10px] text-gray-500">{ORIGIN_LABELS[d.origin] || d.origin}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">{formatDate(d.created_at)}</span>
                    </div>
                    {/* Quick specs */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {d.screen && <SpecBadge label={d.screen} />}
                      {d.os && <SpecBadge label={d.os} />}
                      {d.graphics && d.graphics !== "Geïntegreerd" && <SpecBadge label={d.graphics} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Helpers ──────────────────────────────── */

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <div className="text-sm font-semibold text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}

function SpecBadge({ label }: { label: string }) {
  return (
    <span className="px-1.5 py-0.5 bg-gray-50 border text-gray-600 rounded text-[10px]">{label}</span>
  );
}

function PartIcon({ category }: { category: string }) {
  const c = category.toLowerCase();
  if (c.includes("ram") || c.includes("memory")) return <MemoryStick className="h-4 w-4 text-blue-600" />;
  if (c.includes("ssd") || c.includes("hdd") || c.includes("storage")) return <HardDrive className="h-4 w-4 text-blue-600" />;
  if (c.includes("cpu") || c.includes("processor")) return <Cpu className="h-4 w-4 text-blue-600" />;
  if (c.includes("gpu") || c.includes("graphic")) return <Monitor className="h-4 w-4 text-blue-600" />;
  if (c.includes("battery") || c.includes("accu")) return <Battery className="h-4 w-4 text-blue-600" />;
  if (c.includes("screen") || c.includes("scherm") || c.includes("display")) return <Monitor className="h-4 w-4 text-blue-600" />;
  if (c.includes("keyboard") || c.includes("toetsenbord")) return <Keyboard className="h-4 w-4 text-blue-600" />;
  if (c.includes("wifi") || c.includes("wireless")) return <Wifi className="h-4 w-4 text-blue-600" />;
  return <Package className="h-4 w-4 text-blue-600" />;
}
