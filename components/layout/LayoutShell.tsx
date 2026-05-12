"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-slate-900 text-white p-2 rounded-lg shadow-lg"
        aria-label="Menu openen"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - desktop: always visible, mobile: slide-in overlay */}
      <aside
        className={`
          fixed inset-y-0 left-0 lg:relative z-50 lg:z-auto flex-none
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen
            ? "translate-x-0 pointer-events-auto"
            : "-translate-x-full lg:translate-x-0 pointer-events-none lg:pointer-events-auto"}
        `}
      >
        <Sidebar onCloseMobile={() => setMobileOpen(false)} />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 pt-16 md:p-8 md:pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
