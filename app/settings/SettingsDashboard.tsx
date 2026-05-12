"use client";

import { useState } from "react";
import { Building2, Users, Activity, Settings as SettingsIcon, Printer, User, FileText, Clock, Tag, Link2, DollarSign, Palette, Package, ArrowLeft, Bell } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

// Import section components
import CompanyProfileSection from "./components/CompanyProfileSection";
import TeamManagementSection from "./components/TeamManagementSection";
import PrinterSettingsSection from "./components/PrinterSettingsSection";
import BrandModelsSection from "./components/BrandModelsSection";
import BrandColorsSection from "./components/BrandColorsSection";
import AccessoriesSection from "./components/AccessoriesSection";
import IntegrationsSection from "./components/IntegrationsSection";
import PricingSection from "./components/PricingSection";
import PrintQueueSection from "./components/PrintQueueSection";
import NotificationSection from "./components/NotificationSection";

interface SettingsDashboardProps {
  profiles: any[];
  currentUserId: string;
  currentUserRole: "admin" | "medewerker";
  auditLogs: any[];
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  {
    id: "company",
    label: "Bedrijfsprofiel",
    icon: <Building2 className="w-4 h-4" />,
    adminOnly: true,
  },
  {
    id: "team",
    label: "Team Beheer",
    icon: <Users className="w-4 h-4" />,
    adminOnly: true,
  },
  {
    id: "brands",
    label: "Merken & Modellen",
    icon: <Tag className="w-4 h-4" />,
    adminOnly: true,
  },
  {
    id: "colors",
    label: "Merkenkleuren",
    icon: <Palette className="w-4 h-4" />,
    adminOnly: true,
  },
  {
    id: "accessories",
    label: "Accessoires",
    icon: <Package className="w-4 h-4" />,
    adminOnly: true,
  },
  {
    id: "pricing",
    label: "Prijzen & Tarieven",
    icon: <DollarSign className="w-4 h-4" />,
    adminOnly: true,
  },
  {
    id: "print-queue",
    label: "Print Queue",
    icon: <Printer className="w-4 h-4" />,
    adminOnly: true,
  },
  {
    id: "notifications",
    label: "Notificaties",
    icon: <Bell className="w-4 h-4" />,
    adminOnly: true,
  },
  {
    id: "integrations",
    label: "Integraties",
    icon: <Link2 className="w-4 h-4" />,
    adminOnly: true,
  },
  {
    id: "audit",
    label: "Gebeurtenissen",
    icon: <Activity className="w-4 h-4" />,
    adminOnly: true,
  },
  {
    id: "general",
    label: "Algemeen",
    icon: <SettingsIcon className="w-4 h-4" />,
  },
];

