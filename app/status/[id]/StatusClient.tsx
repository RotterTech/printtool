"use client";

import { COMPANY } from "@/lib/config";

interface StatusClientProps {
  repair: any | null;
  error?: string;
}

const STATUS_INFO: Record<string, { icon: string; label: string; color: string; bgColor: string; description: string; step: number }> = {
  "Nieuw": {
    icon: "📥",
    label: "Ontvangen",
    color: "text-blue-800",
    bgColor: "bg-blue-50 border-blue-200",
    description: "Uw apparaat is in goede orde ontvangen. We gaan er zo snel mogelijk mee aan de slag.",
    step: 1,
  },
  "In reparatie": {
    icon: "🔧",
    label: "In reparatie",
    color: "text-yellow-800",
    bgColor: "bg-yellow-50 border-yellow-200",
    description: "Onze monteur is bezig met uw reparatie.",
    step: 3,
  },
  "Besteld": {
    icon: "📦",
    label: "Onderdeel besteld",
    color: "text-orange-800",
    bgColor: "bg-orange-50 border-orange-200",
    description: "We hebben een onderdeel besteld voor uw reparatie. Zodra het binnen is, gaan we verder.",
    step: 2,
  },
  "Reparatie klaar": {
    icon: "✅",
    label: "Klaar voor afhalen",
    color: "text-green-800",
    bgColor: "bg-green-50 border-green-200",
    description: "Goed nieuws! Uw apparaat is gerepareerd en klaar om opgehaald te worden.",
    step: 4,
  },
  "Afgehaald": {
    icon: "🏠",
    label: "Afgehaald",
    color: "text-gray-700",
    bgColor: "bg-gray-50 border-gray-200",
    description: "Uw apparaat is afgehaald. Bedankt voor uw vertrouwen!",
    step: 5,
  },
  "Geannuleerd": {
    icon: "❌",
    label: "Geannuleerd",
    color: "text-red-800",
    bgColor: "bg-red-50 border-red-200",
    description: "Deze reparatie is geannuleerd. Neem contact op voor meer informatie.",
    step: 0,
  },
};

const STEPS = [
  { step: 1, label: "Ontvangen" },
  { step: 2, label: "Onderdeel besteld" },
  { step: 3, label: "In reparatie" },
  { step: 4, label: "Klaar" },
  { step: 5, label: "Afgehaald" },
];

