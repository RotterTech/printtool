import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DashboardFilters from "./DashboardFilters";
import DashboardTable from "./DashboardTable";
import DashboardApkTable from "./DashboardApkTable";
import { Wrench, Clock, CheckCircle2, Package, AlertTriangle } from "lucide-react";

// Direct Supabase client for server-side queries
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Repair = {
  id: string;
  job_id: string;
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

type ApkJob = {
  id: string;
  job_id: string;
  customer_name: string;
  device_brand: string;
  device_model: string;
  created_at: string;
  status: "Ingeboekt" | "Bezig" | "Klaar";
};

interface DashboardPageProps {
  searchParams: Promise<{
    status?: string;
    klant?: string;
    from?: string;
    to?: string;
    q?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;

  // 1. Build repairs query with filters
  let repairsQuery = supabase
    .from("repairs")
    .select("id, job_id, customer_name, customer_email, customer_phone, device_brand, device_model, serial_number, problem_description, status, created_at, agreed_price")
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    repairsQuery = repairsQuery.eq("status", params.status);
  }
  if (params.klant) {
    repairsQuery = repairsQuery.ilike("customer_name", `%${params.klant}%`);
  }
  if (params.from) {
    repairsQuery = repairsQuery.gte("created_at", params.from);
  }
  if (params.to) {
    repairsQuery = repairsQuery.lte("created_at", params.to);
  }
  if (params.q) {
    repairsQuery = repairsQuery.or(
      `customer_name.ilike.%${params.q}%,device_brand.ilike.%${params.q}%,device_model.ilike.%${params.q}%,serial_number.ilike.%${params.q}%,job_id.ilike.%${params.q}%`
    );
  }

  // 2. APK query
  const apkQuery = supabase
    .from("apk_maintenance")
    .select("id, job_id, customer_name, device_brand, device_model, created_at, status")
    .order("created_at", { ascending: false });

  // 3. Stats queries (counts per status)
  const statsQueries = {
    nieuw: supabase.from("repairs").select("*", { count: "exact", head: true }).eq("status", "Nieuw"),
    besteld: supabase.from("repairs").select("*", { count: "exact", head: true }).eq("status", "Besteld"),
    klaar: supabase.from("repairs").select("*", { count: "exact", head: true }).eq("status", "Reparatie klaar"),
    partsStock: supabase.from("pulled_parts").select("*", { count: "exact", head: true }).eq("status", "Op Voorraad"),
  };

  // 4. Fetch all in parallel
  const [repairsResult, apkResult, nieuwResult, besteldResult, klaarResult, partsResult] = await Promise.all([
    repairsQuery,
    apkQuery,
    statsQueries.nieuw,
    statsQueries.besteld,
    statsQueries.klaar,
    statsQueries.partsStock,
  ]);

  const repairs = repairsResult.data || [];
  const repairsError = repairsResult.error;
  const apkData = apkResult.data || [];
  const apkError = apkResult.error;
  const error = repairsError || apkError;

  const repairList = repairs || [];
  const apkList: ApkJob[] = (apkData as ApkJob[]) || [];

  // Stats
  const stats = {
    nieuw: nieuwResult.count || 0,
    besteld: besteldResult.count || 0,
    klaar: klaarResult.count || 0,
    partsStock: partsResult.count || 0,
  };

  const activeView = (params as any)?.view === "apk" ? "apk" : "repairs";

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-3 md:p-4">
      {/* Compact Navigation */}
      <div className="mb-2 sm:mb-3 flex gap-2 justify-between items-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm hover:bg-gray-100 font-medium"
        >
          ← Terug
        </Link>
        <div className="flex gap-2">
          <Link
            href="/inboeken"
            prefetch={false}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50 font-medium"
          >
            📦 Inboeken
          </Link>
          <Link
            href="/uitboeken"
            prefetch={false}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50 font-medium"
          >
            🧾 Uitboeken
          </Link>
        </div>
      </div>

      {/* Dynamic Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="bg-white rounded-lg border p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.nieuw}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Nieuw</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-purple-50 rounded-lg">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.besteld}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Besteld</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-green-50 rounded-lg">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.klaar}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Klaar voor ophalen</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-orange-50 rounded-lg">
            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.partsStock}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Onderdelen op voorraad</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg border shadow-sm">
        {/* Header + Tabs */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            <span className="text-sm text-gray-500">
              {repairList.length} reparatie{repairList.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-end border-b border-gray-200 -mb-3">
            {([
              { key: "repairs", label: "Reparaties" },
              { key: "apk", label: "APK / Onderhoud" },
            ] as const).map((tab) => (
              <Link
                key={tab.key}
                href={tab.key === "repairs" ? "/dashboard" : "/dashboard?view=apk"}
                className={`relative px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-t border-l border-r ${
                  activeView === tab.key
                    ? "bg-white border-gray-200 text-slate-900 -mb-px z-10"
                    : "bg-gray-50 border-transparent text-slate-500 hover:bg-gray-100 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="p-2 sm:p-4 space-y-2 sm:space-y-3">
          {/* Filters */}
          <DashboardFilters currentFilters={params} />

          {/* Results */}
          {error ? (
            <p className="text-red-500 text-center py-4 text-sm">
              Fout bij laden: {error.message}
            </p>
          ) : activeView === "repairs" ? (
            repairList.length === 0 ? (
              <p className="text-gray-500 text-center py-6 text-sm">
                Geen reparaties gevonden
              </p>
            ) : (
              <DashboardTable repairs={repairList} />
            )
          ) : apkError ? (
            <p className="text-red-500 text-center py-4 text-sm">Fout bij laden APK: {String(apkError)}</p>
          ) : apkList.length === 0 ? (
            <p className="text-gray-500 text-center py-6 text-sm">Geen APK onderhoudsjobs gevonden</p>
          ) : (
            <DashboardApkTable jobs={apkList} />
          )}
        </div>
      </div>
    </div>
  );
}


