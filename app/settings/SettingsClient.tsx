"use client";

import { useState } from "react";
import { Building2, Users, Printer, ChevronRight } from "lucide-react";

interface SettingsClientProps {
  profiles: any[];
  currentUserId: string;
  currentUserRole: "admin" | "medewerker";
}

// Import section components
import CompanyProfileSection from "./components/CompanyProfileSection";
import TeamManagementSection from "./components/TeamManagementSection";
import PrinterSettingsSection from "./components/PrinterSettingsSection";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  {
    id: "profile",
    label: "Bedrijfsprofiel",
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    id: "team",
    label: "Team Beheer",
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: "printers",
    label: "Printers & Labels",
    icon: <Printer className="w-5 h-5" />,
  },
];

export default function SettingsClient({
  profiles,
  currentUserId,
  currentUserRole,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState("profile");

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <CompanyProfileSection />;
      case "team":
        return (
          <TeamManagementSection
            profiles={profiles}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        );
      case "printers":
        return <PrinterSettingsSection />;
      default:
        return <CompanyProfileSection />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Instellingen</h1>
        <p className="text-gray-600 mt-2">
          Beheer bedrijfsinformatie, team en systeem voorkeuren
        </p>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Menu */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow overflow-hidden sticky top-8">
            <nav className="divide-y divide-gray-200">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-4 text-left transition-colors ${
                    activeTab === item.id
                      ? "bg-blue-50 border-l-4 border-blue-600 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50 border-l-4 border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        activeTab === item.id
                          ? "text-blue-600"
                          : "text-gray-500"
                      }
                    >
                      {item.icon}
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {activeTab === item.id && (
                    <ChevronRight className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Right Column - Content */}
        <div className="lg:col-span-9">
          <div className="bg-white rounded-lg shadow p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
