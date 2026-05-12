"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Printer, Save, Tag, SlidersHorizontal, RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";
import LabelWrapper from "@/components/labels/LabelWrapper";
import { LABEL_FORMATS as FORMAT_SPECS, type LabelFormatKey } from "@/lib/label-formats";
import LabelPreview from "@/components/LabelPreview";
import { PartLabel } from "@/components/PartLabel";
import AccessoryLabel from "@/components/AccessoryLabel";
import RefurbishedLabel from "@/components/RefurbishedLabel";
import InnameBon from "@/components/receipts/InnameBon";
import WerkBon from "@/components/receipts/WerkBon";
import AfhaalBon from "@/components/receipts/AfhaalBon";
import GarantieKaart from "@/components/receipts/GarantieKaart";
import VerkoopBon from "@/components/receipts/VerkoopBon";
import OfferteBon from "@/components/receipts/OfferteBon";

const LABEL_FORMATS = [
  { id: "dymo_99014", name: "Dymo 99014 (54x101mm)" },
  { id: "brother_62mm", name: "Brother 62mm" },
  { id: "brother_29mm", name: "Brother 29mm" },
  { id: "zebra_4x6", name: "Zebra 4x6 inch" },
  { id: "receipt_80mm", name: "Bon printer 80mm" },
];

const ORIENTATIONS = [
  { id: "portrait", name: "Staand (Portrait)" },
  { id: "landscape", name: "Liggend (Landscape)" },
];

