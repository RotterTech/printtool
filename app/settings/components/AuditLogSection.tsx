"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Printer,
  Edit,
  Trash2,
  Plus,
  FileText,
  User,
  Package,
  Activity,
  RefreshCw,
  PlusCircle,
  LogIn,
  Wrench,
} from "lucide-react";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity: string;
  entity_id: string;
  details: Record<string, any>;
  created_at: string;
  user?: {
    full_name?: string;
    email: string;
  };
}

interface AuditLogSectionProps {
  logs: AuditLog[];
}

function getActionIcon(action: string) {
  switch ((action || "").toLowerCase()) {
    case "print":
      return <Printer className="w-4 h-4" />;
    case "edit":
    case "update":
      return <Edit className="w-4 h-4" />;
    case "delete":
      return <Trash2 className="w-4 h-4" />;
    case "create":
      return <PlusCircle className="w-4 h-4" />;
    case "login":
      return <LogIn className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
}

function getActionColor(action: string) {
  switch ((action || "").toLowerCase()) {
    case "print":
      return "bg-purple-100 text-purple-600";
    case "edit":
    case "update":
      return "bg-blue-100 text-blue-600";
    case "delete":
      return "bg-red-100 text-red-600";
    case "create":
      return "bg-green-100 text-green-600";
    case "login":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function getEntityLabel(entity: string) {
  const labels: Record<string, string> = {
    repair: "Reparatie",
    repair_label: "Reparatie Label",
    part: "Onderdeel",
    part_label: "Onderdeel Label",
    apk: "APK",
    user: "Gebruiker",
    team: "Teamlid",
    refurbished: "Refurbished",
  };
  return labels[(entity || "").toLowerCase()] || entity || "Onbekend";
}

function formatActionText(log: AuditLog): string {
  const userName = log.user?.full_name || log.user?.email || "Onbekende gebruiker";
  const entityLabel = getEntityLabel(log.entity);
  const entityId = log.entity_id;

  switch ((log.action || "").toLowerCase()) {
    case "create":
      return `${userName} heeft ${entityLabel} #${entityId} aangemaakt`;
    case "edit":
    case "update":
      return `${userName} heeft ${entityLabel} #${entityId} bewerkt`;
    case "delete":
      return `${userName} heeft ${entityLabel} #${entityId} verwijderd`;
    case "print":
      return `${userName} heeft ${entityLabel} #${entityId} geprint`;
    default:
      return `${userName} heeft een actie uitgevoerd op ${entityLabel} #${entityId}`;
  }
}

function getDetailsText(log: AuditLog): string | null {
  if (!log.details || Object.keys(log.details).length === 0) {
    return null;
  }

  // Extract meaningful changes from details
  const changes: string[] = [];
  
  if (log.details.status) {
    changes.push(`Status: ${log.details.status}`);
  }
  
  if (log.details.changed_fields && Array.isArray(log.details.changed_fields)) {
    changes.push(`Aangepast: ${log.details.changed_fields.join(", ")}`);
  }

  if (log.details.description) {
    changes.push(log.details.description);
  }

  return changes.length > 0 ? changes.join(" • ") : null;
}

export default function AuditLogSection({ logs }: AuditLogSectionProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debug logging
  console.log(`📊 AuditLogSection received ${logs?.length || 0} logs`);
  if (logs && logs.length > 0) {
    console.log("Sample log:", logs[0]);
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gebeurtenissen</h2>
          <p className="text-gray-600 mt-1">
            Bekijk alle acties en wijzigingen in het systeem
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Verversen
        </button>
      </div>

      {/* Timeline */}
      <div className="relative">
        {logs.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-lg">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Geen gebeurtenissen gevonden</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log, index) => (
              <div key={log.id} className="relative pl-8">
                {/* Timeline Line */}
                {index !== logs.length - 1 && (
                  <div className="absolute left-[15px] top-10 bottom-0 w-px bg-gray-200" />
                )}

                {/* Event Card */}
                <div className="relative">
                  {/* Icon */}
                  <div
                    className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(
                      log.action
                    )}`}
                  >
                    {getActionIcon(log.action)}
                  </div>

                  {/* Content */}
                  <div className="ml-10 bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Action Text */}
                        <p className="text-sm font-medium text-gray-900">
                          {formatActionText(log)}
                        </p>

                        {/* Details */}
                        {getDetailsText(log) && (
                          <p className="text-xs text-gray-600 mt-1">
                            {getDetailsText(log)}
                          </p>
                        )}
                      </div>

                      {/* Time */}
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.created_at), {
                          addSuffix: true,
                          locale: nl,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Load More (if needed) */}
      {logs.length >= 50 && (
        <div className="text-center">
          <button className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
            Meer laden
          </button>
        </div>
      )}
    </div>
  );
}
