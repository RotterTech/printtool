"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { Archive, Wrench, ClipboardCheck, Search, Calendar, ChevronDown, ChevronUp } from "lucide-react";

interface ArchivedRepair {
  id: string;
  job_id: string;
  customer_name: string;
  device_brand: string;
  device_model: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ArchivedAPK {
  id: string;
  job_id: string;
  customer_name: string;
  device_brand: string;
  device_model: string;
  status: string;
  created_at: string;
  updated_at: string;
}

type TabType = "all" | "repairs" | "apk";

export default function ArchiefPage() {
  const [repairs, setRepairs] = useState<ArchivedRepair[]>([]);
  const [apkJobs, setApkJobs] = useState<ArchivedAPK[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchArchivedJobs();
  }, []);

  const fetchArchivedJobs = async () => {
    setLoading(true);
    try {
      // Fetch completed/picked up repairs
      const { data: repairsData } = await supabase
        .from("repairs")
        .select("id, job_id, customer_name, device_brand, device_model, status, created_at, updated_at")
        .in("status", ["Afgehaald", "Afgerond", "Opgehaald"])
        .order("updated_at", { ascending: false });

      // Fetch completed APK jobs
      const { data: apkData } = await supabase
        .from("apk_maintenance")
        .select("id, job_id, customer_name, device_brand, device_model, status, created_at, updated_at")
        .eq("status", "Klaar")
        .order("updated_at", { ascending: false });

      setRepairs(repairsData || []);
      setApkJobs(apkData || []);
    } catch (error) {
      console.error("Error fetching archived jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("nl-NL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Filter and sort items
  const filteredRepairs = repairs.filter((r) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      r.customer_name?.toLowerCase().includes(searchLower) ||
      r.job_id?.toLowerCase().includes(searchLower) ||
      r.device_brand?.toLowerCase().includes(searchLower) ||
      r.device_model?.toLowerCase().includes(searchLower)
    );
  });

  const filteredApkJobs = apkJobs.filter((a) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      a.customer_name?.toLowerCase().includes(searchLower) ||
      a.job_id?.toLowerCase().includes(searchLower) ||
      a.device_brand?.toLowerCase().includes(searchLower) ||
      a.device_model?.toLowerCase().includes(searchLower)
    );
  });

  // Sort
  const sortFn = (a: { updated_at: string }, b: { updated_at: string }) => {
    const dateA = new Date(a.updated_at).getTime();
    const dateB = new Date(b.updated_at).getTime();
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  };

  const sortedRepairs = [...filteredRepairs].sort(sortFn);
  const sortedApkJobs = [...filteredApkJobs].sort(sortFn);

  // Combine for "all" tab
  const allItems = [
    ...sortedRepairs.map((r) => ({ ...r, type: "repair" as const })),
    ...sortedApkJobs.map((a) => ({ ...a, type: "apk" as const })),
  ].sort(sortFn);

  const getStatusBadge = (status: string, type: "repair" | "apk") => {
    if (type === "apk") {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
          ✅ Klaar
        </span>
      );
    }
    // Repairs
    const colors: Record<string, string> = {
      Afgehaald: "bg-gray-100 text-gray-700",
      Afgerond: "bg-green-100 text-green-700",
      Opgehaald: "bg-gray-100 text-gray-700",
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || "bg-gray-100 text-gray-600"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Archive className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Archief</h1>
                <p className="text-sm text-gray-500">Afgeronde reparaties en APK's</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
            >
              ← Terug naar Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek op klant, job ID, apparaat..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Tabs and Sort */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                  activeTab === "all"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Alles ({allItems.length})
              </button>
              <button
                onClick={() => setActiveTab("repairs")}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 ${
                  activeTab === "repairs"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Wrench className="w-4 h-4" />
                Reparaties ({sortedRepairs.length})
              </button>
              <button
                onClick={() => setActiveTab("apk")}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 ${
                  activeTab === "apk"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <ClipboardCheck className="w-4 h-4" />
                APK ({sortedApkJobs.length})
              </button>
            </div>

            {/* Sort */}
            <button
              onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition"
            >
              <Calendar className="w-4 h-4" />
              {sortOrder === "newest" ? "Nieuwste eerst" : "Oudste eerst"}
              {sortOrder === "newest" ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-3 text-gray-500">Laden...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Show based on active tab */}
            {activeTab === "all" &&
              allItems.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.type === "repair" ? `/repairs/${item.id}` : `/apk/${item.id}`}
                  className="block bg-white rounded-xl border p-4 hover:shadow-md hover:border-indigo-300 transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          item.type === "repair" ? "bg-blue-100" : "bg-green-100"
                        }`}
                      >
                        {item.type === "repair" ? (
                          <Wrench className="w-5 h-5 text-blue-600" />
                        ) : (
                          <ClipboardCheck className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-gray-900">{item.job_id}</span>
                          {getStatusBadge(item.status, item.type)}
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${
                              item.type === "repair" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"
                            }`}
                          >
                            {item.type === "repair" ? "Reparatie" : "APK"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {item.customer_name} • {item.device_brand} {item.device_model}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">{formatDate(item.updated_at)}</p>
                    </div>
                  </div>
                </Link>
              ))}

            {activeTab === "repairs" &&
              sortedRepairs.map((repair) => (
                <Link
                  key={repair.id}
                  href={`/repairs/${repair.id}`}
                  className="block bg-white rounded-xl border p-4 hover:shadow-md hover:border-blue-300 transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Wrench className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-gray-900">{repair.job_id}</span>
                          {getStatusBadge(repair.status, "repair")}
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {repair.customer_name} • {repair.device_brand} {repair.device_model}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">{formatDate(repair.updated_at)}</p>
                    </div>
                  </div>
                </Link>
              ))}

            {activeTab === "apk" &&
              sortedApkJobs.map((apk) => (
                <Link
                  key={apk.id}
                  href={`/apk/${apk.id}`}
                  className="block bg-white rounded-xl border p-4 hover:shadow-md hover:border-green-300 transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <ClipboardCheck className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-gray-900">{apk.job_id}</span>
                          {getStatusBadge(apk.status, "apk")}
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {apk.customer_name} • {apk.device_brand} {apk.device_model}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">{formatDate(apk.updated_at)}</p>
                    </div>
                  </div>
                </Link>
              ))}

            {/* Empty states */}
            {activeTab === "all" && allItems.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border">
                <Archive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Geen gearchiveerde items gevonden</p>
              </div>
            )}
            {activeTab === "repairs" && sortedRepairs.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border">
                <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Geen afgeronde reparaties gevonden</p>
              </div>
            )}
            {activeTab === "apk" && sortedApkJobs.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border">
                <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Geen afgeronde APK's gevonden</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
