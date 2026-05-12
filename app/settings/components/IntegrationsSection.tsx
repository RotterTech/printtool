"use client";

import { useState, useEffect } from "react";
import { Link2, Eye, EyeOff, Save, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface IntegrationStatus {
  connected: boolean;
  message: string;
  lastChecked?: string;
}

export default function IntegrationsSection() {
  const [wefactApiKey, setWefactApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [wefactStatus, setWefactStatus] = useState<IntegrationStatus | null>(null);

  // Load saved API key status on mount (not the actual key for security)
  useEffect(() => {
    checkWefactConnection();
  }, []);

  // Test WeFact connection
  const checkWefactConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/wefact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "search",
          clientData: { searchTerm: "test" }
        }),
      });

      const data = await response.json();

      if (data.code === "NO_API_KEY") {
        setWefactStatus({
          connected: false,
          message: "API sleutel niet geconfigureerd",
          lastChecked: new Date().toLocaleTimeString("nl-NL"),
        });
      } else if (response.ok || data.status === "success") {
        setWefactStatus({
          connected: true,
          message: "Verbonden met WeFact",
          lastChecked: new Date().toLocaleTimeString("nl-NL"),
        });
      } else {
        setWefactStatus({
          connected: false,
          message: data.userMessage || data.message || "Verbinding mislukt",
          lastChecked: new Date().toLocaleTimeString("nl-NL"),
        });
      }
    } catch (error: any) {
      setWefactStatus({
        connected: false,
        message: "Kon niet testen: " + (error.message || "onbekende fout"),
        lastChecked: new Date().toLocaleTimeString("nl-NL"),
      });
    } finally {
      setTesting(false);
    }
  };

  // Note: Setting environment variables at runtime is not possible in Next.js
  // This UI is for informational purposes - the actual key must be set in .env
  const handleSaveApiKey = async () => {
    if (!wefactApiKey.trim()) {
      toast.error("Voer een API sleutel in");
      return;
    }

    setSaving(true);
    try {
      // Since we can't set env vars at runtime, show instructions
      toast.info(
        "Om de API sleutel te activeren:\n\n" +
        "1. Open het bestand .env.local\n" +
        "2. Voeg toe: WEFACT_API_KEY=" + wefactApiKey + "\n" +
        "3. Herstart de server",
        { duration: 10000 }
      );

      // Copy to clipboard
      await navigator.clipboard.writeText(`WEFACT_API_KEY=${wefactApiKey}`);
      toast.success("API sleutel gekopieerd naar klembord!", { duration: 3000 });

    } catch (error: any) {
      toast.error("Kon niet kopiëren: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-blue-600" />
          Integraties
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Beheer koppelingen met externe systemen
        </p>
      </div>

      {/* WeFact Integration */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">WF</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">WeFact</h4>
                <p className="text-sm text-gray-600">Facturatie & Klantenbeheer</p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              {testing ? (
                <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testen...
                </span>
              ) : wefactStatus?.connected ? (
                <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Verbonden
                </span>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  Niet verbonden
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Status Message */}
          {wefactStatus && (
            <div className={`p-3 rounded-lg text-sm ${
              wefactStatus.connected 
                ? "bg-green-50 text-green-800 border border-green-200" 
                : "bg-yellow-50 text-yellow-800 border border-yellow-200"
            }`}>
              <p>{wefactStatus.message}</p>
              {wefactStatus.lastChecked && (
                <p className="text-xs mt-1 opacity-75">
                  Laatst gecontroleerd: {wefactStatus.lastChecked}
                </p>
              )}
            </div>
          )}

          {/* API Key Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              API Sleutel
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={wefactApiKey}
                  onChange={(e) => setWefactApiKey(e.target.value)}
                  placeholder="Voer je WeFact API sleutel in..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleSaveApiKey}
                disabled={saving || !wefactApiKey.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Kopieer
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Je vindt je API sleutel in WeFact onder Instellingen → API
            </p>
          </div>

          {/* Test Connection Button */}
          <button
            onClick={checkWefactConnection}
            disabled={testing}
            className="w-full py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verbinding testen...
              </>
            ) : (
              <>
                🔌 Test Verbinding
              </>
            )}
          </button>

          {/* Instructions */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h5 className="font-semibold text-gray-900 mb-2">📋 Installatie Instructies</h5>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Log in op <a href="https://mijnwefact.nl" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">mijnwefact.nl</a></li>
              <li>Ga naar Instellingen → API</li>
              <li>Kopieer je API sleutel</li>
              <li>Plak de sleutel hierboven en klik "Kopieer"</li>
              <li>Voeg de regel toe aan je <code className="bg-gray-200 px-1 rounded">.env.local</code> bestand</li>
              <li>Herstart de server</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Future: Other Integrations */}
      <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
        <p className="font-medium">Meer integraties komen binnenkort</p>
        <p className="text-sm mt-1">Exact, Moneybird, Mollie, etc.</p>
      </div>
    </div>
  );
}
