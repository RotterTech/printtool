"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PartLabel } from "@/components/PartLabel";
import LabelPreview from "@/components/LabelPreview";
import { toast } from "sonner";
import { queuePartLabel } from "@/lib/print-queue-helpers";
import {
  ArrowLeft,
  MemoryStick,
  HardDrive,
  Wifi,
  Battery,
  Monitor,
  Keyboard,
  Cable,
  Cpu,
  Gamepad2,
  Box,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

// Brand constants (same as Repair Form)
const BRANDS = ["Lenovo", "HP", "Dell", "Asus", "Acer", "Apple", "Microsoft", "Overig"];

const MODELS_BY_BRAND: Record<string, string[]> = {
  Lenovo: [
    "ThinkPad X1",
    "ThinkPad T",
    "ThinkPad E",
    "ThinkPad L",
    "IdeaPad",
    "Yoga",
    "Legion",
    "ThinkBook",
    "Anders...",
  ],
  HP: [
    "ProBook",
    "EliteBook",
    "Pavilion",
    "Envy",
    "Spectre",
    "ZBook",
    "Anders...",
  ],
  Dell: [
    "Latitude",
    "XPS",
    "Inspiron",
    "Precision",
    "Vostro",
    "Anders...",
  ],
  Asus: [
    "ZenBook",
    "VivoBook",
    "ROG",
    "TUF",
    "ExpertBook",
    "Anders...",
  ],
  Acer: [
    "Aspire",
    "Swift",
    "Nitro",
    "Predator",
    "Anders...",
  ],
  Apple: [
    "MacBook Air",
    "MacBook Pro",
    "iMac",
    "Mac Mini",
    "Anders...",
  ],
  Microsoft: [
    "Surface Laptop",
    "Surface Pro",
    "Surface Book",
    "Surface Go",
    "Anders...",
  ],
  Overig: [
    "Samsung",
    "MSI",
    "Toshiba",
    "Sony",
    "Fujitsu",
    "Anders...",
  ],
};

// Part types - MUST match PART_ICONS keys exactly
const PART_TYPES = [
  "RAM",
  "SSD",
  "HDD",
  "WiFi",
  "Battery",
  "Screen",
  "Keyboard",
  "Adapter",
  "CPU",
  "GPU",
  "Motherboard",
  "Overig",
];

// Icon mapping with fallback safety - keys MUST match PART_TYPES exactly
const PART_ICONS: Record<string, any> = {
  RAM: MemoryStick,
  SSD: HardDrive,
  HDD: HardDrive,
  WiFi: Wifi,
  Battery: Battery,
  Screen: Monitor,
  Keyboard: Keyboard,
  Adapter: Cable,
  CPU: Cpu,
  GPU: Gamepad2,
  Motherboard: Cpu,
  Overig: Box,
};

// Smart Presets for common components - minimizes typing
const PART_PRESETS: Record<string, Record<string, string[]>> = {
  RAM: {
    type: ["DDR3", "DDR3L", "DDR4", "DDR5"],
    size: ["2GB", "4GB", "8GB", "16GB", "32GB"],
    speed: ["1600MHz", "2400MHz", "2666MHz", "3200MHz"],
  },
  SSD: {
    type: ["2.5\" SATA", "M.2 NVMe", "M.2 SATA"],
    size: ["128GB", "256GB", "512GB", "1TB", "2TB", "4TB"],
  },
  HDD: {
    type: ["3.5\" HDD", "2.5\" HDD"],
    size: ["500GB", "750GB", "1TB", "2TB", "4TB"],
  },
  CPU: {
    brand: ["Intel", "AMD"],
    series: ["Core i3", "Core i5", "Core i7", "Core i9", "Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
  },
  GPU: {
    brand: ["NVIDIA", "AMD"],
    type: ["GTX", "RTX", "Radeon", "Quadro"],
  },
  Screen: {
    size: ["13.3\"", "14.0\"", "15.6\"", "17.3\""],
    resolution: ["HD (1366x768)", "FHD (1920x1080)", "2K", "4K"],
    type: ["Mat", "Glanzend", "Touch"],
  },
  Battery: {
    type: ["Li-Ion", "Li-Po"],
    voltage: ["3.7V", "7.4V", "10.8V", "14.8V"],
  },
  WiFi: {
    standard: ["802.11a", "802.11b/g", "802.11n", "802.11ac", "802.11ax"],
  },
};

// Generate short, readable part ID: "P" + 6 random alphanumeric (uppercase) (SSR-safe)
const generateShortId = () => {
  if (typeof window === 'undefined') return "PXXXXXX";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "P";
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

type Part = {
  type: string;
  specs: string;
  serial: string;
  repairName: string;
  notes: string;
  quantity: number;
  active: boolean;
  // For smart dropdowns
  presetSelections?: Record<string, string>;
};

type SourceDevice = {
  brand: string;
  model: string;
};

function PartsPageClient() {
  const searchParams = useSearchParams();
  const [source, setSource] = useState<SourceDevice>({
    brand: "",
    model: "",
  });
  const [customModel, setCustomModel] = useState("");

  const [parts, setParts] = useState<Record<string, Part>>(
    PART_TYPES.reduce(
      (acc, partName) => ({
        ...acc,
        [partName]: {
          type: partName,
          specs: "",
          serial: "",
          repairName: "",
          notes: "",
          quantity: 1,
          active: false,
          presetSelections: {},
        },
      }),
      {}
    )
  );

  const [submitting, setSubmitting] = useState(false);
  const [createdParts, setCreatedParts] = useState<any[]>([]);
  const [openSection, setOpenSection] = useState<string>('device');
  const [customBrandMode, setCustomBrandMode] = useState(false);
  const [customBrandInput, setCustomBrandInput] = useState("");
  const [andersModelMode, setAndersModelMode] = useState(false);
  const modelDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const togglePart = (partType: string) => {
    setParts((prev) => {
      const nextActive = !prev[partType].active;
      if (nextActive) {
        setOpenSection("details");
      }
      return {
        ...prev,
        [partType]: {
          ...prev[partType],
          active: nextActive,
        },
      };
    });
  };
  const handleModelClick = (model: string) => {
    if (model === "Anders...") {
      setAndersModelMode(true);
      setCustomModel("");
      setSource((prev) => ({ ...prev, model: "" }));
    } else {
      setAndersModelMode(false);
      setCustomModel("");
      setSource((prev) => ({ ...prev, model }));
      setOpenSection("category");
    }
  };

  const printLabels = (items: any[]) => {
    if (!items || items.length === 0) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const barcodeElement = document.getElementById("barcode-preview-element");
    const barcodeHtml = barcodeElement?.outerHTML || "";

    const labelsHtml = items
      .map((item: any, index: number) => {
        const category = (item.category || item.part_type || item.type || "PART").toUpperCase();
        const qty = String(item.quantity || 1);
        const displayId = item.short_id || item.part_id || item.id || "ERROR";
        const barcodeValue = item.short_id || item.part_id || item.id || "ERROR";
        const brand = item.brand || item.source_brand || "";
        const model = item.model || item.source_model || "";
        const specs = item.specs || item.part_specs || "";
        const serial = item.serial_number || item.part_serial || "";
        const notes = item.note || item.part_notes || "";
        const harvested = item.harvested_date || item.created_at || "";
        const harvestedDate = harvested
          ? new Date(harvested).toLocaleString("nl-NL", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

        return `
          <div class="label">
            <div class="header">
              <div class="category">${category}</div>
              <div class="qty">Qty: ${qty}</div>
            </div>
            <div class="body">
              <div class="specs">${specs || "—"}</div>
              <div class="device">${[brand, model].filter(Boolean).join(" ")}</div>
              ${serial ? `<div class="serial">SN: ${serial}</div>` : ""}
              ${notes ? `<div class="notes">${notes}</div>` : ""}
              ${harvestedDate ? `<div class="harvested">${harvestedDate}</div>` : ""}
            </div>
            <div class="barcode-block">
              <div class="id">ID: ${displayId}</div>
              <svg class="barcode" data-value="${barcodeValue}"></svg>
            </div>
          </div>
          ${index < items.length - 1 ? '<div class="page-break"></div>' : ""}
        `;
      })
      .join("");

    doc.open();
    doc.write(`
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
          <style>
            @page { size: 62mm auto; margin: 0; }
            
            body {
              margin: 0;
              padding: 0;
              font-family: sans-serif;
              width: 62mm;
              background: white;
            }

            .label {
              width: 62mm;
              box-sizing: border-box;
              border: 2px solid black;
              padding: 6mm 2.5mm 9mm 2.5mm;
              display: flex;
              flex-direction: column;
              gap: 3mm;
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid black;
              padding-bottom: 1mm;
            }

            .category {
              font-size: 12px;
              font-weight: 900;
            }

            .qty {
              font-size: 11px;
              font-weight: 700;
            }

            .body {
              text-align: center;
              border-bottom: 2px solid black;
              padding-bottom: 2mm;
            }

            .specs {
              font-size: 16px;
              font-weight: 900;
              line-height: 1.1;
            }

            .device {
              font-size: 11px;
              font-weight: 700;
            }

            .serial {
              font-size: 9px;
              font-family: monospace;
              margin-top: 1mm;
            }

            .notes {
              font-size: 9px;
              margin-top: 1mm;
            }

            .harvested {
              font-size: 8px;
              margin-top: 1mm;
              color: #555;
            }

            .barcode-block {
              text-align: center;
            }

            .id {
              font-size: 9px;
              font-family: monospace;
              font-weight: 700;
              margin-bottom: 2mm;
            }

            svg.barcode {
              height: 60px !important;
              width: 100% !important;
              display: block;
            }
            
            .page-break {
              page-break-after: always;
            }
          </style>
        </head>
        <body>
          ${labelsHtml}
          <script>
            window.addEventListener('load', () => {
              const nodes = document.querySelectorAll('svg.barcode');
              nodes.forEach((svg) => {
                const value = svg.getAttribute('data-value') || '';
                if (!value) return;
                JsBarcode(svg, value, {
                  format: 'CODE128',
                  displayValue: false,
                  height: 60,
                  width: 2.8,
                  margin: 0,
                });
              });
            });
          </script>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 300);
  };

  const updatePartPreset = (partType: string, presetKey: string, value: string) => {
    setParts((prev) => {
      const updatedPart = {
        ...prev[partType],
        presetSelections: {
          ...prev[partType].presetSelections,
          [presetKey]: value,
        },
      };

      // Auto-fill specs based on selected presets
      if (PART_PRESETS[partType]) {
        const selections = updatedPart.presetSelections!;
        let autoSpecs = "";

        if (partType === "RAM") {
          autoSpecs = [selections.type, selections.size, selections.speed]
            .filter(Boolean)
            .join(" ");
        } else if (partType === "SSD" || partType === "HDD") {
          autoSpecs = [selections.type, selections.size]
            .filter(Boolean)
            .join(" ");
        } else if (partType === "CPU") {
          autoSpecs = [selections.brand, selections.series]
            .filter(Boolean)
            .join(" ");
        } else if (partType === "GPU") {
          autoSpecs = [selections.brand, selections.type]
            .filter(Boolean)
            .join(" ");
        } else if (partType === "Screen") {
          autoSpecs = [selections.size, selections.resolution, selections.type]
            .filter(Boolean)
            .join(" ");
        } else if (partType === "Battery") {
          autoSpecs = [selections.type, selections.voltage]
            .filter(Boolean)
            .join(" ");
        } else if (partType === "WiFi") {
          autoSpecs = selections.standard || "";
        }

        if (autoSpecs && !updatedPart.specs.includes(autoSpecs)) {
          updatedPart.specs = autoSpecs;
        }
      }

      return {
        ...prev,
        [partType]: updatedPart,
      };
    });
  };

  const updatePart = (
    partType: string,
    field: keyof Part,
    value: string | boolean
  ) => {
    setParts((prev) => ({
      ...prev,
      [partType]: {
        ...prev[partType],
        [field]: value,
      },
    }));
  };

  const handleSaveAndPrint = async () => {
    // Validate source device
    if (!source.brand || !source.model.trim()) {
      toast.error("Selecteer merk en model van het apparaat.");
      return;
    }

    // Get active parts
    const activeParts = Object.values(parts).filter((p) => p.active);

    if (activeParts.length === 0) {
      toast.error("Selecteer minstens één onderdeel.");
      return;
    }

    // Validate active parts have specs
    const invalidParts = activeParts.filter((p) => !p.specs.trim());
    if (invalidParts.length > 0) {
      toast.error("Vul specs in voor alle actieve onderdelen.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = activeParts.map((part) => {
        const lockedShortId = generateShortId();
        const combinedNotes = [part.repairName, part.notes]
          .map((value) => value?.trim())
          .filter(Boolean)
          .join(" - ");
        return {
          short_id: lockedShortId,
          source_brand: source.brand,
          source_model: source.model,
          part_type: part.type,
          part_specs: part.specs,
          part_serial: part.serial || null,
          part_notes: combinedNotes || null,
          quantity: part.quantity || 1,
          harvested_date: new Date().toISOString(),
        };
      });

      const res = await fetch("/api/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts: payload }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("❌ Save error:", json);
        toast.error(json.error || "Opslaan mislukt.");
        return;
      }

      toast.success(
        `✅ ${activeParts.length} onderdeel${activeParts.length !== 1 ? "en" : ""} opgeslagen!`
      );

      if (json.parts && json.parts.length > 0) {
        const completeParts = json.parts.map((savedPart: any, index: number) => {
          const lockedPayload = payload[index];
          const lockedShortId = lockedPayload.short_id;

          const originalInput = activeParts.find(
            (p: any) => p.type === savedPart.category || p.type === savedPart.part_type
          );

          return {
            ...savedPart,
            short_id: lockedShortId,
            category: savedPart.category || savedPart.part_type || originalInput?.type,
            brand: source.brand,
            model: source.model,
            specs: savedPart.specs || savedPart.part_specs || originalInput?.specs,
            serial_number: savedPart.serial_number || savedPart.part_serial || originalInput?.serial || "",
            note: savedPart.note || savedPart.part_notes || originalInput?.notes || "",
                      quantity: savedPart.quantity || originalInput?.quantity || 1,
          };
        });

        setCreatedParts(completeParts);
        printLabels(completeParts);

        // Auto-print via queue if enabled
        try {
          const settingsRes = await fetch("/api/settings/label");
          if (settingsRes.ok) {
            const settings = await settingsRes.json();
            if (settings.auto_print) {
              for (const p of completeParts) {
                await queuePartLabel(p);
              }
              toast.success("Labels ook naar USB printer gestuurd!");
            }
          }
        } catch { /* ignore auto-print errors */ }
      }

      setSource({ brand: "", model: "" });
      setCustomModel("");
      setCustomBrandMode(false);
      setCustomBrandInput("");
      setAndersModelMode(false);
      setParts(
        PART_TYPES.reduce(
          (acc, partName) => ({
            ...acc,
            [partName]: {
              type: partName,
              specs: "",
              serial: "",
              repairName: "",
              notes: "",
              quantity: 1,
              active: false,
              presetSelections: {},
            },
          }),
          {}
        )
      );
      setOpenSection("device");
    } catch (e) {
      console.error("Save error:", e);
      toast.error("Opslaan mislukt (serverfout).");
    } finally {
      setSubmitting(false);
    }
  };

  const activeParts = Object.values(parts).filter((p) => p.active);

  useEffect(() => {
    const urlBrand = searchParams.get("brand")?.trim();
    const urlModel = searchParams.get("model")?.trim();

    if (!urlBrand && !urlModel) return;

    setSource((prev) => {
      const matchedBrand = urlBrand
        ? BRANDS.find((b) => b.toLowerCase() === urlBrand.toLowerCase())
        : null;

      const nextBrand = matchedBrand || urlBrand || prev.brand;
      const nextModel = urlModel ?? prev.model;

      if (nextBrand === prev.brand && nextModel === prev.model) return prev;

      if (urlBrand) {
        console.log("🔌 Auto-selecting brand:", urlBrand);
      }

      return {
        ...prev,
        brand: nextBrand,
        model: nextModel,
      };
    });
  }, [searchParams]);

  // Compute formData for preview
  const formData = {
    type: "part",
    mode: "part",
    category: activeParts.length > 0 ? activeParts[0]?.type : "",
    short_id: activeParts.length > 0 ? generateShortId() : "",
    brand: source.brand,
    model: source.model,
    specs: activeParts.length > 0 ? activeParts[0]?.specs : "",
    serial: activeParts.length > 0 ? activeParts[0]?.serial : "",
    notes: activeParts.length > 0
      ? [activeParts[0]?.repairName, activeParts[0]?.notes]
          .map((value) => value?.trim())
          .filter(Boolean)
          .join(" - ")
      : "",
    harvested_date: activeParts.length > 0 ? new Date().toISOString() : "",
    quantity: activeParts.length > 0 ? activeParts[0]?.quantity : 1,
  };

  // AccordionHeader Component
  const AccordionHeader = ({
    section,
    title,
    isOpen,
  }: {
    section: string;
    title: string;
    isOpen: boolean;
  }) => (
    <div
      onClick={() => setOpenSection(isOpen ? "" : section)}
      className="bg-blue-800 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-t-lg cursor-pointer flex justify-between items-center hover:bg-blue-700 transition-colors"
    >
      <h2 className="text-base sm:text-xl font-bold">{title}</h2>
      <ChevronDown
        className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${
          isOpen ? "rotate-180" : ""
        }`}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      {/* Screen UI - Hidden When Printing */}
      <div className="print:hidden">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-4 sm:mb-6">
          <Link
            href="/parts/inventory"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-lg border hover:bg-gray-100 font-semibold text-sm sm:text-lg mb-3 sm:mb-4"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="sm:hidden">Terug</span>
            <span className="hidden sm:inline">Terug naar Dashboard</span>
          </Link>

          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg px-4 py-3 sm:px-6 sm:py-4">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">🔧 Onderdelen Harvesten</h1>
              <p className="text-purple-100 mt-1 sm:mt-2 text-sm sm:text-base">
                Registreer onderdelen uit het apparaat
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Two-Column Layout: Form Left, Preview Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Left Column: Form (takes 2 columns on large screens) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Section 1: Source Device Selection */}
            <Card className="shadow-lg">
              <AccordionHeader
                section="device"
                title="1. Bron Apparaat"
                isOpen={openSection === "device"}
              />
              
              {openSection === "device" ? (
                <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 px-3 sm:px-6">
                  {/* Brand Selection */}
                  <div>
                    <label className="block text-base sm:text-lg font-bold mb-2 sm:mb-3">🖥️ Selecteer merk</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-3">
                      {BRANDS.map((brand) => (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => {
                            if (brand === "Overig") {
                              setCustomBrandMode(true);
                              setCustomBrandInput("");
                              setCustomModel("");
                              setAndersModelMode(false);
                              setSource({ brand: "", model: "" });
                            } else {
                              setCustomBrandMode(false);
                              setCustomBrandInput("");
                              setCustomModel("");
                              setAndersModelMode(false);
                              setSource({ ...source, brand, model: "" });
                            }
                          }}
                          className={`h-14 sm:h-20 rounded-lg font-bold text-sm sm:text-base transition-all active:scale-95 ${
                            (brand === "Overig" ? customBrandMode : source.brand === brand)
                              ? "bg-blue-600 text-white ring-2 ring-blue-600 shadow-lg"
                              : "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Model Selection */}
                  <div className="space-y-2 sm:space-y-3">
                    <label className="block text-base sm:text-lg font-bold mb-2">💻 Model</label>
                    {customBrandMode ? (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                        <p className="text-sm text-gray-600">✏️ Voer merk en model handmatig in</p>
                        <Input
                          placeholder="Merk (bijv. Sony)"
                          value={customBrandInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomBrandInput(val);
                            setSource((prev) => ({ ...prev, brand: val }));
                          }}
                          className="h-12 text-base"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Input
                            placeholder="Model (bijv. Vaio Pro 1)"
                            value={customModel}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomModel(val);
                              setSource((prev) => ({ ...prev, model: val }));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && customBrandInput.trim() && customModel.trim()) {
                                setOpenSection("category");
                              }
                            }}
                            className="h-12 text-base"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (customBrandInput.trim() && customModel.trim()) setOpenSection("category");
                            }}
                            disabled={!customBrandInput.trim() || !customModel.trim()}
                            className="px-4 h-12 rounded-lg bg-blue-600 text-white font-bold text-sm disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            Volgende →
                          </button>
                        </div>
                      </div>
                    ) : !source.brand ? (
                      <div className="h-11 sm:h-14 flex items-center px-3 sm:px-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-sm sm:text-lg">
                        Selecteer eerst een merk
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {(MODELS_BY_BRAND[source.brand] || []).map((model) => {
                            const isActive = source.model === model || (model === "Anders..." && andersModelMode);
                            return (
                              <button
                                key={model}
                                type="button"
                                onClick={() => handleModelClick(model)}
                                className={`px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold border transition ${
                                  isActive
                                    ? "bg-blue-600 text-white border-blue-600 shadow"
                                    : "bg-gray-100 text-gray-900 border-gray-300"
                                }`}
                              >
                                {model === "Anders..." ? "Anders" : model}
                              </button>
                            );
                          })}
                        </div>

                        {andersModelMode && (
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <label className="block text-base font-semibold text-gray-800 mb-2">
                              📝 Voer model handmatig in
                            </label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="e.g., ThinkPad X380 Yoga"
                                value={customModel}
                                onChange={(e) => {
                                  const customValue = e.target.value;
                                  setCustomModel(customValue);
                                  setSource((prev) => ({ ...prev, model: customValue }));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && customModel.trim()) {
                                    setOpenSection("category");
                                  }
                                }}
                                className="h-12 text-base"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => { if (customModel.trim()) setOpenSection("category"); }}
                                disabled={!customModel.trim()}
                                className="px-4 h-12 rounded-lg bg-blue-600 text-white font-bold text-sm disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                Volgende →
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              ) : (
                /* Collapsed Summary */
                <CardContent className="py-4">
                  {source.brand && source.model && source.model !== "Anders..." ? (
                    <p className="text-gray-700 font-medium">
                      📱 {source.brand} {source.model}
                    </p>
                  ) : (
                    <p className="text-gray-400 italic">Nog geen apparaat geselecteerd</p>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Section 2: Part Selection Grid */}
            <Card className="shadow-lg">
              <AccordionHeader
                section="category"
                title="2. Categorie Selectie"
                isOpen={openSection === "category"}
              />
              
              {openSection === "category" ? (
                <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 px-3 sm:px-6">
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                    {PART_TYPES.map((partName) => {
                      // Safe icon lookup with fallback to prevent crash
                      const Icon = PART_ICONS[partName] || HelpCircle;
                      const isActive = parts[partName]?.active || false;

                      return (
                        <button
                          key={partName}
                          type="button"
                          onClick={() => togglePart(partName)}
                          className={`h-16 sm:h-24 rounded-lg font-bold text-xs sm:text-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 sm:gap-1 ${
                            isActive
                              ? "bg-green-600 text-white border-2 border-green-600 shadow-md ring-2 ring-green-400"
                              : "bg-white text-gray-800 border-2 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <Icon className="w-5 h-5 sm:w-8 sm:h-8 mb-0.5 sm:mb-1" />
                          {partName}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              ) : (
                /* Collapsed Summary */
                <CardContent className="py-4">
                  {activeParts.length > 0 ? (
                    <p className="text-gray-700 font-medium">
                      ⚙️ {activeParts.length} categorie{activeParts.length !== 1 ? "ën" : ""} geselecteerd
                    </p>
                  ) : (
                    <p className="text-gray-400 italic">Geen categorieën geselecteerd</p>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Section 3: Part Details & Save */}
            <Card className="shadow-lg">
              <AccordionHeader
                section="details"
                title="3. Details & Printen"
                isOpen={openSection === "details"}
              />
              
              {openSection === "details" ? (
                <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 px-3 sm:px-6">
                  {activeParts.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <p className="text-gray-400 text-sm sm:text-lg italic">
                        Selecteer eerst een categorie in stap 2
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Part Details Forms */}
                      {activeParts.map((part) => (
                        <div
                          key={part.type}
                          className="border-2 border-orange-200 rounded-lg p-3 sm:p-6 bg-orange-50"
                        >
                          <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                            {part.type} Details
                          </h3>

                          <div className="space-y-3 sm:space-y-4">
                            {/* Smart Dropdowns for Common Parts */}
                            {PART_PRESETS[part.type] && (
                              <div className="bg-blue-50 border-2 border-blue-200 p-3 sm:p-4 rounded-lg">
                                <p className="text-xs sm:text-sm font-bold text-blue-900 mb-2 sm:mb-3">⚡ Quick Select</p>
                                <div className="space-y-2 sm:space-y-3">
                                  {Object.entries(PART_PRESETS[part.type]).map(([key, options]) => (
                                    <div key={key} className="space-y-1.5 sm:space-y-2">
                                      <p className="text-[10px] sm:text-xs font-semibold uppercase text-blue-900">{key}</p>
                                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                        {options.map((option) => {
                                          const isActive = part.presetSelections?.[key] === option;
                                          return (
                                            <button
                                              key={option}
                                              type="button"
                                              onClick={() => updatePartPreset(part.type, key, option)}
                                              className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold border transition ${
                                                isActive
                                                  ? "bg-blue-600 text-white border-blue-600 shadow"
                                                  : "bg-gray-100 text-gray-900 border-gray-300"
                                              }`}
                                            >
                                              {option}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Specs Input - Can be manually edited after auto-fill */}
                            <div>
                              <label className="block text-sm sm:text-lg font-bold mb-1.5 sm:mb-2">
                                Specificaties * <span className="text-xs sm:text-sm font-normal text-gray-600 hidden sm:inline">(Auto-filled)</span>
                              </label>
                              <Input
                                placeholder="e.g., 8GB DDR4, 512GB NVMe"
                                value={part.specs}
                                onChange={(e) =>
                                  updatePart(part.type, "specs", e.target.value)
                                }
                                className="h-11 sm:h-14 text-sm sm:text-lg font-medium"
                              />
                            </div>

                            {/* Serial Number Input */}
                            <div>
                              <label className="block text-sm sm:text-lg font-bold mb-1.5 sm:mb-2">
                                Serienummer <span className="text-xs text-gray-500">(opt)</span>
                              </label>
                              <Input
                                placeholder="Serienummer"
                                value={part.serial}
                                onChange={(e) =>
                                  updatePart(part.type, "serial", e.target.value)
                                }
                                className="h-11 sm:h-14 text-sm sm:text-lg font-medium"
                              />
                            </div>

                            {/* Repair Name Input */}
                            <div>
                              <label className="block text-sm sm:text-lg font-bold mb-1.5 sm:mb-2">
                                Reparatuur Naam
                              </label>
                              <Input
                                placeholder="Reparatuurnaam"
                                value={part.repairName}
                                onChange={(e) =>
                                  updatePart(part.type, "repairName", e.target.value)
                                }
                                className="h-11 sm:h-14 text-sm sm:text-lg font-medium"
                              />
                            </div>

                            {/* Quantity Input */}
                            <div>
                              <label className="block text-sm sm:text-lg font-bold mb-1.5 sm:mb-2">
                                Aantal
                              </label>
                              <Input
                                type="number"
                                min={1}
                                step={1}
                                value={part.quantity}
                                onChange={(e) =>
                                  updatePart(
                                    part.type,
                                    "quantity",
                                    String(Math.max(1, parseInt(e.target.value || "1", 10)))
                                  )
                                }
                                className="h-11 sm:h-14 text-sm sm:text-lg font-medium"
                              />
                            </div>

                            {/* Notes Input */}
                            <div>
                              <label className="block text-sm sm:text-lg font-bold mb-1.5 sm:mb-2">
                                Notities <span className="text-xs text-gray-500">(opt)</span>
                              </label>
                              <Textarea
                                placeholder="Aanvullende info (Condition, Tested, Issues)"
                                value={part.notes}
                                onChange={(e) =>
                                  updatePart(part.type, "notes", e.target.value)
                                }
                                className="min-h-[80px] sm:min-h-[100px] text-sm sm:text-lg font-medium resize-none"
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Save Actions */}
                      <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t-2 border-gray-200">
                        <Button
                          className="w-full h-12 sm:h-16 bg-green-600 hover:bg-green-700 text-white text-base sm:text-2xl font-bold rounded-lg shadow-lg active:scale-95 transition"
                          disabled={submitting || activeParts.length === 0}
                          onClick={handleSaveAndPrint}
                        >
                          {submitting ? "⏳ Bezig..." : "✅ Opslaan & Printen"}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              ) : (
                /* Collapsed Summary */
                <CardContent className="py-4">
                  {activeParts.length > 0 ? (
                    <p className="text-gray-700 font-medium">
                      📋 Details voor {activeParts.length} onderdeel{activeParts.length !== 1 ? "en" : ""}
                    </p>
                  ) : (
                    <p className="text-gray-400 italic">Geen onderdelen geselecteerd</p>
                  )}
                </CardContent>
              )}
            </Card>

          </div>

          {/* Right Column: Preview (Sticky) - Hidden on mobile, shown on lg+ */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-6">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg px-4 py-3">
                  <h2 className="text-lg font-bold">👁️ Label Preview</h2>
                  <p className="text-purple-100 mt-1 text-sm">
                    Preview (eerste onderdeel)
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <LabelPreview repair={formData} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Print Section (Hidden on Screen, Visible When Printing) */}
      <div className="hidden print:block">
        {createdParts.map((partData, index) => (
          <div key={index} className="print-page">
            <PartLabel part={partData} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PartsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Laden...</div>}>
      <PartsPageClient />
    </Suspense>
  );
}