// Action icon mapper
function getActionIcon(action: string) {
  switch (action) {
    case "CREATE":
      return <FileText className="w-4 h-4 text-green-600" />;
    case "UPDATE":
      return <FileText className="w-4 h-4 text-blue-600" />;
    case "DELETE":
      return <FileText className="w-4 h-4 text-red-600" />;
    case "PRINT":
      return <Printer className="w-4 h-4 text-purple-600" />;
    case "LOGIN":
      return <User className="w-4 h-4 text-gray-600" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
}

// Audit Log Viewer Component
function AuditLogViewer({ logs }: { logs: any[] }) {
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const actionLabels: Record<string, string> = {
    CREATE: "Aangemaakt",
    UPDATE: "Bijgewerkt",
    DELETE: "Verwijderd",
    PRINT: "Geprint",
    LOGIN: "Ingelogd",
  };

  const entityLabels: Record<string, string> = {
    REPAIR: "Reparatie",
    REPAIR_LABEL: "Rep. Label",
    PART: "Onderdeel",
    PART_LABEL: "Ond. Label",
    APK: "APK",
    TEAM: "Team",
    USER: "Gebruiker",
  };

  const actionColors: Record<string, string> = {
    CREATE: "bg-green-100 text-green-700",
    UPDATE: "bg-blue-100 text-blue-700",
    DELETE: "bg-red-100 text-red-700",
    PRINT: "bg-purple-100 text-purple-700",
    LOGIN: "bg-gray-100 text-gray-700",
  };

  if (logs.length === 0) {
    return (
      <div className="py-12 text-center">
        <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Geen activiteiten gevonden</p>
        <p className="text-sm text-gray-400 mt-1">Voer acties uit om logs te genereren</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Recente activiteiten</h3>
          <p className="text-xs text-gray-500 mt-0.5">{logs.length} gebeurtenissen</p>
        </div>
        <Link href="/overzicht" className="text-xs text-blue-600 hover:underline font-medium">
          Volledig overzicht →
        </Link>
      </div>

      <div className="space-y-1.5">
        {logs.slice(0, 30).map((log) => {
          const details = log.details as any;
          const isExpanded = expandedLog === log.id;
          let info = "";
          if (details?.kenteken) info = details.kenteken;
          else if (details?.email) info = details.email;
          else if (details?.job_number) info = `#${details.job_number}`;
          else if (log.entity_id) info = `#${log.entity_id.length > 8 ? log.entity_id.slice(0,8) : log.entity_id}`;

          return (
            <div
              key={log.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setExpandedLog(isExpanded ? null : log.id)}
            >
              <div className="flex-shrink-0">{getActionIcon(log.action)}</div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${actionColors[log.action] || "bg-gray-100 text-gray-600"}`}>
                  {actionLabels[log.action] || log.action}
                </span>
                <span className="text-xs text-gray-600 truncate">
                  {entityLabels[log.entity] || log.entity}
                  {info && <span className="text-gray-400 ml-1">{info}</span>}
                </span>
              </div>
              <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
                {format(new Date(log.created_at), "dd MMM HH:mm", { locale: nl })}
              </span>
            </div>
          );
        })}
      </div>

      {logs.length > 30 && (
        <Link href="/overzicht" className="block text-center text-xs text-blue-600 hover:underline py-2">
          Bekijk alle {logs.length} activiteiten →
        </Link>
      )}
    </div>
  );
}

// General Settings Component
function GeneralSection() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Algemene Instellingen</h3>
        <p className="text-xs text-gray-500 mt-0.5">Printer- en labelconfiguratie.</p>
      </div>
      <PrinterSettingsSection />
    </div>
  );
}

export default function SettingsDashboard({
  profiles,
  currentUserId,
  currentUserRole,
  auditLogs,
}: SettingsDashboardProps) {
  // Filter menu items based on role
  const visibleMenuItems = menuItems.filter(
    (item) => !item.adminOnly || currentUserRole === "admin"
  );
  
  const [activeTab, setActiveTab] = useState(
    visibleMenuItems.length > 0 ? visibleMenuItems[0].id : "general"
  );

  const renderContent = () => {
    switch (activeTab) {
      case "company":
        return <CompanyProfileSection />;
      case "team":
        return (
          <TeamManagementSection
            profiles={profiles}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        );
      case "brands":
        return <BrandModelsSection />;
      case "colors":
        return <BrandColorsSection />;
      case "accessories":
        return <AccessoriesSection />;
      case "pricing":
        return <PricingSection />;
      case "print-queue":
        return <PrintQueueSection />;
      case "notifications":
        return <NotificationSection />;
      case "integrations":
        return <IntegrationsSection />;
      case "audit":
        return <AuditLogViewer logs={auditLogs} />;
      case "general":
        return <GeneralSection />;
      default:
        return <CompanyProfileSection />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      {/* Mobile: horizontal tab bar */}
      <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100">
          <Link
            href="/"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Terug"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-base font-bold text-gray-900">Instellingen</h1>
        </div>
        <div className="flex overflow-x-auto scrollbar-hide px-2 py-1.5 gap-1">
          {visibleMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === item.id
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className={activeTab === item.id ? "text-blue-600" : "text-gray-400"}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: sidebar */}
      <div className="hidden lg:flex w-56 bg-white border-r border-gray-200 flex-shrink-0 flex-col">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
          <Link
            href="/"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Terug"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-gray-900">Instellingen</h1>
          </div>
        </div>

        <nav className="p-2 space-y-0.5 flex-1 overflow-y-auto">
          {visibleMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                activeTab === item.id
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span
                className={
                  activeTab === item.id ? "text-blue-600" : "text-gray-400"
                }
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200 bg-gray-50/50">
          <p className="text-xs text-gray-500">Rol: <span className="font-medium text-gray-700">{currentUserRole}</span></p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
