import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import {
  Wrench, Package, Box, Trash2, FileText, AlertCircle,
  Printer, Shield, UserX, RefreshCw, ArrowLeft, Filter,
  ChevronDown, ChevronUp, Clock, User, Activity, Users
} from "lucide-react";
import OverzichtFilters from "./OverzichtFilters";

interface AuditLog {
  id: string;
  created_at: string;
  user_id: string;
  action: string;
  entity: string;
  entity_id: string;
  details: Record<string, any> | null;
  profiles?: { full_name: string | null; email: string | null } | null;
}

interface Stats {
  total: number;
  today: number;
  byAction: Record<string, number>;
  byEntity: Record<string, number>;
}

async function createSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );
}

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();
  return profile;
}

async function getAuditLogs(
  supabase: any,
  filters: {
    action?: string;
    entity?: string;
    date?: string;
    from?: string;
    to?: string;
    search?: string;
    employee?: string;
    page?: number;
    perPage?: number;
  } = {}
) {
  const { action, entity, date, from: fromDate, to: toDate, search, employee, page = 1, perPage = 50 } = filters;

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" });

  // Apply action filter (check both action and action_type columns)
  if (action) {
    query = query.or(`action.eq.${action},action_type.eq.${action}`);
  }

  // Apply entity filter
  if (entity) {
    query = query.eq("entity", entity);
  }

  // Apply employee filter
  if (employee) {
    query = query.eq("user_id", employee);
  }

  // Apply date filter
  if (date === "custom") {
    if (fromDate) {
      query = query.gte("created_at", new Date(fromDate).toISOString());
    }
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endOfDay.toISOString());
    }
  } else if (date) {
    const now = new Date();
    let from: Date;
    switch (date) {
      case "today":
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "yesterday": {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query = query.lt("created_at", to.toISOString());
        break;
      }
      case "7days":
        from = new Date(now.getTime() - 7 * 86400000);
        break;
      case "30days":
        from = new Date(now.getTime() - 30 * 86400000);
        break;
      default:
        from = new Date(0);
    }
    query = query.gte("created_at", from.toISOString());
  }

  // Apply search filter (on details->description or entity_id)
  if (search) {
    query = query.or(`entity_id.ilike.%${search}%,details->>description.ilike.%${search}%,details->>customer_name.ilike.%${search}%`);
  }

  // Pagination
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const { data: logs, error, count } = await query
    .order("created_at", { ascending: false })
    .range(start, end);

  if (error) {
    console.error("Error fetching audit logs:", error);
    return { logs: [], total: 0 };
  }

  if (!logs || logs.length === 0) return { logs: [], total: count || 0 };

  // Fetch unique user profiles separately
  const userIds = [...new Set(logs.map((l: any) => l.user_id).filter(Boolean))];
  let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    if (profiles) {
      for (const p of profiles) {
        profileMap[p.id] = { full_name: p.full_name, email: p.email };
      }
    }
  }

  // Merge profiles into logs and normalize action field
  const enrichedLogs = logs.map((log: any) => ({
    ...log,
    action: log.action || log.action_type || "UNKNOWN",
    profiles: profileMap[log.user_id] || null,
  })) as AuditLog[];

  return { logs: enrichedLogs, total: count || 0 };
}

function computeStats(logs: AuditLog[]): Stats {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const byAction: Record<string, number> = {};
  const byEntity: Record<string, number> = {};
  let today = 0;

  for (const log of logs) {
    byAction[log.action] = (byAction[log.action] || 0) + 1;
    byEntity[log.entity] = (byEntity[log.entity] || 0) + 1;
    if (new Date(log.created_at) >= todayStart) today++;
  }

  return { total: logs.length, today, byAction, byEntity };
}

function getActionIcon(action: string) {
  switch (action) {
    case "CREATE": return <FileText className="w-3.5 h-3.5" />;
    case "UPDATE": return <RefreshCw className="w-3.5 h-3.5" />;
    case "DELETE": return <Trash2 className="w-3.5 h-3.5" />;
    case "PRINT":  return <Printer className="w-3.5 h-3.5" />;
    case "LOGIN":  return <Shield className="w-3.5 h-3.5" />;
    default:       return <AlertCircle className="w-3.5 h-3.5" />;
  }
}

