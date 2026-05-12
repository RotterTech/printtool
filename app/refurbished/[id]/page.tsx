'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import RefurbishedLabel, { RefurbishedData } from '@/components/RefurbishedLabel';
import VerkoopBon from '@/components/receipts/VerkoopBon';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import {
  Cpu,
  HardDrive,
  Zap,
  Monitor,
  Tv,
  Network,
  ArrowLeft,
  Printer,
  Loader2 as Loader2Icon,
  Edit2,
  Search,
  User,
  Loader2,
} from 'lucide-react';

import { useRef } from 'react';
import { toast } from 'sonner';
import { queueRefurbishedLabel } from '@/lib/print-queue-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Laptop = {
  id: string;
  brand: string;
  model: string;
  cpu: string;
  ram: string;
  ssd: string;
  screen: string;
  graphics: string;
  ports: string[];
  os: string;
  price: string;
  status: string;
  created_at: string;
  sold_date?: string;
  sold_to?: string;
  sold_to_customer?: string;
  sold_price?: string;
  sold_notes?: string;
  customer_id?: string;
};

export default function RefurbishedDetailPage() {
  const params = useParams();
  const router = useRouter();
  const laptopId = params.id as string;

  const [laptop, setLaptop] = useState<Laptop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [printMode, setPrintMode] = useState<'label' | 'verkoopbon'>('label');
  
  // Sale dialog state
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [saleData, setSaleData] = useState({ 
    customerName: '', 
    customerId: '', 
    salePrice: '', 
    notes: '' 
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [savingSale, setSavingSale] = useState(false);
  const [sendingToQueue, setSendingToQueue] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Helper to get customer display name
  const getCustomerDisplayName = (c: any) => {
    if (c.display_name) return c.display_name;
    return `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Naamloos";
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Fetch customers when dialog opens or search changes
  useEffect(() => {
    if (!showSaleDialog) return;
    
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const url = customerSearch 
          ? `/api/customers?q=${encodeURIComponent(customerSearch)}`
          : "/api/customers";
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          setCustomers(json.data || []);
        }
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setLoadingCustomers(false);
      }
    };
    const timer = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timer);
  }, [showSaleDialog, customerSearch]);

  useEffect(() => {
    const fetchLaptop = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('refurbished_stock')
          .select('*')
          .eq('id', laptopId)
          .single();

        if (fetchError) {
          setError('Laptop niet gevonden');
          console.error('Fetch error:', fetchError);
          return;
        }

        setLaptop(data as Laptop);
      } catch (err) {
        console.error('Error:', err);
        setError('Fout bij laden van gegevens');
      } finally {
        setLoading(false);
      }
    };

    if (laptopId) {
      fetchLaptop();
    }
  }, [laptopId]);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!laptop) return;

    const newStatus = e.target.value;
    setStatusUpdating(true);

    try {
      const { error: updateError } = await supabase
        .from('refurbished_stock')
        .update({ status: newStatus })
        .eq('id', laptop.id);

      if (updateError) {
        console.error('Status error:', updateError);
        alert('Kon status niet wijzigen');
        return;
      }

      // Update local state and refresh
      setLaptop({ ...laptop, status: newStatus });
      router.refresh();
    } catch (err) {
      console.error('Error:', err);
      alert('Kon status niet wijzigen');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSale = async () => {
    if (!laptop) return;
    if (!saleData.customerName.trim()) {
      alert('Vul een klantnaam in');
      return;
    }

    setSavingSale(true);
    try {
      const res = await fetch('/api/refurbished', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: laptop.id,
          status: 'Verkocht',
          sold_to_customer: saleData.customerName,
          customer_id: saleData.customerId || null,
          sold_price: saleData.salePrice || laptop.price,
          sold_date: new Date().toISOString(),
          sold_notes: saleData.notes || null,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update');
      }

      // Update local state
      setLaptop({
        ...laptop,
        status: 'Verkocht',
        sold_to_customer: saleData.customerName,
        sold_price: saleData.salePrice || laptop.price,
        sold_date: new Date().toISOString(),
        sold_notes: saleData.notes,
      });
      setShowSaleDialog(false);
      setSaleData({ customerName: '', customerId: '', salePrice: '', notes: '' });
      setCustomerSearch('');
      router.refresh();
    } catch (err) {
      console.error('Sale error:', err);
      alert('Kon verkoop niet registreren');
    } finally {
      setSavingSale(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600 text-lg">Laden...</p>
      </div>
    );
  }

  if (error || !laptop) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-600 text-lg">{error || 'Laptop niet gevonden'}</p>
        <Button onClick={() => router.push('/parts/inventory')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar Voorraad
        </Button>
      </div>
    );
  }

  const labelData: RefurbishedData = {
    brand: laptop.brand,
    model: laptop.model,
    cpu: laptop.cpu,
    ram: laptop.ram,
    ssd: laptop.ssd,
    screen: laptop.screen,
    graphics: laptop.graphics,
    ports: laptop.ports || [],
    os: laptop.os,
    price: laptop.price,
  };

  const isSold = laptop.status === 'Verkocht';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sale Dialog */}
      {showSaleDialog && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5">
            <h3 className="text-lg font-bold text-gray-900 mb-4">💰 Laptop Verkopen</h3>
            <div className="space-y-4">
              <div ref={dropdownRef} className="relative">
                <label className="block text-sm font-bold text-gray-700 mb-2">Klant *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={saleData.customerName}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setSaleData({ ...saleData, customerName: e.target.value, customerId: '' });
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="w-full h-11 px-4 pr-10 border border-gray-300 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Zoek of typ klantnaam..."
                  />
                  {loadingCustomers ? (
                    <Loader2 className="absolute right-3 top-3 w-5 h-5 text-gray-400 animate-spin" />
                  ) : (
                    <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                  )}
                </div>
                
                {/* Customer Dropdown */}
                {showCustomerDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {customers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        {loadingCustomers ? "Laden..." : saleData.customerName ? `"${saleData.customerName}" als nieuwe klant` : "Typ om te zoeken..."}
                      </div>
                    ) : (
                      customers.slice(0, 8).map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            const name = getCustomerDisplayName(customer);
                            setSaleData({ ...saleData, customerName: name, customerId: customer.id });
                            setShowCustomerDropdown(false);
                            setCustomerSearch("");
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-green-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                        >
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {getCustomerDisplayName(customer)}
                            </p>
                            {(customer.email || customer.phone) && (
                              <p className="text-xs text-gray-500 truncate">
                                {customer.email || customer.phone}
                              </p>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Verkoopprijs (€)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={saleData.salePrice}
                    onChange={(e) => setSaleData({ ...saleData, salePrice: e.target.value })}
                    className="w-full h-11 pl-8 pr-4 border border-gray-300 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={laptop.price}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Notities (optioneel)</label>
                <textarea
                  value={saleData.notes}
                  onChange={(e) => setSaleData({ ...saleData, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="Extra opmerkingen..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSaleDialog(false);
                  setSaleData({ customerName: '', customerId: '', salePrice: '', notes: '' });
                  setCustomerSearch('');
                }}
                className="flex-1 h-11 px-4 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-lg transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleSale}
                disabled={savingSale}
                className="flex-1 h-11 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {savingSale ? 'Bezig...' : 'Verkopen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page { margin: 0; size: auto; }
          body { padding: 0; margin: 0; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Hidden Label for Print */}
      <div className="hidden print:block print:fixed print:top-0 print:left-0 print:z-50 print:m-0 print:p-0 print:bg-white" style={{ width: printMode === 'label' ? '62mm' : '80mm' }}>
        {printMode === 'label' ? (
          <RefurbishedLabel data={labelData} />
        ) : (
          <VerkoopBon item={{ ...laptop, serial_number: undefined }} />
        )}
      </div>

      {/* Main UI (Hidden on Print) */}
      <div className="print:hidden">
        {/* Header Section - NOT sticky, responsive */}
        <div className="bg-white border-b border-gray-200 no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            {/* Back button row - always visible, top */}
            <div className="flex items-center justify-between mb-4">
              <Button
                onClick={() => router.back()}
                variant="outline"
                size="sm"
                className="font-semibold"
              >
                ← Terug
              </Button>
              
              {/* Status Dropdown - compact on mobile */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase hidden sm:block">Status:</span>
                <select
                  value={laptop.status}
                  onChange={handleStatusChange}
                  disabled={statusUpdating}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium border-2 cursor-pointer transition ${
                    laptop.status === 'Te Koop'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : laptop.status === 'Verkocht'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-orange-500 bg-orange-50 text-orange-700'
                  }`}
                >
                  <option value="Te Koop">🟢 Te Koop</option>
                  <option value="Verkocht">🔴 Verkocht</option>
                  <option value="Gereserveerd">🟠 Gereserveerd</option>
                </select>
              </div>
            </div>

            {/* Title + Price row */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-4 mb-4">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 truncate">
                  {laptop.brand} {laptop.model}
                </h1>
              </div>
              <p className="text-xl sm:text-2xl text-green-600 font-bold flex-shrink-0">
                € {laptop.price}
              </p>
            </div>

            {/* Action buttons - horizontal scroll on mobile */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {/* Verkoop Button - only show if not sold */}
              {laptop.status !== 'Verkocht' && (
                <Button
                  onClick={() => {
                    setSaleData({ ...saleData, salePrice: laptop.price });
                    setShowSaleDialog(true);
                  }}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  💰 Verkoop
                </Button>
              )}

              {/* Print Label Button */}
              <Button
                onClick={() => { setPrintMode('label'); setTimeout(() => window.print(), 100); }}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                🖨️ Label
              </Button>

              {/* Print via USB Queue */}
              <Button
                onClick={async () => {
                  setSendingToQueue(true);
                  try {
                    const result = await queueRefurbishedLabel(laptop);
                    if (result.success) toast.success('Refurbished label naar printer gestuurd!');
                    else toast.error(result.error || 'Printen mislukt');
                  } catch {
                    toast.error('Kon niet verbinden met print queue');
                  } finally {
                    setSendingToQueue(false);
                  }
                }}
                disabled={sendingToQueue}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {sendingToQueue ? (
                  <><Loader2Icon className="w-4 h-4 animate-spin mr-1" /> Versturen...</>
                ) : (
                  <><Printer className="w-4 h-4 mr-1" /> USB Print</>
                )}
              </Button>

              {/* Print VerkoopBon Button */}
              <Button
                onClick={() => { setPrintMode('verkoopbon'); setTimeout(() => window.print(), 100); }}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                🧾 Bon
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN: Specifications */}
            <div className="lg:col-span-2 space-y-6">
              {/* CPU Section */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold">Processor</h2>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-800 font-medium">{laptop.cpu}</p>
                </CardContent>
              </Card>

              {/* Memory & Storage */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-600" />
                      <h2 className="text-lg font-semibold">RAM</h2>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-800 font-medium">{laptop.ram}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-purple-600" />
                      <h2 className="text-lg font-semibold">Opslag</h2>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-800 font-medium">{laptop.ssd}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Display & Graphics */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-cyan-600" />
                      <h2 className="text-lg font-semibold">Scherm</h2>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-800 font-medium">{laptop.screen}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Tv className="w-5 h-5 text-pink-600" />
                      <h2 className="text-lg font-semibold">GPU</h2>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-800 font-medium text-sm">{laptop.graphics}</p>
                  </CardContent>
                </Card>
              </div>

              {/* OS & Ports */}
              <Card>
                <CardHeader className="pb-3">
                  <h2 className="text-lg font-semibold">Besturingssysteem</h2>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-800 font-medium">{laptop.os}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Network className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold">Poorten</h2>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {laptop.ports && laptop.ports.length > 0 ? (
                      laptop.ports.map((port) => (
                        <span
                          key={port}
                          className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium"
                        >
                          {port}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">Geen poorten gespecificeerd</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sold History */}
              {isSold && (
                <Card className="bg-red-50 border-2 border-red-300">
                  <CardHeader className="pb-3">
                    <h2 className="text-lg font-semibold text-red-900">
                      📋 Verkoopaantekeningen
                    </h2>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(laptop.sold_to_customer || laptop.sold_to) && (
                      <p className="text-red-900">
                        <span className="font-semibold">Verkocht aan:</span>{' '}
                        {laptop.sold_to_customer || laptop.sold_to}
                      </p>
                    )}
                    {laptop.sold_price && (
                      <p className="text-red-900">
                        <span className="font-semibold">Verkoopprijs:</span>{' '}
                        € {laptop.sold_price}
                      </p>
                    )}
                    {laptop.sold_date && (
                      <p className="text-red-900">
                        <span className="font-semibold">Datum:</span>{' '}
                        {new Date(laptop.sold_date).toLocaleDateString('nl-NL')}
                      </p>
                    )}
                    {laptop.sold_notes && (
                      <p className="text-red-900">
                        <span className="font-semibold">Notities:</span>{' '}
                        {laptop.sold_notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* RIGHT COLUMN: Label Preview + Info (Sticky on desktop) */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-4 space-y-4">
                {/* Label Preview Card */}
                <Card className="p-6 no-print">
                  <h2 className="text-lg font-bold mb-4 text-gray-800">
                    🏷️ Label Preview
                  </h2>
                  <div className="flex justify-center bg-gray-100 p-4 rounded-lg border border-gray-300">
                    <RefurbishedLabel data={labelData} />
                  </div>
                </Card>

                {/* Info Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <h2 className="text-lg font-semibold">ℹ️ Gegevens</h2>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <span className="font-semibold text-gray-600">ID:</span>
                      <p className="text-gray-800 font-mono text-xs break-all">{laptop.id}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Toegevoegd:</span>
                      <p className="text-gray-800">
                        {new Date(laptop.created_at).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Huidige Status:</span>
                      <p className={`font-medium mt-1 ${
                        laptop.status === 'Te Koop'
                          ? 'text-green-700'
                          : laptop.status === 'Verkocht'
                          ? 'text-red-700'
                          : 'text-orange-700'
                      }`}>
                        {laptop.status === 'Te Koop' && '🟢 Te Koop'}
                        {laptop.status === 'Verkocht' && '🔴 Verkocht'}
                        {laptop.status === 'Gereserveerd' && '🟠 Gereserveerd'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
