import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  Edit,
  Trash2,
  Printer,
  PlusCircle,
  LogIn,
  Activity,
  AlertCircle,
} from "lucide-react";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity: string;
  entity_id: string;
  details: Record<string, any> | null;
  created_at: string;
  user?: {
    full_name?: string;
    email: string;
  } | null;
}

function formatDate(date: string): string {
  const now = new Date();
  const logDate = new Date(date);
  const diffMs = now.getTime() - logDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Nu";
  if (diffMins < 60) return `${diffMins} min geleden`;
  if (diffHours < 24) return `${diffHours}h geleden`;
  if (diffDays < 7) return `${diffDays}d geleden`;

  return logDate.toLocaleDateString("nl-NL");
}

function getActionIcon(action: string) {
  switch (action.toUpperCase()) {
    case "CREATE":
      return <PlusCircle className="w-5 h-5" />;
    case "UPDATE":
    case "EDIT":
      return <Edit className="w-5 h-5" />;
    case "DELETE":
      return <Trash2 className="w-5 h-5" />;
    case "PRINT":
      return <Printer className="w-5 h-5" />;
    case "LOGIN":
      return <LogIn className="w-5 h-5" />;
    default:
      return <Activity className="w-5 h-5" />;
  }
}

function getActionColor(action: string) {
  switch (action.toUpperCase()) {
    case "CREATE":
      return "bg-green-100 text-green-700";
    case "UPDATE":
    case "EDIT":
      return "bg-blue-100 text-blue-700";
    case "DELETE":
      return "bg-red-100 text-red-700";
    case "PRINT":
      return "bg-purple-100 text-purple-700";
    case "LOGIN":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getEntityLabel(entity: string): string {
  const labels: Record<string, string> = {
    REPAIR: "Reparatie",
    REPAIR_LABEL: "Reparatie Label",
    PART: "Onderdeel",
    PART_LABEL: "Onderdeel Label",
    TEAM: "Teamlid",
    USER: "Gebruiker",
    APK: "APK",
    REFURBISHED: "Refurbished",
    SYSTEM: "Systeem",
  };
  return labels[entity.toUpperCase()] || entity;
}

function formatActionText(log: AuditLog): string {
  const userName = log.user?.full_name || log.user?.email || "Onbekende gebruiker";
  const entityLabel = getEntityLabel(log.entity);
  const entityId = log.entity_id;

  const action = log.action.toUpperCase();
  switch (action) {
    case "CREATE":
      return `${userName} heeft ${entityLabel} #${entityId} aangemaakt`;
    case "UPDATE":
    case "EDIT":
      return `${userName} heeft ${entityLabel} #${entityId} bewerkt`;
    case "DELETE":
      return `${userName} heeft ${entityLabel} #${entityId} verwijderd`;
    case "PRINT":
      return `${userName} heeft ${entityLabel} #${entityId} geprint`;
    case "LOGIN":
      return `${userName} is ingelogd`;
    default:
      return `${userName} heeft actie ${action} uitgevoerd`;
  }
}

function getDetailsText(log: AuditLog): string | null {
  if (!log.details) return null;

  if (typeof log.details === "string") {
    return log.details;
  }

  if (log.details.description) {
    return log.details.description;
  }

  if (log.details.changed_fields && Array.isArray(log.details.changed_fields)) {
    return `Aangepast: ${log.details.changed_fields.join(", ")}`;
  }

  return null;
}

export default async function AuditLogList() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored
          }
        },
      },
    }
  );

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Niet ingelogd
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Je moet ingelogd zijn om logs te zien.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get user profile to check role
  const { data: userProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !userProfile) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Profiel niet gevonden
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Contacteer een beheerder.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Only admins can view logs
  if (userProfile.role !== "admin") {
    return (
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              Beheerder toegang vereist
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Alleen beheerders kunnen de activiteitenlogboek bekijken.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch audit logs (no FK join — audit_logs has no FK to profiles)
  const { data: logs, error: logsError } = await supabase
    .from("audit_logs")
    .select("id, user_id, action, entity, entity_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (logsError) {
    console.error("Error fetching audit logs:", logsError);
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Fout bij laden van logs
            </p>
            <p className="text-sm text-red-700 mt-1">
              {logsError.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch user profiles separately
  const rawLogs = logs || [];
  const userIds = [...new Set(rawLogs.map((l: any) => l.user_id).filter(Boolean))];
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

  const auditLogs: AuditLog[] = rawLogs.map((l: any) => ({
    ...l,
    user: profileMap[l.user_id] || null,
  }));


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Gebeurtenissen & Logs
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Alle gebruikersacties in het systeem ({auditLogs.length} logs)
          </p>
        </div>
      </div>

      {/* Empty State */}
      {auditLogs.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Geen logs gevonden</p>
          <p className="text-sm text-gray-500 mt-2">
            Voer acties uit (reparatie aanmaken, label printen) om logs te genereren.
          </p>
          <details className="mt-4 text-left">
            <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
              🔍 Debug Info
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify(
                {
                  userId: user.id,
                  userRole: userProfile.role,
                  logsCount: auditLogs.length,
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              )}
            </pre>
          </details>
        </div>
      ) : (
        /* Timeline */
        <div className="space-y-3">
          {auditLogs.map((log, index) => (
            <div key={log.id} className="relative">
              {/* Timeline connector */}
              {index !== auditLogs.length - 1 && (
                <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-gray-200" />
              )}

              {/* Log entry */}
              <div className="flex gap-4">
                {/* Icon badge */}
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 ${getActionColor(
                    log.action
                  )}`}
                >
                  {getActionIcon(log.action)}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatActionText(log)}
                      </p>
                      {getDetailsText(log) && (
                        <p className="text-xs text-gray-600 mt-1">
                          {getDetailsText(log)}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer info */}
      {auditLogs.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            De {auditLogs.length} meest recente activiteiten worden weergegeven.
            Oudere logs zijn gearchiveerd.
          </p>
        </div>
      )}
    </div>
  );
}