function getActionColor(action: string) {
  switch (action) {
    case "CREATE": return "bg-green-100 text-green-800 border-green-200";
    case "UPDATE": return "bg-blue-100 text-blue-800 border-blue-200";
    case "DELETE": return "bg-red-100 text-red-800 border-red-200";
    case "PRINT":  return "bg-purple-100 text-purple-800 border-purple-200";
    case "LOGIN":  return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:       return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getEntityIcon(entity: string) {
  switch (entity) {
    case "REPAIR":
    case "REPAIR_LABEL": return <Wrench className="w-3.5 h-3.5" />;
    case "PART":
    case "PART_LABEL":   return <Box className="w-3.5 h-3.5" />;
    case "TEAM":         return <UserX className="w-3.5 h-3.5" />;
    case "APK":          return <Shield className="w-3.5 h-3.5" />;
    case "REFURBISHED":  return <Package className="w-3.5 h-3.5" />;
    default:             return <Activity className="w-3.5 h-3.5" />;
  }
}

function getEntityColor(entity: string) {
  switch (entity) {
    case "REPAIR":
    case "REPAIR_LABEL": return "bg-blue-50 text-blue-700";
    case "PART":
    case "PART_LABEL":   return "bg-orange-50 text-orange-700";
    case "TEAM":         return "bg-pink-50 text-pink-700";
    case "APK":          return "bg-yellow-50 text-yellow-700";
    case "REFURBISHED":  return "bg-green-50 text-green-700";
    default:             return "bg-gray-50 text-gray-700";
  }
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Aangemaakt",
  UPDATE: "Bijgewerkt",
  DELETE: "Verwijderd",
  PRINT: "Geprint",
  LOGIN: "Ingelogd",
};

const ENTITY_LABELS: Record<string, string> = {
  REPAIR: "Reparatie",
  REPAIR_LABEL: "Reparatie Label",
  PART: "Onderdeel",
  PART_LABEL: "Onderdeel Label",
  TEAM: "Team",
  APK: "APK",
  REFURBISHED: "Refurbished",
  CUSTOMER: "Klant",
};

interface EmployeeStat {
  id: string;
  name: string;
  total: number;
  byAction: Record<string, number>;
  byEntity: Record<string, number>;
  lastActive: string | null;
}

async function getEmployeeStats(
  supabase: any,
  dateFilter?: string,
  fromDate?: string,
  toDate?: string
): Promise<EmployeeStat[]> {
  let query = supabase.from("audit_logs").select("user_id, action, action_type, entity, created_at");

  // Apply same date filter as main query
  if (dateFilter === "custom") {
    if (fromDate) query = query.gte("created_at", new Date(fromDate).toISOString());
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endOfDay.toISOString());
    }
  } else if (dateFilter === "today") {
    const now = new Date();
    query = query.gte("created_at", new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString());
  } else if (dateFilter === "yesterday") {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    query = query.gte("created_at", from.toISOString()).lt("created_at", to.toISOString());
  } else if (dateFilter === "7days") {
    query = query.gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
  } else if (dateFilter === "30days") {
    query = query.gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString());
  }

  const { data: rows } = await query.order("created_at", { ascending: false }).limit(5000);
  if (!rows || rows.length === 0) return [];

  const map: Record<string, { total: number; byAction: Record<string, number>; byEntity: Record<string, number>; lastActive: string | null }> = {};
  for (const r of rows) {
    if (!r.user_id) continue;
    if (!map[r.user_id]) map[r.user_id] = { total: 0, byAction: {}, byEntity: {}, lastActive: null };
    const s = map[r.user_id];
    const act = r.action || r.action_type || "UNKNOWN";
    s.total++;
    s.byAction[act] = (s.byAction[act] || 0) + 1;
    s.byEntity[r.entity] = (s.byEntity[r.entity] || 0) + 1;
    if (!s.lastActive || r.created_at > s.lastActive) s.lastActive = r.created_at;
  }

  const userIds = Object.keys(map);
  let profileMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    if (profiles) {
      for (const p of profiles) {
        profileMap[p.id] = p.full_name || p.email || "Onbekend";
      }
    }
  }

  return userIds
    .map((id) => ({ id, name: profileMap[id] || "Onbekend", ...map[id] }))
    .sort((a, b) => b.total - a.total);
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Zojuist";
  if (diffMins < 60) return `${diffMins} min geleden`;
  if (diffHours < 24) return `${diffHours} uur geleden`;
  if (diffDays === 1) return "Gisteren";
  if (diffDays < 7) return `${diffDays} dagen geleden`;

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatAbsoluteTime(timestamp: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function buildDescription(log: AuditLog): string {
  const entity = ENTITY_LABELS[log.entity] || log.entity || "Onbekend";
  const action = ACTION_LABELS[log.action] || log.action || "onbekend";

  if (log.details) {
    const d = log.details;
    if (d.description) return d.description;
    if (d.customer_name) return `${entity} ${action.toLowerCase()} voor ${d.customer_name}`;
    if (d.job_id) return `${entity} #${d.job_id} ${action.toLowerCase()}`;
    if (d.part_id) return `${entity} #${d.part_id} ${action.toLowerCase()}`;
    if (d.email) return `${action} — ${d.email}`;
    if (d.changes) {
      const changed = Object.keys(d.changes);
      return `${entity} ${action.toLowerCase()} (${changed.join(", ")})`;
    }
  }

  return `${entity} ${action.toLowerCase()}${log.entity_id ? ` #${log.entity_id}` : ""}`;
}

export default async function OverzichtPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabase();
  const profile = await checkAdmin(supabase);

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Geen toegang</h2>
          <p className="text-gray-600 mb-4">
            Alleen administrators kunnen activiteitslogs bekijken.
          </p>
          <Link href="/" className="text-blue-600 hover:underline text-sm font-medium">
            ← Terug naar home
          </Link>
        </div>
      </div>
    );
  }

  const action = typeof params.action === "string" ? params.action : "";
  const entity = typeof params.entity === "string" ? params.entity : "";
  const date = typeof params.date === "string" ? params.date : "";
  const search = typeof params.q === "string" ? params.q : "";
  const employee = typeof params.employee === "string" ? params.employee : "";
  const fromDate = typeof params.from === "string" ? params.from : "";
  const toDate = typeof params.to === "string" ? params.to : "";
  const page = Math.max(1, parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const perPage = 50;

  const [{ logs, total }, employeeStats] = await Promise.all([
    getAuditLogs(supabase, {
      action, entity, date, from: fromDate, to: toDate, search, employee, page, perPage,
    }),
    getEmployeeStats(supabase, date, fromDate, toDate),
  ]);
  const stats = computeStats(logs);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // Build employee list for filter dropdown
  const employeeList = employeeStats.map((e) => ({ id: e.id, name: e.name }));

  // Find selected employee name
  let selectedEmployeeName: string | null = null;
  if (employee) {
    const found = employeeStats.find((e) => e.id === employee);
    if (found) {
      selectedEmployeeName = found.name;
    } else {
      // Employee not in stats (no activity in period) — look up from profiles
      const { data: empProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", employee)
        .maybeSingle();
      selectedEmployeeName = empProfile?.full_name || empProfile?.email || "Onbekend";
    }
  }

  // Build pagination URL helper
  function pageUrl(p: number) {
    const u = new URLSearchParams();
    if (action) u.set("action", action);
    if (entity) u.set("entity", entity);
    if (date) u.set("date", date);
    if (fromDate) u.set("from", fromDate);
    if (toDate) u.set("to", toDate);
    if (search) u.set("q", search);
    if (employee) u.set("employee", employee);
    if (p > 1) u.set("page", String(p));
    const qs = u.toString();
    return `/overzicht${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-gray-100 text-sm font-bold bg-white shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Terug
        </Link>
        <h1 className="text-sm sm:text-lg font-bold text-gray-900 flex items-center gap-1.5">
          <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /> Logs
        </h1>
        <div className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
          {profile.full_name || profile.email}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Filters */}
        <Suspense fallback={<div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 h-20 animate-pulse" />}>
          <OverzichtFilters employees={employeeList} />
        </Suspense>

        {/* Active Employee Filter Banner */}
        {employee && selectedEmployeeName && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-indigo-900">{selectedEmployeeName}</div>
                <div className="text-[10px] sm:text-xs text-indigo-600">
                  {total} activiteit{total !== 1 ? "en" : ""}
                  {date === "today" ? " vandaag" : date === "yesterday" ? " gisteren" : date === "7days" ? " (7 dagen)" : date === "30days" ? " (30 dagen)" : ""}
                </div>
              </div>
            </div>
            <Link
              href={`/overzicht${date ? `?date=${date}` : ""}${fromDate ? `${date ? "&" : "?"}from=${fromDate}` : ""}${toDate ? `&to=${toDate}` : ""}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-300 bg-white hover:bg-indigo-50 text-xs sm:text-sm font-medium text-indigo-700 shadow-sm flex-shrink-0"
            >
              <Users className="w-3.5 h-3.5" /> Alle medewerkers
            </Link>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-gray-500 uppercase font-medium">Resultaten</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">{total}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-gray-500 uppercase font-medium">Vandaag</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600 mt-0.5 sm:mt-1">{stats.today}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 overflow-hidden">
            <div className="text-[10px] sm:text-xs text-gray-500 uppercase font-medium">Per actie</div>
            <div className="flex flex-wrap gap-1 mt-1 max-w-full">
              {Object.entries(stats.byAction).map(([action, count]) => (
                <span key={action} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border flex-shrink-0 ${getActionColor(action)}`}>
                  {getActionIcon(action)} {count}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 overflow-hidden">
            <div className="text-[10px] sm:text-xs text-gray-500 uppercase font-medium">Per type</div>
            <div className="flex flex-wrap gap-1 mt-1 max-w-full">
              {Object.entries(stats.byEntity).map(([entity, count]) => (
                <span key={entity} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium flex-shrink-0 ${getEntityColor(entity)}`}>
                  {getEntityIcon(entity)} {count}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Employee Activity Summary — hide when viewing a specific employee */}
        {employeeStats.length > 0 && !employee && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                Medewerker overzicht
              </span>
              <span className="text-[10px] sm:text-xs text-gray-400 ml-auto">
                {date === "today" ? "Vandaag" : date === "yesterday" ? "Gisteren" : date === "7days" ? "7 dagen" : date === "30days" ? "30 dagen" : date === "custom" && fromDate ? `${fromDate}${toDate ? ` t/m ${toDate}` : ""}` : "Alle tijd"}
              </span>
            </div>

            {/* Mobile layout */}
            <div className="md:hidden divide-y divide-gray-100">
              {employeeStats.map((emp) => (
                <Link
                  key={emp.id}
                  href={`/overzicht?employee=${emp.id}${date ? `&date=${date}` : ""}${fromDate ? `&from=${fromDate}` : ""}${toDate ? `&to=${toDate}` : ""}`}
                  className="block p-3 hover:bg-blue-50/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-indigo-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate">{emp.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{emp.total}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(emp.byAction).map(([a, c]) => (
                      <span key={a} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getActionColor(a)}`}>
                        {getActionIcon(a)} {ACTION_LABELS[a] || a} {c}
                      </span>
                    ))}
                  </div>
                  {emp.lastActive && (
                    <div className="text-[10px] text-gray-400 mt-1">
                      Laatst actief: {formatTimestamp(emp.lastActive)}
                    </div>
                  )}
                </Link>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Medewerker</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Totaal</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Ingeboekt</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Bijgewerkt</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Verwijderd</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Geprint</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Types</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Laatst actief</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employeeStats.map((emp) => (
                    <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/overzicht?employee=${emp.id}${date ? `&date=${date}` : ""}${fromDate ? `&from=${fromDate}` : ""}${toDate ? `&to=${toDate}` : ""}`}
                          className="flex items-center gap-2 hover:text-blue-600"
                        >
                          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-3 h-3 text-indigo-600" />
                          </div>
                          <span className="text-sm font-medium">{emp.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-sm font-bold text-gray-900">{emp.total}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-sm text-green-700 font-medium">{emp.byAction["CREATE"] || 0}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-sm text-blue-700 font-medium">{emp.byAction["UPDATE"] || 0}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-sm text-red-700 font-medium">{emp.byAction["DELETE"] || 0}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-sm text-purple-700 font-medium">{emp.byAction["PRINT"] || 0}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(emp.byEntity).map(([e, c]) => (
                            <span key={e} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${getEntityColor(e)}`}>
                              {getEntityIcon(e)} {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="text-xs text-gray-500">{emp.lastActive ? formatTimestamp(emp.lastActive) : "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Activity Table */}
        {logs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nog geen activiteit geregistreerd
            </h3>
            <p className="text-gray-500 text-sm">
              Activiteiten verschijnen hier zodra het systeem wordt gebruikt.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                {total} activiteit{total !== 1 ? "en" : ""}{employee && selectedEmployeeName ? ` van ${selectedEmployeeName}` : ""} gevonden
                {(action || entity || date || search) && <span className="text-gray-400"> (gefilterd)</span>}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-400">
                Pagina {page} van {totalPages}
              </span>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-gray-100">
              {logs.map((log) => {
                const userName = log.profiles?.full_name || log.profiles?.email || "Systeem";
                return (
                  <div key={log.id} className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${getEntityColor(log.entity)}`}>
                          {getEntityIcon(log.entity)}
                          {ENTITY_LABELS[log.entity] || log.entity}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTimestamp(log.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-700 line-clamp-2">{buildDescription(log)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400 truncate">{userName}</span>
                      {log.entity_id && (
                        <code className="text-[10px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded font-mono">
                          {log.entity_id.length > 8 ? log.entity_id.slice(0, 8) + "…" : log.entity_id}
                        </code>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">
                      Tijdstip
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-44">
                      Medewerker
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                      Actie
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">
                      Type
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Beschrijving
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                      ID
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log, index) => {
                    const userName = log.profiles?.full_name || log.profiles?.email || "Systeem";
                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatTimestamp(log.created_at)}</div>
                          <div className="text-[11px] text-gray-400">{formatAbsoluteTime(log.created_at)}</div>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3 text-gray-500" />
                            </div>
                            <span className="text-sm text-gray-800 truncate max-w-[160px]" title={userName}>
                              {userName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                            {getActionIcon(log.action)}
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getEntityColor(log.entity)}`}>
                            {getEntityIcon(log.entity)}
                            {ENTITY_LABELS[log.entity] || log.entity}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-sm text-gray-700 line-clamp-1">
                            {buildDescription(log)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {log.entity_id ? (
                            <code className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                              {log.entity_id.length > 8 ? log.entity_id.slice(0, 8) + "…" : log.entity_id}
                            </code>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-3 sm:px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} van {total}
                </div>
                <div className="flex items-center gap-1">
                  {page > 1 && (
                    <Link
                      href={pageUrl(page - 1)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
                    >
                      ← Vorige
                    </Link>
                  )}
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 7) {
                      p = i + 1;
                    } else if (page <= 4) {
                      p = i + 1;
                    } else if (page >= totalPages - 3) {
                      p = totalPages - 6 + i;
                    } else {
                      p = page - 3 + i;
                    }
                    return (
                      <Link
                        key={p}
                        href={pageUrl(p)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border ${
                          p === page
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        {p}
                      </Link>
                    );
                  })}
                  {page < totalPages && (
                    <Link
                      href={pageUrl(page + 1)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
                    >
                      Volgende →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
