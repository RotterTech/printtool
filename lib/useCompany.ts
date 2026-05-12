"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/SupabaseAuthProvider";

interface CompanySettings {
  custom_brand_models: Record<string, Record<string, string[]>> | null;
  custom_prices: Record<string, { label: string; price: number }[]> | null;
  wefact_api_key: string | null;
  label_settings: Record<string, any>;
  theme: string;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  plan: string;
  trial_ends: string;
  is_active: boolean;
  settings: CompanySettings;
}

interface UseCompanyReturn {
  company: Company | null;
  loading: boolean;
  error: string | null;
  isTrialExpired: boolean;
  daysLeftInTrial: number;
  updateSettings: (newSettings: Partial<CompanySettings>) => Promise<boolean>;
  refreshCompany: () => Promise<void>;
}

export function useCompany(): UseCompanyReturn {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate trial status
  const isTrialExpired: boolean = !!(company?.plan === "trial" && 
    company?.trial_ends && 
    new Date(company.trial_ends) < new Date());

  const daysLeftInTrial = company?.trial_ends
    ? Math.max(0, Math.ceil((new Date(company.trial_ends).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Fetch company data
  const fetchCompany = useCallback(async () => {
    if (!user) {
      setCompany(null);
      setLoading(false);
      return;
    }

    try {
      // First get the user's profile to find their company_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.company_id) {
        // User doesn't have a company yet (legacy user)
        setCompany(null);
        setLoading(false);
        return;
      }

      // Fetch the company
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profile.company_id)
        .single();

      if (companyError) {
        console.error("Error fetching company:", companyError);
        setError(companyError.message);
        setCompany(null);
      } else {
        setCompany(companyData);
        setError(null);
      }
    } catch (err: any) {
      console.error("Unexpected error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  // Update company settings
  const updateSettings = async (newSettings: Partial<CompanySettings>): Promise<boolean> => {
    if (!company) return false;

    try {
      const mergedSettings = {
        ...company.settings,
        ...newSettings,
      };

      const { error } = await supabase
        .from("companies")
        .update({ settings: mergedSettings })
        .eq("id", company.id);

      if (error) {
        console.error("Error updating settings:", error);
        return false;
      }

      // Update local state
      setCompany(prev => prev ? { ...prev, settings: mergedSettings } : null);
      return true;
    } catch (err) {
      console.error("Error updating settings:", err);
      return false;
    }
  };

  return {
    company,
    loading,
    error,
    isTrialExpired: isTrialExpired as boolean,
    daysLeftInTrial,
    updateSettings,
    refreshCompany: fetchCompany,
  };
}

// Helper to get settings from company or localStorage (for backwards compatibility)
export function getCompanyOrLocalSettings<T>(
  company: Company | null,
  settingsKey: keyof CompanySettings,
  localStorageKey: string,
  defaultValue: T
): T {
  // If company exists, use company settings
  if (company?.settings?.[settingsKey]) {
    return company.settings[settingsKey] as T;
  }

  // Fallback to localStorage
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(localStorageKey);
    if (saved) {
      try {
        return JSON.parse(saved) as T;
      } catch {
        // ignore parse errors
      }
    }
  }

  return defaultValue;
}
