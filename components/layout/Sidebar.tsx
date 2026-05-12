"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Settings,
  Package,
  Users,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Archive,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Reparatie bekijken", href: "/dashboard", icon: LayoutDashboard },
  { label: "Nieuwe inname", href: "/inboeken", icon: PlusCircle },
  { label: "Klanten", href: "/klanten", icon: Users },
  { label: "Voorraad", href: "/parts/inventory", icon: Package },
  { label: "Overzicht", href: "/overzicht", icon: ClipboardList },
  { label: "Archief", href: "/archief", icon: Archive },
  { label: "Instellingen", href: "/settings", icon: Settings },
];

export default function Sidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout error:", e);
    }
    // Force navigate regardless of signOut result
    window.location.href = "/login";
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside 
      className={`${isCollapsed ? 'w-20' : 'w-64'} min-h-screen h-screen bg-slate-900 text-slate-100 flex flex-col border-r border-white/10 transition-all duration-300`}
    >
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        {isCollapsed ? (
          <p className="text-lg font-bold text-white text-center">DDK</p>
        ) : (
          <p className="text-lg font-bold text-white leading-tight">
            De Digitale Klusjesman
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          const base =
            "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-colors";
          const state = active
            ? "bg-white/10 text-white"
            : "text-slate-200 hover:bg-white/5 hover:text-white";
          return (
            <Link 
              key={href} 
              href={href} 
              className={`${base} ${state} ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? label : undefined}
              onClick={onCloseMobile}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="flex-1">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer - Profile & Logout */}
      <div className="border-t border-slate-800 bg-slate-950/30 px-3 py-4 space-y-1">
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-white transition-colors justify-center mb-2"
          title={isCollapsed ? "Uitklappen" : "Inklappen"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="flex-1 text-left">Inklappen</span>
            </>
          )}
        </button>

        {/* Profile Link */}
        <Link
          href="/profiel"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-colors ${
            pathname === "/profiel"
              ? "bg-white/10 text-white"
              : "text-slate-200 hover:bg-white/5 hover:text-white"
          } ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? "Mijn Profiel" : undefined}
        >
          <User className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="flex-1">Mijn Profiel</span>}
        </Link>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold text-slate-200 hover:bg-white/5 hover:text-red-400 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? "Uitloggen" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="flex-1 text-left">Uitloggen</span>}
        </button>
      </div>
    </aside>
  );
}
