"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { X, Search, User, Loader2 } from "lucide-react";

type Part = {
  id: string;
  category: string;
  brand: string;
  model: string;
  specs: string;
  note?: string;
  status: string;
  created_at: string;
};

type Customer = {
  id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  email?: string;
  phone?: string;
};

interface PartCheckoutDialogProps {
  part: Part | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PartCheckoutDialog({
  part,
  isOpen,
  onClose,
  onSuccess,
}: PartCheckoutDialogProps) {
  const [jobId, setJobId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [targetDevice, setTargetDevice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Customer search
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch customers on mount and when searching
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const url = searchQuery 
          ? `/api/customers?q=${encodeURIComponent(searchQuery)}`
          : "/api/customers";
        const res = await fetch(url);
        const json = await res.json();
        setCustomers(json.data || []);
      } catch (err) {
        console.error("Error fetching customers:", err);
      } finally {
        setLoadingCustomers(false);
      }
    };

    const debounce = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [isOpen, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getCustomerDisplayName = (c: Customer) => {
    if (c.display_name) return c.display_name;
    return `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Naamloos";
  };

  const handleSelectCustomer = (customer: Customer) => {
    const name = getCustomerDisplayName(customer);
    setCustomerName(name);
    setSelectedCustomerId(customer.id);
    setShowDropdown(false);
    setSearchQuery("");
  };

  const handleCustomerInputChange = (value: string) => {
    setCustomerName(value);
    setSearchQuery(value);
    setSelectedCustomerId(null); // Clear selection when typing
    setShowDropdown(true);
  };

  if (!isOpen || !part) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if part is available (safety check)
    if (!part) {
      toast.error("Onderdeel niet beschikbaar");
      return;
    }

    // Validate required fields
    if (!customerName.trim()) {
      toast.error("Klantnaam is verplicht");
      return;
    }

    // 🚀 DEBUG: Log before fetch
    console.log("🚀 ATTEMPTING CHECKOUT with:", {
      url: "/api/parts",
      method: "PUT",
      id: part.id,
      status: "Gebruikt",
      client: customerName.trim(),
      device: targetDevice.trim() || null,
    });
    
    if (!part?.id) {
      alert("CRITICAL ERROR: No Part ID found!");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/parts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: part.id,
          status: "Gebruikt",
          used_by_client: customerName.trim(),
          used_in_device: targetDevice.trim() || null,
          customer_id: selectedCustomerId || null,
        }),
      });

      // 📡 DEBUG: Read raw text first
      const text = await res.text();
      console.log("📡 SERVER RESPONSE RAW:", text);
      console.log("📊 Response Status:", res.status, res.statusText);
      
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
        console.log("✅ JSON PARSED:", json);
      } catch (parseErr) {
        console.error("❌ JSON PARSE ERROR. Server sent non-JSON:", text);
        toast.error("Server Error (Check Console)");
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        console.error("❌ CHECKOUT FAILED - Response not OK:", {
          status: res.status,
          statusText: res.statusText,
          json,
          rawText: text,
        });
        toast.error((json && json.error) || text || "Uitboeking mislukt");
        return;
      }

      console.log("✅ CHECKOUT SUCCESS:", json);
      toast.success(`✅ ${part.category} uitgeboekt aan ${customerName}`);
      
      // Reset form
      setJobId("");
      setCustomerName("");
      setSelectedCustomerId(null);
      setTargetDevice("");
      setSearchQuery("");
      
      // Close dialog and refresh parent
      onClose();
      onSuccess();
    } catch (e) {
      console.error("❌ FETCH ERROR:", e);
      toast.error("Uitboeking mislukt (serverfout)");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Onderdeel Uitboeken
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Part Info */}
          <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-600">Onderdeel</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {part.category} — {part.specs}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Van: <span className="font-semibold">{part.brand} {part.model}</span>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Job ID */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Job ID (Optioneel)
              </label>
              <input
                type="text"
                placeholder="Bijv. J001234"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full h-12 px-4 border border-gray-300 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Koppel aan een bestaande reparatie
              </p>
            </div>

            {/* Klantnaam - Required with Dropdown */}
            <div ref={dropdownRef} className="relative">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Klantnaam <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Zoek of typ klantnaam..."
                  value={customerName}
                  onChange={(e) => handleCustomerInputChange(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  required
                  className="w-full h-12 px-4 pr-10 border border-gray-300 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {loadingCustomers ? (
                  <Loader2 className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 animate-spin" />
                ) : (
                  <Search className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                )}
              </div>
              
              {/* Customer Dropdown */}
              {showDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {customers.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      {loadingCustomers ? "Laden..." : customerName ? `"${customerName}" als nieuwe klant gebruiken` : "Typ om te zoeken..."}
                    </div>
                  ) : (
                    customers.slice(0, 8).map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-blue-600" />
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

            {/* Doel Apparaat */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Doel Apparaat
              </label>
              <input
                type="text"
                placeholder="Bijv. HP Pavilion van Jan"
                value={targetDevice}
                onChange={(e) => setTargetDevice(e.target.value)}
                className="w-full h-12 px-4 border border-gray-300 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 h-12 px-4 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuleer
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-12 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Bezig..." : "Bevestig Uitboeking"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
