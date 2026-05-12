"use client";

import { useCompany } from "@/lib/useCompany";
import { Clock, AlertTriangle, CreditCard } from "lucide-react";
import Link from "next/link";

export default function TrialBanner() {
  const { company, loading, isTrialExpired, daysLeftInTrial } = useCompany();

  // Don't show if loading or no company
  if (loading || !company) return null;

  // Don't show for paid plans
  if (company.plan !== "trial") return null;

  // Trial expired
  if (isTrialExpired) {
    return (
      <div className="bg-red-600 text-white px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              Je proefperiode is verlopen. Upgrade om door te gaan.
            </span>
          </div>
          <Link
            href="/settings?tab=billing"
            className="flex items-center gap-2 px-4 py-1.5 bg-white text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Upgraden
          </Link>
        </div>
      </div>
    );
  }

  // Last 3 days warning
  if (daysLeftInTrial <= 3) {
    return (
      <div className="bg-orange-500 text-white px-4 py-2 shadow">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5" />
            <span className="font-medium">
              Nog {daysLeftInTrial} {daysLeftInTrial === 1 ? "dag" : "dagen"} in je proefperiode!
            </span>
          </div>
          <Link
            href="/settings?tab=billing"
            className="flex items-center gap-2 px-4 py-1.5 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition-colors text-sm"
          >
            <CreditCard className="w-4 h-4" />
            Nu upgraden
          </Link>
        </div>
      </div>
    );
  }

  // Normal trial (more than 3 days left)
  return (
    <div className="bg-blue-600 text-white px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">🎉</span>
          <span className="font-medium">
            Proefperiode: nog {daysLeftInTrial} dagen gratis toegang
          </span>
        </div>
        <Link
          href="/settings?tab=billing"
          className="text-sm text-blue-100 hover:text-white underline"
        >
          Bekijk abonnementen →
        </Link>
      </div>
    </div>
  );
}
