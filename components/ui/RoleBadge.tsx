"use client";

import { Shield, User } from "lucide-react";

export function RoleBadge({ role, size = "sm" }: { role: string; size?: "sm" | "xs" }) {
  const cls = size === "sm"
    ? "px-3 py-1 text-sm"
    : "px-2 py-0.5 text-xs";
  const icon = size === "sm" ? "w-3.5 h-3.5" : "w-3 h-3";

  if (role === "admin") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-purple-100 text-purple-800 border border-purple-200 ${cls}`}>
        <Shield className={icon} /> Admin
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-blue-100 text-blue-800 border border-blue-200 ${cls}`}>
      <User className={icon} /> Medewerker
    </span>
  );
}
