'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RefurbishedLabel, { RefurbishedData } from '@/components/RefurbishedLabel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';

const BRANDS = ['HP', 'Dell', 'Lenovo', 'Apple', 'Acer'];

// Model series by brand (expanded from Dismantle/Repair)
const MODELS_BY_BRAND: Record<string, string[]> = {
  Lenovo: [
    'ThinkPad X1',
    'ThinkPad T',
    'ThinkPad E',
    'ThinkPad L',
    'IdeaPad',
    'Yoga',
    'Legion',
    'ThinkBook',
    'ThinkCentre',
    'Anders...',
  ],
  HP: [
    'ProBook',
    'EliteBook',
    'Pavilion',
    'Envy',
    'Spectre',
    'ZBook',
    'ProDesk',
    'EliteDesk',
    'Anders...',
  ],
  Dell: [
    'Latitude',
    'XPS',
    'Inspiron',
    'Precision',
    'Vostro',
    'OptiPlex',
    'Anders...',
  ],
  Apple: [
    'MacBook Air',
    'MacBook Pro',
    'iMac',
    'Mac Mini',
    'Mac Studio',
    'Anders...',
  ],
  Acer: [
    'Aspire',
    'Swift',
    'Nitro',
    'Predator',
    'TravelMate',
    'Anders...',
  ],
};

// Origin types
const ORIGIN_OPTIONS = [
  { key: 'donatie', label: '💚 Donatie (Gratis)' },
  { key: 'inkoop', label: '💙 Inkoop' },
  { key: 'interne_refurb', label: '⚪ Interne Refurb' },
];

// Status options
const STATUS_OPTIONS = [
  { key: 'te_koop', label: '🏷️ Te Koop' },
  { key: 'nog_testen', label: '🧪 Nog Testen' },
  { key: 'in_behandeling', label: '⚙️ In Behandeling' },
  { key: 'wacht_onderdelen', label: '📦 Wacht op Onderdelen' },
];

const RAM_OPTIONS = ['4GB', '8GB', '16GB', '32GB'];
const RAM_TYPE_OPTIONS = ['DDR', 'DDR2', 'DDR3', 'DDR4', 'DDR5'];
const SSD_OPTIONS = ['128GB', '256GB', '512GB', '1TB'];
const STORAGE_TYPE_OPTIONS = ['SSD', 'HDD', 'IDE', 'SATA', 'NVMe'];
const SCREEN_OPTIONS = ['13.3"', '14"', '15.6"', '17"', 'FHD', 'Touch'];
const OS_OPTIONS = ['Win 10', 'Win 11 Home', 'Win 11 Pro', 'MacOS'];
const PORT_OPTIONS = ['USB-C', 'HDMI', 'DP', 'VGA', 'USB-A', 'SD', 'Cam', 'LAN', 'AUX', 'DVD', 'SIM', 'SmartCard'];
const CPU_HELPERS = ['i3', 'i5', 'i7', 'Ryzen'];
const GRAPHICS_OPTIONS = [
  'Intel HD Graphics',
  'Intel UHD Graphics',
  'Intel Iris Xe',
  'NVIDIA GeForce',
  'NVIDIA Quadro',
  'AMD Radeon',
];

interface RefurbishedFormData extends RefurbishedData {}

// Helper function to smart-match a model string to a series
const smartMatchModelSeries = (brand: string, modelString: string): { series: string; custom: string } => {
  if (!brand || !modelString) return { series: '', custom: '' };
  
  const seriesList = MODELS_BY_BRAND[brand] || [];
  
  // Try to find an exact match in the series list (excluding "Anders...")
  const exactMatch = seriesList.find(s => s !== 'Anders...' && modelString.toLowerCase() === s.toLowerCase());
  if (exactMatch) {
    console.log(`✅ Exact series match: "${exactMatch}"`);
    return { series: exactMatch, custom: '' };
  }
  
  // Try to find a partial match (e.g., "T480" matches "ThinkPad T")
  const partialMatch = seriesList.find(s => 
    s !== 'Anders...' && modelString.toLowerCase().includes(s.toLowerCase())
  );
  if (partialMatch) {
    console.log(`✅ Partial series match: "${partialMatch}"`);
    return { series: partialMatch, custom: '' };
  }
  
  // Try reverse: check if series is contained in the model string
  const reverseMatch = seriesList.find(s => 
    s !== 'Anders...' && s.toLowerCase().includes(modelString.toLowerCase())
  );
  if (reverseMatch) {
    console.log(`✅ Reverse series match: "${reverseMatch}"`);
    return { series: reverseMatch, custom: '' };
  }
  
  // No series match found - treat as custom model
  console.log(`⚠️ No series match for "${modelString}" - using as custom`);
  return { series: '', custom: modelString };
};

function RefurbishedPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<RefurbishedFormData>({
    brand: '',
    model: '',
    cpu: '',
    ram: '',
    ssd: '',
    screen: '',
    graphics: '',
    ports: [],
    os: '',
    price: '',
  });
  const [origin, setOrigin] = useState('');
  const [status, setStatus] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [printItem, setPrintItem] = useState<RefurbishedData | null>(null);
  
  // Donor info (for donatie/inkoop)
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorKlantnummer, setDonorKlantnummer] = useState('');

  // Auto-fill from URL parameters
  useEffect(() => {
    const urlBrand = searchParams.get('brand')?.trim();
    const urlModel = searchParams.get('model')?.trim();
    const urlOrigin = searchParams.get('origin')?.trim();
    const urlStatus = searchParams.get('status')?.trim();

    if (urlBrand) {
      setData((prev) => ({
        ...prev,
        brand: urlBrand,
      }));
      console.log("🔌 Auto-selected brand:", urlBrand);
    }

    if (urlModel && urlBrand) {
      // Try to smart-match the model to a series
      const { series, custom } = smartMatchModelSeries(urlBrand, urlModel);
      
      setData((prev) => ({
        ...prev,
        model: series || custom,
      }));
      
      if (custom) {
        setCustomModel(custom);
        console.log("🔌 Auto-set model (custom):", custom);
      } else {
        setCustomModel('');
        console.log("🔌 Auto-matched model series:", series);
      }
    } else if (urlModel) {
      // If no brand yet, just store the model as custom
      setData((prev) => ({
        ...prev,
        model: urlModel,
      }));
      setCustomModel(urlModel);
      console.log("🔌 Auto-set model (no brand match):", urlModel);
    }

    if (urlOrigin) {
      setOrigin(urlOrigin);
      console.log("🔌 Auto-set origin:", urlOrigin);
    }

    if (urlStatus) {
      setStatus(urlStatus);
      console.log("🔌 Auto-set status:", urlStatus);
    }

    // Read donor info from URL
    const urlDonorName = searchParams.get('donor_name')?.trim();
    const urlDonorEmail = searchParams.get('donor_email')?.trim();
    const urlDonorPhone = searchParams.get('donor_phone')?.trim();
    const urlDonorKlantnummer = searchParams.get('donor_klantnummer')?.trim();
    
    if (urlDonorName) {
      setDonorName(urlDonorName);
      console.log("🔌 Auto-set donor name:", urlDonorName);
    }
    if (urlDonorEmail) setDonorEmail(urlDonorEmail);
    if (urlDonorPhone) setDonorPhone(urlDonorPhone);
    if (urlDonorKlantnummer) setDonorKlantnummer(urlDonorKlantnummer);
  }, [searchParams]);

  // Helper to update simple string fields
  const updateField = (field: keyof RefurbishedFormData, value: string) => {
    setData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Helper to toggle ports
  const togglePort = (port: string) => {
    setData((prev) => ({
      ...prev,
      ports: prev.ports.includes(port)
        ? prev.ports.filter((p) => p !== port)
        : [...prev.ports, port],
    }));
  };

  // Helper to append to CPU field
  const appendToCPU = (text: string) => {
    setData((prev) => ({
      ...prev,
      cpu: prev.cpu ? prev.cpu + ' ' + text : text,
    }));
  };

  const appendToRam = (text: string) => {
    setData((prev) => ({
      ...prev,
      ram: prev.ram ? prev.ram + ' ' + text : text,
    }));
  };

  const appendToStorage = (text: string) => {
    setData((prev) => ({
      ...prev,
      ssd: prev.ssd ? prev.ssd + ' ' + text : text,
    }));
  };

  const handleSaveAndPrint = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const insertData: Record<string, any> = {
        brand: data.brand,
        model: data.model,
        cpu: data.cpu,
        ram: data.ram,
        ssd: data.ssd,
        screen: data.screen,
        graphics: data.graphics,
        ports: data.ports,
        os: data.os,
        price: data.price,
        origin: origin || null,
        status: status || null,
      };
      
      // Add donor info if present (for donatie/inkoop)
      if (donorName) {
        insertData.donor_name = donorName;
        if (donorEmail) insertData.donor_email = donorEmail;
        if (donorPhone) insertData.donor_phone = donorPhone;
        if (donorKlantnummer) insertData.donor_klantnummer = donorKlantnummer;
      }
      
      const { error } = await supabase.from('refurbished_stock').insert([insertData]);

      if (error) {
        console.error('Failed to save refurbished laptop', error);
        alert('Opslaan mislukt: ' + error.message);
        return;
      }

      alert('Laptop opgeslagen & Label geprint!');
      setPrintItem(data);

      // Auto-print via queue if enabled
      try {
        const settingsRes = await fetch("/api/settings/label");
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          if (settings.auto_print) {
            const { queueRefurbishedLabel } = await import("@/lib/print-queue-helpers");
            await queueRefurbishedLabel(data);
          }
        }
      } catch { /* ignore auto-print errors */ }

      // Trigger print after a short delay to ensure render
      setTimeout(() => {
        window.print();
      }, 100);
    } catch (err) {
      console.error('Unexpected error saving refurbished laptop', err);
      alert('Onbekende fout bij opslaan. Probeer opnieuw.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOnlyPrint = () => {
    setPrintItem(data);
    setTimeout(() => {
      window.print();
    }, 100);
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Header with Home Button */}
      <div className="bg-white border-b border-gray-200 p-4 print:hidden">
        <div className="flex gap-3 mb-2">
          <Button
            onClick={() => router.push('/inboeken')}
            variant="outline"
          >
            ← Terug naar Inname
          </Button>
          <Button
            onClick={() => router.push('/parts/inventory')}
            variant="secondary"
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Bekijk Voorraad
          </Button>
        </div>
        <h1 className="text-2xl font-bold">🎁 Refurbished Label Generator</h1>
        
        {/* Info Banner - Shows auto-filled data */}
        {(origin || status || data.brand || data.model || donorName) && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            {data.brand && (
              <p className="text-sm"><strong>Merk:</strong> {data.brand}</p>
            )}
            {data.model && (
              <p className="text-sm"><strong>Model:</strong> {data.model}</p>
            )}
            {origin && (
              <p className="text-sm"><strong>Bron:</strong> {origin.replace(/_/g, ' ').charAt(0).toUpperCase() + origin.replace(/_/g, ' ').slice(1)}</p>
            )}
            {status && (
              <p className="text-sm"><strong>Status:</strong> {status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.replace(/_/g, ' ').slice(1)}</p>
            )}
            {donorName && (
              <p className="text-sm">
                <strong>{origin === 'inkoop' ? 'Van:' : 'Donateur:'}</strong> {donorName}
                {donorEmail && <span className="ml-2 text-gray-600">({donorEmail})</span>}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Main Layout: Left Controls + Right Preview */}
      <div className="flex gap-6 p-6 max-w-7xl mx-auto">
        {/* LEFT COLUMN: CONTROLS */}
        <div className="flex-1 space-y-6 print:hidden">
          {/* ORIGIN - Button Grid */}
          {(origin || true) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <label className="block text-sm font-semibold mb-3">📦 Bron</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {ORIGIN_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setOrigin(opt.key)}
                    className={`px-4 py-3 rounded-lg font-semibold transition-all text-sm ${
                      origin === opt.key
                        ? 'bg-green-600 text-white ring-2 ring-green-400'
                        : 'bg-white text-gray-900 border border-green-200 hover:bg-green-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STATUS - Button Grid */}
          {(status || true) && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <label className="block text-sm font-semibold mb-3">⏳ Status</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setStatus(opt.key)}
                    className={`px-4 py-3 rounded-lg font-semibold transition-all text-sm ${
                      status === opt.key
                        ? 'bg-orange-600 text-white ring-2 ring-orange-400'
                        : 'bg-white text-gray-900 border border-orange-200 hover:bg-orange-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* BRAND */}
          <div>
            <label className="block text-sm font-semibold mb-2">🖥️ Brand</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {BRANDS.map((brand) => (
                <Button
                  key={brand}
                  onClick={() => {
                    updateField('brand', brand);
                    setData((prev) => ({ ...prev, model: '' }));
                    setCustomModel('');
                  }}
                  className={`text-xs ${
                    data.brand === brand
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-black hover:bg-gray-300'
                  }`}
                >
                  {brand}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Or type brand..."
              value={data.brand}
              onChange={(e) => {
                updateField('brand', e.target.value);
                setData((prev) => ({ ...prev, model: '' }));
                setCustomModel('');
              }}
            />
          </div>

          {/* MODEL - Series Buttons + Custom Input */}
          <div>
            <label className="block text-sm font-semibold mb-2"> Model Series</label>
            {!data.brand ? (
              <div className="h-10 flex items-center px-3 bg-gray-50 border border-gray-200 rounded text-gray-500 text-sm">
                Select a brand first
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                  {(MODELS_BY_BRAND[data.brand] || []).map((model) => {
                    const isCustomActive = model === 'Anders...' && (data.model === '' || customModel);
                    const isActive = model !== 'Anders...' && data.model === model;
                    return (
                      <Button
                        key={model}
                        type="button"
                        onClick={() => {
                          if (model === 'Anders...') {
                            setData((prev) => ({ ...prev, model: '' }));
                            setCustomModel('');
                          } else {
                            updateField('model', model);
                            setCustomModel('');
                          }
                        }}
                        className={`text-xs ${
                          isActive || isCustomActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-black hover:bg-gray-300'
                        }`}
                      >
                        {model}
                      </Button>
                    );
                  })}
                </div>

                {/* Custom Model Input (if "Anders..." is selected) */}
                {(data.model === '' || customModel) && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <label className="text-xs font-semibold text-gray-700 block mb-2">
                      📝 Custom Model
                    </label>
                    <Input
                      placeholder="e.g. Elitebook 840 G3"
                      value={customModel}
                      onChange={(e) => {
                        setCustomModel(e.target.value);
                        updateField('model', e.target.value);
                      }}
                      className="h-9 text-sm"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* CPU */}
          <div>
            <label className="block text-sm font-semibold mb-2">CPU</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {CPU_HELPERS.map((cpu) => (
                <Button
                  key={cpu}
                  onClick={() => appendToCPU(cpu)}
                  className="text-xs bg-purple-500 text-white hover:bg-purple-600"
                >
                  {cpu}
                </Button>
              ))}
            </div>
            <Input
              placeholder="e.g. Intel Core i5-7300U"
              value={data.cpu}
              onChange={(e) => updateField('cpu', e.target.value)}
            />
          </div>

          {/* RAM */}
          <div>
            <label className="block text-sm font-semibold mb-2">RAM</label>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {RAM_TYPE_OPTIONS.map((type) => (
                <Button
                  key={type}
                  onClick={() => appendToRam(type)}
                  className="text-xs bg-indigo-500 text-white hover:bg-indigo-600"
                >
                  {type}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {RAM_OPTIONS.map((ram) => (
                <Button
                  key={ram}
                  onClick={() => updateField('ram', ram)}
                  className={`text-xs ${
                    data.ram === ram
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-black hover:bg-gray-300'
                  }`}
                >
                  {ram}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Or type RAM..."
              value={data.ram}
              onChange={(e) => updateField('ram', e.target.value)}
            />
          </div>

          {/* SSD */}
          <div>
            <label className="block text-sm font-semibold mb-2">Storage (SSD)</label>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {STORAGE_TYPE_OPTIONS.map((type) => (
                <Button
                  key={type}
                  onClick={() => appendToStorage(type)}
                  className="text-xs bg-indigo-500 text-white hover:bg-indigo-600"
                >
                  {type}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {SSD_OPTIONS.map((ssd) => (
                <Button
                  key={ssd}
                  onClick={() => updateField('ssd', ssd)}
                  className={`text-xs ${
                    data.ssd === ssd
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-black hover:bg-gray-300'
                  }`}
                >
                  {ssd}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Or type storage..."
              value={data.ssd}
              onChange={(e) => updateField('ssd', e.target.value)}
            />
          </div>

          {/* SCREEN */}
          <div>
            <label className="block text-sm font-semibold mb-2">Screen</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {SCREEN_OPTIONS.map((screen) => (
                <Button
                  key={screen}
                  onClick={() => updateField('screen', screen)}
                  className={`text-xs ${
                    data.screen === screen
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-black hover:bg-gray-300'
                  }`}
                >
                  {screen}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Or type screen spec..."
              value={data.screen}
              onChange={(e) => updateField('screen', e.target.value)}
            />
          </div>

          {/* GRAPHICS */}
          <div>
            <label className="block text-sm font-semibold mb-2">Videokaart / Graphics</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
              {GRAPHICS_OPTIONS.map((gpu) => (
                <Button
                  key={gpu}
                  onClick={() => updateField('graphics', gpu)}
                  className={`text-xs ${
                    data.graphics === gpu
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-black hover:bg-gray-300'
                  }`}
                >
                  {gpu}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Of typ handmatig..."
              value={data.graphics}
              onChange={(e) => updateField('graphics', e.target.value)}
            />
          </div>

          {/* PORTS (Multi-Select) */}
          <div>
            <label className="block text-sm font-semibold mb-2">Ports (Multi-select)</label>
            <div className="grid grid-cols-4 gap-2">
              {PORT_OPTIONS.map((port) => (
                <Button
                  key={port}
                  onClick={() => togglePort(port)}
                  className={`text-xs ${
                    data.ports.includes(port)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-black hover:bg-gray-300'
                  }`}
                >
                  {port}
                </Button>
              ))}
            </div>
          </div>

          {/* OS */}
          <div>
            <label className="block text-sm font-semibold mb-2">Operating System</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {OS_OPTIONS.map((os) => (
                <Button
                  key={os}
                  onClick={() => updateField('os', os)}
                  className={`text-xs ${
                    data.os === os
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-black hover:bg-gray-300'
                  }`}
                >
                  {os}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Or type OS..."
              value={data.os}
              onChange={(e) => updateField('os', e.target.value)}
            />
          </div>

          {/* PRICE */}
          <div>
            <label className="block text-sm font-semibold mb-2">Price</label>
            <Input
              placeholder="e.g. 150,- or 150"
              value={data.price}
              onChange={(e) => updateField('price', e.target.value)}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: STICKY PREVIEW */}
        <div className="w-80 sticky top-6 h-fit">
          <div className="bg-white border-2 border-gray-300 rounded-lg p-4 shadow-lg print:border-0 print:shadow-none print:p-0 print:m-0 print:bg-transparent">
            <h2 className="text-lg font-bold mb-4 print:hidden">Preview</h2>
            
            {/* Label Preview Container */}
            <div className="flex justify-center mb-4 bg-gray-100 p-2 rounded print:fixed print:top-0 print:left-0 print:m-0 print:w-[62mm] print:h-auto print:z-50 print:block print:bg-white print:p-0 print:rounded-none">
              <div className="flex justify-center print:shadow-none print:w-[62mm]">
                <RefurbishedLabel data={data} origin={origin} />
              </div>
            </div>

            {/* Print Button */}
            <Button
              onClick={handleSaveAndPrint}
              disabled={isSaving}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 disabled:opacity-60 print:hidden"
            >
              {isSaving ? 'Opslaan...' : '🖨️ Opslaan & Printen'}
            </Button>
            <div className="my-2 text-center text-sm text-gray-500 print:hidden">Of</div>
            <Button
              onClick={handleOnlyPrint}
              disabled={isSaving}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 disabled:opacity-60 print:hidden"
            >
              🖨️ Alleen Printen
            </Button>
            
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page { margin: 0; size: auto; }
          body { padding: 0; margin: 0; background: white; }
        }
      `}</style>
    </div>
  );
}
export default function RefurbishedPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Laden...</div>}>
      <RefurbishedPageClient />
    </Suspense>
  );
}