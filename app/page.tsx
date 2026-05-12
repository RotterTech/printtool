import Link from "next/link";
import { Wrench, Cpu, Laptop, Plus, Package, LogOut, Clock, CheckCircle2, AlertTriangle, ClipboardList } from "lucide-react";
import { APP_CONFIG } from "@/lib/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Fetch dashboard counts in parallel
async function getDashboardCounts() {
  try {
    const [
      repairResult, nieuwResult, besteldResult, inReparatieResult, klaarResult,
      partResult, laptopResult
    ] = await Promise.all([
      supabase
        .from("repairs")
        .select("*", { count: "exact", head: true })
        .not("status", "in", '("Afgerond","Opgehaald","Afgehaald")'),
      supabase
        .from("repairs")
        .select("*", { count: "exact", head: true })
        .eq("status", "Nieuw"),
      supabase
        .from("repairs")
        .select("*", { count: "exact", head: true })
        .eq("status", "Besteld"),
      supabase
        .from("repairs")
        .select("*", { count: "exact", head: true })
        .eq("status", "In reparatie"),
      supabase
        .from("repairs")
        .select("*", { count: "exact", head: true })
        .eq("status", "Reparatie klaar"),
      supabase
        .from("pulled_parts")
        .select("*", { count: "exact", head: true })
        .eq("status", "Op Voorraad"),
      supabase
        .from("refurbished_stock")
        .select("*", { count: "exact", head: true })
        .eq("status", "Te Koop"),
    ]);

    return {
      repairCount: repairResult.count || 0,
      nieuwCount: nieuwResult.count || 0,
      besteldCount: besteldResult.count || 0,
      inReparatieCount: inReparatieResult.count || 0,
      klaarCount: klaarResult.count || 0,
      partCount: partResult.count || 0,
      laptopCount: laptopResult.count || 0,
    };
  } catch (error) {
    console.error("Error fetching dashboard counts:", error);
    return { repairCount: 0, nieuwCount: 0, besteldCount: 0, inReparatieCount: 0, klaarCount: 0, partCount: 0, laptopCount: 0 };
  }
}

export default async function HomePage() {
  const { repairCount, nieuwCount, besteldCount, inReparatieCount, klaarCount, partCount, laptopCount } = await getDashboardCounts();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-5">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
            🔧 {APP_CONFIG.COMPANY_NAME}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
            {APP_CONFIG.HEADER_TITLE}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Stats Grid */}
        <h2 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 sm:mb-3">
          Overzicht
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <Link href="/dashboard">
            <div className="bg-white rounded-lg border p-2.5 sm:p-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg">
                  <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{repairCount}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Actief</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard?status=Nieuw">
            <div className="bg-white rounded-lg border p-2.5 sm:p-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-sky-50 rounded-lg">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{nieuwCount}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Nieuw</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard?status=Besteld">
            <div className="bg-white rounded-lg border p-2.5 sm:p-4 hover:shadow-md hover:border-purple-200 transition-all cursor-pointer">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-orange-50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{besteldCount}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Besteld</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href={`/dashboard?status=${encodeURIComponent('In reparatie')}`}>
            <div className="bg-white rounded-lg border p-2.5 sm:p-4 hover:shadow-md hover:border-yellow-200 transition-all cursor-pointer">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-yellow-50 rounded-lg">
                  <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{inReparatieCount}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">In reparatie</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href={`/dashboard?status=${encodeURIComponent('Reparatie klaar')}`}>
            <div className="bg-white rounded-lg border p-2.5 sm:p-4 hover:shadow-md hover:border-green-200 transition-all cursor-pointer">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-green-50 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{klaarCount}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Klaar</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/parts/inventory">
            <div className="bg-white rounded-lg border p-2.5 sm:p-4 hover:shadow-md hover:border-orange-200 transition-all cursor-pointer">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-orange-50 rounded-lg">
                  <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{partCount}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Onderdelen</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/refurbished">
            <div className="bg-white rounded-lg border p-2.5 sm:p-4 hover:shadow-md hover:border-purple-200 transition-all cursor-pointer">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-violet-50 rounded-lg">
                  <Laptop className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{laptopCount}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Showroom</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions Row */}
        <h2 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 sm:mb-3">
          Snelle Acties
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <Link href="/inboeken">
            <div className="bg-white rounded-lg border p-3 sm:p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer h-full">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-2.5 bg-blue-50 rounded-lg">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                    Nieuwe Reparatie
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-500">
                    Klant & Apparaat registreren
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/parts/inventory">
            <div className="bg-white rounded-lg border p-3 sm:p-5 hover:shadow-md hover:border-orange-200 transition-all cursor-pointer h-full">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-2.5 bg-orange-50 rounded-lg">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                    Voorraad Beheer
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-500">
                    Onderdelen & Laptops
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/uitboeken">
            <div className="bg-white rounded-lg border p-3 sm:p-5 hover:shadow-md hover:border-green-200 transition-all cursor-pointer h-full">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-2.5 bg-green-50 rounded-lg">
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                    Uitboeken
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-500">
                    Afrekenen & Bon printen
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Alle Reparaties Card */}
        <div className="mt-4 sm:mt-6">
          <Link href="/dashboard">
            <div className="bg-slate-900 text-white rounded-lg p-3.5 sm:p-5 hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-2.5 bg-white/10 rounded-lg">
                  <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold">Alle Reparaties Bekijken</h3>
                  <p className="text-[10px] sm:text-xs text-slate-300">Volledig overzicht met filters</p>
                </div>
              </div>
              <span className="text-lg font-bold">{repairCount} →</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