export default function StatusClient({ repair, error }: StatusClientProps) {
  if (error || !repair) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Reparatie niet gevonden</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Heeft u vragen? Neem contact op:</p>
            <p className="font-bold text-gray-800 mt-1">{COMPANY.phone}</p>
            <p className="text-blue-600">{COMPANY.email}</p>
          </div>
        </div>
      </div>
    );
  }

  const status = repair.status || "Nieuw";
  const info = STATUS_INFO[status] || STATUS_INFO["Nieuw"];
  const jobId = repair.job_id;
  const klantNaam = repair.customer_name || "Klant";
  const merk = repair.device_brand || "";
  const model = repair.device_model || "";
  const datumIn = repair.datum_in || repair.created_at;

  // Parse onderdeel_naam
  let onderdeelDisplay = "";
  if (repair.onderdeel_naam) {
    try {
      const parsed = JSON.parse(repair.onderdeel_naam);
      if (Array.isArray(parsed)) {
        onderdeelDisplay = parsed.map((p: any) => p.naam).filter(Boolean).join(", ");
      }
    } catch {
      onderdeelDisplay = repair.onderdeel_naam;
    }
  }

  // If status is "In reparatie" or later (but not "Besteld"), 
  // and no onderdeel was ordered, show without Besteld step
  const showBesteldStep = status === "Besteld" || !!onderdeelDisplay;
  const activeSteps = showBesteldStep
    ? STEPS
    : STEPS.filter((s) => s.step !== 2);
  
  // Remap step numbers for display when Besteld is hidden
  const currentStep = showBesteldStep
    ? info.step
    : status === "In reparatie" ? 2 : status === "Reparatie klaar" ? 3 : status === "Afgehaald" ? 4 : info.step;

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString("nl-NL", {
      day: "2-digit", month: "long", year: "numeric",
    }) : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center p-4">
      {/* Header */}
      <div className="mt-6 mb-6 text-center">
        <img src="/logo.png" alt="Logo" className="h-16 mx-auto mb-2" />
        <h1 className="text-lg font-bold text-gray-800">{COMPANY.name}</h1>
        <p className="text-sm text-gray-500">{COMPANY.tagline}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md overflow-hidden">
        {/* Status header */}
        <div className={`p-6 border-2 ${info.bgColor} text-center`}>
          <div className="text-5xl mb-2">{info.icon}</div>
          <h2 className={`text-2xl font-black ${info.color}`}>{info.label}</h2>
          <p className={`text-sm mt-1 ${info.color} opacity-80`}>{info.description}</p>
        </div>

        {/* Progress bar */}
        {info.step > 0 && (
          <div className="px-6 py-4 border-b">
            <div className="flex justify-between items-center">
              {activeSteps.map((s, i) => (
                <div key={s.step} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${
                      (showBesteldStep ? s.step <= info.step : i + 1 <= currentStep)
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {(showBesteldStep ? s.step <= info.step : i + 1 <= currentStep) ? "✓" : i + 1}
                  </div>
                  <span className="text-[10px] text-gray-500 text-center">{s.label}</span>
                </div>
              ))}
            </div>
            {/* Connector line */}
            <div className="flex mt-[-28px] mb-4 mx-4 -z-10 relative">
              {activeSteps.slice(0, -1).map((s, i) => (
                <div
                  key={s.step}
                  className={`flex-1 h-1 ${
                    (showBesteldStep ? s.step < info.step : i + 1 < currentStep) ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Besteld onderdeel info */}
        {status === "Besteld" && onderdeelDisplay && (
          <div className="mx-6 mt-4 p-4 bg-orange-50 rounded-xl border border-orange-200 text-center">
            <p className="text-orange-800 font-bold text-sm">📦 Besteld onderdeel</p>
            <p className="text-orange-900 font-semibold text-lg mt-1">{onderdeelDisplay}</p>
            <p className="text-orange-700 text-xs mt-1">Zodra het onderdeel binnen is, gaan we verder met de reparatie.</p>
          </div>
        )}

        {/* Repair details */}
        <div className="p-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Referentienr.</span>
            <span className="font-mono font-bold text-lg">{jobId}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Klant</span>
            <span className="font-medium">{klantNaam}</span>
          </div>

          {(merk || model) && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Apparaat</span>
              <span className="font-medium">{merk} {model}</span>
            </div>
          )}

          {datumIn && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Ingenomen op</span>
              <span className="font-medium">{formatDate(datumIn)}</span>
            </div>
          )}

          {status === "Reparatie klaar" && (
            <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200 text-center">
              <p className="text-green-800 font-bold text-lg">📍 Klaar om op te halen!</p>
              <p className="text-green-700 text-sm mt-1">
                Kom langs tijdens openingstijden om uw apparaat op te halen.
              </p>
            </div>
          )}
        </div>

        {/* Contact footer */}
        <div className="bg-gray-50 p-4 text-center border-t">
          <p className="text-xs text-gray-500 mb-1">Vragen over uw reparatie?</p>
          <p className="font-bold text-gray-800">{COMPANY.phone}</p>
          <p className="text-blue-600 text-sm">{COMPANY.email}</p>
          {COMPANY.website && (
            <p className="text-gray-400 text-xs mt-1">{COMPANY.website}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-400 mt-6 mb-4">
        © {new Date().getFullYear()} {COMPANY.name}
      </p>
    </div>
  );
}
