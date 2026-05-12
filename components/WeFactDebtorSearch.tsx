"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, Building2, User, Mail, MapPin, AlertCircle } from "lucide-react";

interface WeFactDebtor {
  Identifier: string;
  DebtorCode: string;
  CompanyName: string;
  FirstName?: string;
  Surname?: string;
  Initials?: string;
  EmailAddress: string;
  City?: string;
  ZipCode?: string;
  Address?: string;
  Zipcode?: string; // Fallback for list response
  Telephone?: string; // Fallback
  PhoneNumber?: string;
  [key: string]: any;
}

interface WeFactDebtorSearchProps {
  onSelect: (debtor: WeFactDebtor) => void;
  placeholder?: string;
}

export default function WeFactDebtorSearch({
  onSelect,
  placeholder = "🔍 Zoek klant in WeFact (Naam, E-mail)...",
}: WeFactDebtorSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<WeFactDebtor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Debounced search function
  const searchDebtors = useCallback(async (term: string) => {
    if (!term || term.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log("🔍 Searching for:", term.trim());

    try {
      console.log("📡 Calling /api/wefact with mode=search");
      console.log("📍 URL:", window.location.origin + "/api/wefact");
      
      let response;
      try {
        response = await fetch("/api/wefact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "search",
            term: term.trim(),
          }),
        });
        console.log("✅ Fetch succeeded, status:", response.status, response.statusText);
      } catch (fetchError) {
        console.error("❌ FETCH NETWORK ERROR:", fetchError);
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      }

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let responseBody = "";
        try {
          responseBody = await response.text();
          console.log("📋 Response body:", responseBody);
          const errorData = JSON.parse(responseBody);
          errorMessage = errorData.message || errorMessage;
        } catch (parseErr) {
          // Response might not be JSON, use raw text
          errorMessage = responseBody || errorMessage;
        }
        console.error("❌ HTTP Error:", errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("✅ WeFact response:", data);

      // WeFact returns { debtors: [...] }
      if (data.debtors && Array.isArray(data.debtors)) {
        console.log(`✅ Found ${data.debtors.length} debtors`);
        
        // Sort results by relevance
        const searchLower = term.trim().toLowerCase();
        const sortedDebtors = [...data.debtors].sort((a, b) => {
          const aName = (a.CompanyName || `${a.Initials || ''} ${a.Surname || a.SurName || ''}`.trim()).toLowerCase();
          const bName = (b.CompanyName || `${b.Initials || ''} ${b.Surname || b.SurName || ''}`.trim()).toLowerCase();
          
          // Exact match first
          if (aName === searchLower) return -1;
          if (bName === searchLower) return 1;
          
          // Starts with search term
          const aStarts = aName.startsWith(searchLower);
          const bStarts = bName.startsWith(searchLower);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          
          // Contains search term (already filtered by API, so just alphabetical)
          return aName.localeCompare(bName);
        });
        
        setResults(sortedDebtors);
        setIsOpen(true);
      } else {
        console.warn("⚠️ No debtors in response:", data);
        setResults([]);
        setIsOpen(false);
      }
    } catch (err) {
      console.error("❌ WeFact search error:", err);
      const errorMsg = err instanceof Error ? err.message : "Search failed";
      setError(errorMsg);
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchDebtors(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, searchDebtors]);

  // Handle debtor selection - async to fetch full details
  const handleSelect = async (debtor: WeFactDebtor) => {
    setSelectedId(debtor.Identifier);
    
    try {
      console.log(`📋 Fetching full details for debtor: ${debtor.Identifier}`);
      
      // Fetch full details using debtor.show action
      const res = await fetch("/api/wefact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "detail",
          identifier: debtor.Identifier,
        }),
      });

      console.log("📥 Detail response status:", res.status, res.statusText);

      if (!res.ok) {
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Response might not be JSON
        }
        throw new Error(errorMessage);
      }

      const fullData = await res.json();
      const detailedDebtor = fullData.debtor; // from 'show' action

      if (detailedDebtor) {
        console.log(`✅ Debtor details retrieved:`, detailedDebtor);
        onSelect(detailedDebtor);
        setSearchTerm("");
        setResults([]);
        setIsOpen(false);
      } else {
        throw new Error("No debtor details returned");
      }
    } catch (err) {
      console.error("❌ Error fetching debtor details:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to load debtor details";
      setError(errorMsg);
      setSelectedId(null);
    }
  };

  // Get display name (handles both list and show responses)
  const getDisplayName = (debtor: WeFactDebtor) => {
    if (debtor.CompanyName && debtor.CompanyName.trim()) {
      return debtor.CompanyName;
    }
    // Fallback to personal name using Initials or FirstName + Surname
    const initials = debtor.Initials || "";
    const firstName = debtor.FirstName || "";
    const surname = debtor.Surname || "";
    
    if (initials && surname) {
      return `${initials} ${surname}`.trim();
    }
    if (firstName && surname) {
      return `${firstName} ${surname}`.trim();
    }
    return surname || initials || "Onbekende naam";
  };

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 animate-spin" />
          ) : (
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          )}
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-base sm:text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute z-50 w-full mt-2 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className={`absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto ${
          selectedId ? "opacity-50 pointer-events-none" : ""
        }`}>
          <div className="p-2">
            <p className="text-xs text-gray-500 px-3 py-2">
              {results.length} resultaat{results.length !== 1 ? "en" : ""} gevonden
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {results.map((debtor) => {
              const displayName = getDisplayName(debtor);
              const isCompany = debtor.CompanyName && debtor.CompanyName.trim();
              const isLoading = selectedId === debtor.Identifier;

              return (
                <button
                  key={debtor.Identifier}
                  onClick={() => handleSelect(debtor)}
                  disabled={isLoading || selectedId !== null}
                  className={`w-full text-left p-4 transition-colors cursor-pointer group relative ${
                    isLoading
                      ? "bg-blue-50"
                      : selectedId !== null
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-blue-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {isCompany ? (
                        <Building2 className="w-5 h-5 text-blue-600 group-hover:text-blue-700" />
                      ) : (
                        <User className="w-5 h-5 text-gray-600 group-hover:text-gray-700" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Name */}
                      <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                        {displayName}
                      </p>

                      {/* Debtor Code */}
                      {debtor.DebtorCode && (
                        <p className="text-xs text-gray-500 mt-0.5 font-mono">
                          Code: {debtor.DebtorCode}
                        </p>
                      )}

                      {/* Email */}
                      {debtor.EmailAddress && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <p className="text-sm text-gray-600 truncate">
                            {debtor.EmailAddress}
                          </p>
                        </div>
                      )}

                      {/* Location */}
                      {(debtor.City || debtor.ZipCode) && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            {(debtor.ZipCode || debtor.Zipcode) && `${debtor.ZipCode || debtor.Zipcode} `}
                            {debtor.City}
                          </p>
                        </div>
                      )}

                      {/* Address */}
                      {debtor.Address && (
                        <p className="text-xs text-gray-500 mt-1">
                          {debtor.Address}
                        </p>
                      )}
                    </div>

                    {/* Loading Spinner (when fetching details) */}
                    {isLoading && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {isOpen && results.length === 0 && !isLoading && searchTerm.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 p-6 bg-white border border-gray-200 rounded-lg shadow-lg text-center">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-600 font-medium">Geen klanten gevonden</p>
          <p className="text-sm text-gray-500 mt-1">
            Probeer een andere zoekterm
          </p>
        </div>
      )}
    </div>
  );
}
