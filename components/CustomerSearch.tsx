"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Loader2, Building2, User, Mail, Phone, MapPin, Database, Cloud, X } from "lucide-react";

export interface UnifiedCustomer {
  id: string;
  source: "internal" | "wefact";
  name: string;
  email: string | null;
  phone: string | null;
  klantnummer: string | null;
  company?: string | null;
  address?: string | null;
  city?: string | null;
  wefactId?: string;
}

interface CustomerSearchProps {
  onSelect: (customer: UnifiedCustomer) => void;
  placeholder?: string;
  sources?: ("internal" | "wefact")[];
  initialValue?: string;
  showSourceBadge?: boolean;
  className?: string;
}

export default function CustomerSearch({
  onSelect,
  placeholder = "🔍 Zoek klant (naam, e-mail, telefoon)...",
  sources = ["internal", "wefact"],
  initialValue = "",
  showSourceBadge = true,
  className = "",
}: CustomerSearchProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [results, setResults] = useState<UnifiedCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  const searchCustomers = useCallback(async (term: string) => {
    if (!term || term.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/customers/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: term.trim(), sources }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setResults(data.customers || []);
      setIsOpen(true);
    } catch (err) {
      console.error("❌ Customer search error:", err);
      setError(err instanceof Error ? err.message : "Zoeken mislukt");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [sources]);

  // Debounce search - skip if a customer was just selected
  useEffect(() => {
    // Don't search if we have a selected customer (prevents re-opening after selection)
    if (selectedId) return;
    
    const debounceTimer = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        searchCustomers(searchTerm);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, searchCustomers, selectedId]);

  const handleSelect = (customer: UnifiedCustomer) => {
    setSelectedId(customer.id);
    setSearchTerm(customer.name);
    setResults([]); // Clear results immediately
    setIsOpen(false);
    onSelect(customer);
  };

  const handleClear = () => {
    setSearchTerm("");
    setSelectedId(null);
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const getSourceIcon = (source: string) => {
    return source === "internal" ? (
      <Database className="w-3 h-3" />
    ) : (
      <Cloud className="w-3 h-3" />
    );
  };

  const getSourceLabel = (source: string) => {
    return source === "internal" ? "Intern" : "WeFact";
  };

  const getSourceColor = (source: string) => {
    return source === "internal" 
      ? "bg-blue-100 text-blue-700" 
      : "bg-purple-100 text-purple-700";
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSelectedId(null);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base transition-colors"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto">
          {results.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => handleSelect(customer)}
              className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                selectedId === customer.id ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    customer.company ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {customer.company ? (
                      <Building2 className="w-5 h-5" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 truncate">
                        {customer.name}
                      </span>
                      {showSourceBadge && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${getSourceColor(customer.source)}`}>
                          {getSourceIcon(customer.source)}
                          {getSourceLabel(customer.source)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                      {customer.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {customer.email}
                        </span>
                      )}
                      {customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </span>
                      )}
                      {customer.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {customer.city}
                        </span>
                      )}
                    </div>

                    {customer.klantnummer && (
                      <div className="mt-1 text-[10px] text-gray-400 font-mono">
                        #{customer.klantnummer}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && searchTerm.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center text-gray-500">
          <p className="text-sm">Geen klanten gevonden voor &quot;{searchTerm}&quot;</p>
          <p className="text-xs mt-1 text-gray-400">Vul de gegevens handmatig in</p>
        </div>
      )}
    </div>
  );
}
