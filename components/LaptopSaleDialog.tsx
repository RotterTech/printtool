"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { X, Search, User, Loader2, ShoppingCart } from "lucide-react";

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
};

type Customer = {
  id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  email?: string;
  phone?: string;
};

interface LaptopSaleDialogProps {
  laptop: Laptop | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LaptopSaleDialog({
  laptop,
  isOpen,
  onClose,
  onSuccess,
}: LaptopSaleDialogProps) {
  const [customerName, setCustomerName] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [salePrice, setSalePrice] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Customer search
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset form when opening
  useEffect(() => {
    if (isOpen && laptop) {
      setSalePrice(laptop.price || "");
      setCustomerName("");
      setSelectedCustomerId(null);
      setNotes("");
    }
  }, [isOpen, laptop]);

  // Fetch customers
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
    setSelectedCustomerId(null);
    setShowDropdown(true);
  };

  if (!isOpen || !laptop) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("Klantnaam is verplicht");
      return;
    }

    if (!salePrice || parseFloat(salePrice) <= 0) {
      toast.error("Vul een geldige verkoopprijs in");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/refurbished", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: laptop.id,
          status: "Verkocht",
          sold_to_customer: customerName.trim(),
          customer_id: selectedCustomerId || null,
          sold_price: salePrice,
          sold_date: new Date().toISOString(),
          sold_notes: notes.trim() || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Verkoop mislukt");
        return;
      }

      toast.success(`✅ ${laptop.brand} ${laptop.model} verkocht aan ${customerName}`);
      
      onClose();
      onSuccess();
    } catch (e) {
      console.error("Sale error:", e);
      toast.error("Verkoop mislukt (serverfout)");
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
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-green-600" />
              Laptop Verkopen
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1"
            >
              <X size={24} />
            </button>
          </div>

          {/* Laptop Info */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-indigo-50 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-600">Laptop</p>
            <p className="text-base sm:text-lg font-bold text-gray-900 mt-1">
              {laptop.brand} {laptop.model}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {laptop.cpu} • {laptop.ram} • {laptop.ssd}
            </p>
            <p className="text-base sm:text-lg font-bold text-green-700 mt-2">
              Adviesprijs: € {laptop.price}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            {/* Klantnaam - Required with Dropdown */}
            <div ref={dropdownRef} className="relative">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Klant <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Zoek of typ klantnaam..."
                  value={customerName}
                  onChange={(e) => handleCustomerInputChange(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  required
                  className="w-full h-11 sm:h-12 px-4 pr-10 border border-gray-300 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {loadingCustomers ? (
                  <Loader2 className="absolute right-3 top-3 sm:top-3.5 w-5 h-5 text-gray-400 animate-spin" />
                ) : (
                  <Search className="absolute right-3 top-3 sm:top-3.5 w-5 h-5 text-gray-400" />
                )}
              </div>
              
              {/* Customer Dropdown */}
              {showDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {customers.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      {loadingCustomers ? "Laden..." : customerName ? `"${customerName}" als nieuwe klant` : "Typ om te zoeken..."}
                    </div>
                  ) : (
                    customers.slice(0, 8).map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                      >
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-indigo-600" />
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

            {/* Verkoopprijs */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Verkoopprijs (€) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="299.00"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                required
                className="w-full h-11 sm:h-12 px-4 border border-gray-300 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Notities */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Notities (optioneel)
              </label>
              <textarea
                placeholder="Extra opmerkingen over de verkoop..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 h-11 sm:h-12 px-4 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                Annuleer
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-11 sm:h-12 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Bezig..." : "Verkopen"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