export default function PrinterSettingsSection() {
  const [autoPrint, setAutoPrint] = useState(true);
  const [defaultFormat, setDefaultFormat] = useState("brother_62mm");
  const [fontSizeModifier, setFontSizeModifier] = useState(1.0);
  const [orientation, setOrientation] = useState("portrait");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewTab, setPreviewTab] = useState("repair");
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  // Auto-scale preview to fit container
  const updatePreviewScale = useCallback(() => {
    const container = previewContainerRef.current;
    const content = previewContentRef.current;
    if (!container || !content) return;
    // wait one frame for layout
    requestAnimationFrame(() => {
      const cw = container.clientWidth - 48; // padding
      const sw = content.scrollWidth;
      if (sw > cw && sw > 0) {
        setPreviewScale(cw / sw);
      } else {
        setPreviewScale(1);
      }
    });
  }, []);

  useEffect(() => {
    updatePreviewScale();
  }, [defaultFormat, orientation, fontSizeModifier, previewTab, updatePreviewScale]);

  // Load settings on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/label");
        if (!res.ok) throw new Error("Laden mislukt");
        const data = await res.json();
        const s = data.label_settings;
        if (s) {
          setDefaultFormat(s.default_format ?? "brother_62mm");
          setAutoPrint(s.auto_print ?? true);
          setFontSizeModifier(s.font_size_modifier ?? 1.0);
          setOrientation(s.orientation ?? "portrait");
        }
      } catch {
        toast.error("Kon printer instellingen niet laden");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/label", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_format: defaultFormat,
          auto_print: autoPrint,
          font_size_modifier: fontSizeModifier,
          orientation,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Opslaan mislukt");
      }
      toast.success("Printer instellingen opgeslagen");
    } catch (err: any) {
      toast.error(err.message || "Fout bij opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Printers & Labels</h2>
        <p className="text-gray-600 mt-1">
          Configureer standaard printer instellingen
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          Instellingen laden...
        </div>
      )}

      {/* Settings */}
      <div className="space-y-6">
        {/* Auto Print Toggle */}
        <div className="p-5 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Printer className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  Automatisch Printen
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Print labels automatisch na het aanmaken van een reparatie of
                  onderdeel
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={() => setAutoPrint(!autoPrint)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoPrint ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoPrint ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Label Format Selector */}
        <div className="p-5 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Tag className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Standaard Formaat</h3>
              <p className="text-sm text-gray-600 mt-1">
                Kies het standaard label formaat voor deze werkplaats
              </p>
            </div>
          </div>

          <div className="ml-11 space-y-2">
            {LABEL_FORMATS.map((format) => (
              <label
                key={format.id}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name="labelFormat"
                  value={format.id}
                  checked={defaultFormat === format.id}
                  onChange={(e) => setDefaultFormat(e.target.value)}
                  className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900">
                  {format.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Font Size Modifier */}
        <div className="p-5 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <SlidersHorizontal className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Lettergrootte</h3>
              <p className="text-sm text-gray-600 mt-1">
                Pas de lettergrootte aan voor labels ({(fontSizeModifier * 100).toFixed(0)}%)
              </p>
            </div>
          </div>
          <div className="ml-11">
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={fontSizeModifier}
              onChange={(e) => setFontSizeModifier(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>50%</span>
              <span>100%</span>
              <span>200%</span>
            </div>
          </div>
        </div>

        {/* Orientation */}
        <div className="p-5 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <RotateCcw className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Oriëntatie</h3>
              <p className="text-sm text-gray-600 mt-1">
                Kies de standaard oriëntatie voor labels
              </p>
            </div>
          </div>
          <div className="ml-11 space-y-2">
            {ORIENTATIONS.map((o) => (
              <label
                key={o.id}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name="orientation"
                  value={o.id}
                  checked={orientation === o.id}
                  onChange={(e) => setOrientation(e.target.value)}
                  className="w-4 h-4 text-orange-600 focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-gray-900">
                  {o.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Live Label Preview */}
        <LivePreview
          defaultFormat={defaultFormat}
          fontSizeModifier={fontSizeModifier}
          orientation={orientation}
          previewTab={previewTab}
          setPreviewTab={setPreviewTab}
          previewContainerRef={previewContainerRef}
          previewContentRef={previewContentRef}
          previewScale={previewScale}
        />

        {/* Test Print Button */}
        <div className="p-5 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Test Print</h3>
              <p className="text-sm text-gray-600 mt-1">
                Print een test label om je instellingen te controleren
              </p>
            </div>
            <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
              Print Test Label
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Opslaan...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Wijzigingen Opslaan
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Mock data for preview ──

const MOCK_REPAIR = {
  jobId: "TEST-001",
  job_id: "TEST-001",
  customer_name: "Demo Klant",
  first_name: "Demo",
  last_name: "Klant",
  customer_email: "demo@voorbeeld.nl",
  customer_phone: "06-12345678",
  device_brand: "Apple",
  device_model: "MacBook Pro 14\"",
  device_type: "laptop",
  serial_number: "C02X1234ABCD",
  problem_description: "Scherm defect — zwarte vlekken rechtsboven, touch werkt niet meer na val",
  agreed_price: "249",
  created_at: "2026-04-16T10:30:00Z",
  status: "In behandeling",
  accessories: [
    { type: "charger", label: "USB-C Lader 96W", quantity: 1, notes: "Origineel Apple" },
  ],
  onderdeel_naam: "LCD Panel 14\" Retina",
  onderdeel_leverancier: "iFixit",
  onderdeel_besteld: true,
};

const MOCK_APK = {
  type: "apk",
  job_id: "APK-088",
  customer_name: "Jan de Vries",
  device_brand: "HP",
  device_model: "EliteBook 840 G8",
};

const MOCK_REFURBISHED = {
  brand: "Dell",
  model: "Latitude 5520",
  cpu: "Intel Core i5-1145G7",
  ram: "16GB DDR4",
  ssd: "512GB NVMe SSD",
  screen: "15.6\" Full HD IPS",
  graphics: "Intel Iris Xe",
  ports: ["USB-A ×2", "USB-C", "HDMI", "Ethernet"],
  os: "Windows 11 Pro",
  price: "349",
};

const MOCK_PART = {
  short_id: "PRD-042",
  category: "Scherm",
  brand: "LG",
  model: "LP156WF6-SPB1",
  specs: '15.6" FHD IPS 30-pin eDP',
  serial_number: "YGT7210034",
  note: "Uit Dell Latitude 5510 — geen dode pixels",
  quantity: 2,
};

const MOCK_ACCESSORY = {
  type: "charger",
  label: "65W USB-C Lader",
  quantity: 1,
  notes: "Universeel, werkt met Dell/HP/Lenovo",
};

const MOCK_VERKOOP = {
  brand: "Dell",
  model: "Latitude 5520",
  cpu: "i5-1145G7",
  ram: "16GB",
  ssd: "512GB",
  screen: "15.6\"",
  os: "Windows 11 Pro",
  price: "349",
  id: "REF-2026-042",
};

const MOCK_OFFERTE_REGELS = [
  { label: "Diagnose & arbeid", amount: 49 },
  { label: "LCD Panel 14\" Retina", amount: 189 },
  { label: "Montage", amount: 0 },
];

type PreviewTabId =
  | "repair"
  | "apk"
  | "refurbished"
  | "part"
  | "accessory"
  | "innamebon"
  | "werkbon"
  | "afhaalbon"
  | "garantie"
  | "verkoopbon"
  | "offerte";

const PREVIEW_TABS: { id: PreviewTabId; label: string }[] = [
  { id: "repair", label: "Reparatie" },
  { id: "apk", label: "APK" },
  { id: "refurbished", label: "Refurbished" },
  { id: "part", label: "Onderdeel" },
  { id: "accessory", label: "Accessoire" },
  { id: "innamebon", label: "Inname bon" },
  { id: "werkbon", label: "Werk bon" },
  { id: "afhaalbon", label: "Afhaal bon" },
  { id: "garantie", label: "Garantiekaart" },
  { id: "verkoopbon", label: "Verkoop bon" },
  { id: "offerte", label: "Offerte bon" },
];

function LivePreview({
  defaultFormat,
  fontSizeModifier,
  orientation,
  previewTab,
  setPreviewTab,
  previewContainerRef,
  previewContentRef,
  previewScale,
}: {
  defaultFormat: string;
  fontSizeModifier: number;
  orientation: string;
  previewTab: string;
  setPreviewTab: (t: string) => void;
  previewContainerRef: React.RefObject<HTMLDivElement | null>;
  previewContentRef: React.RefObject<HTMLDivElement | null>;
  previewScale: number;
}) {
  const fk = defaultFormat as LabelFormatKey;
  const fmt = FORMAT_SPECS[fk] ?? FORMAT_SPECS.brother_62mm;
  const widthMm = orientation === "landscape" && fmt.heightMm ? fmt.heightMm : fmt.widthMm;
  const heightMm = orientation === "landscape" && fmt.heightMm ? fmt.widthMm : fmt.heightMm;
  const formatLabel = LABEL_FORMATS.find((f) => f.id === defaultFormat)?.name ?? defaultFormat;
  const dimLabel = heightMm ? `${widthMm}mm × ${heightMm}mm` : `${widthMm}mm (auto hoogte)`;

  const renderContent = () => {
    switch (previewTab as PreviewTabId) {
      case "repair":
        return <LabelPreview repair={MOCK_REPAIR} />;
      case "apk":
        return <LabelPreview repair={MOCK_APK} />;
      case "refurbished":
        return <RefurbishedLabel data={MOCK_REFURBISHED} />;
      case "part":
        return <PartLabel part={MOCK_PART} previewMode />;
      case "accessory":
        return (
          <AccessoryLabel
            accessory={MOCK_ACCESSORY}
            jobId="TEST-001"
            customerName="Demo Klant"
          />
        );
      case "innamebon":
        return <InnameBon repair={MOCK_REPAIR} />;
      case "werkbon":
        return <WerkBon repair={MOCK_REPAIR} />;
      case "afhaalbon":
        return <AfhaalBon repair={MOCK_REPAIR} />;
      case "garantie":
        return <GarantieKaart repair={MOCK_REPAIR} garantieDagen={90} />;
      case "verkoopbon":
        return (
          <VerkoopBon
            item={MOCK_VERKOOP}
            koper={{ naam: "Demo Klant", email: "demo@voorbeeld.nl", telefoon: "06-12345678" }}
          />
        );
      case "offerte":
        return <OfferteBon repair={MOCK_REPAIR} kostenRegels={MOCK_OFFERTE_REGELS} geldigDagen={14} />;
      default:
        return <LabelPreview repair={MOCK_REPAIR} />;
    }
  };

  return (
    <div className="p-5 bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Eye className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">Live Preview</h3>
          <p className="text-sm text-gray-600 mt-1">
            {formatLabel} — {dimLabel}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="ml-11 mb-4 flex flex-wrap gap-1">
        {PREVIEW_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPreviewTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              previewTab === tab.id
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Preview canvas */}
      <div
        ref={previewContainerRef}
        className="ml-11 bg-gray-200 rounded-lg p-6 overflow-auto"
        style={{ minHeight: 200 }}
      >
        <div
          style={{
            transform: `scale(${previewScale})`,
            transformOrigin: "top left",
            width: previewScale < 1 ? `${100 / previewScale}%` : undefined,
          }}
        >
          <div
            ref={previewContentRef}
            className="bg-white shadow-lg inline-block"
            style={{
              /* rotate inner wrapper for landscape orientation override */
              ...(orientation === "landscape" && fmt.autoHeight
                ? { transform: "rotate(-90deg)", transformOrigin: "top left", marginTop: "100%" }
                : {}),
            }}
          >
            <LabelWrapper formatKey={fk} fontSizeModifier={fontSizeModifier}>
              {renderContent()}
            </LabelWrapper>
          </div>
        </div>
      </div>
    </div>
  );
}
