import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/apiAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UnifiedCustomer {
  id: string;
  source: "internal" | "wefact";
  name: string;
  email: string | null;
  phone: string | null;
  klantnummer: string | null;
  company?: string | null;
  address?: string | null;
  city?: string | null;
  // For WeFact debtors
  wefactId?: string;
}

// Search internal customers (from repairs table)
async function searchInternalCustomers(term: string, companyId: string | null): Promise<UnifiedCustomer[]> {
  const searchTerm = `%${term.toLowerCase()}%`;
  
  let query = supabase
    .from("repairs")
    .select("id, customer_name, customer_email, customer_phone, klantnummer")
    .or(`customer_name.ilike.${searchTerm},customer_email.ilike.${searchTerm},customer_phone.ilike.${searchTerm},klantnummer.ilike.${searchTerm}`)
    .order("created_at", { ascending: false })
    .limit(50);
  
  if (companyId) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  }
  
  const { data, error } = await query;
  
  if (error || !data) {
    console.error("❌ Internal search error:", error);
    return [];
  }
  
  // Deduplicate by email/phone/name combination
  const seen = new Map<string, UnifiedCustomer>();
  
  for (const r of data) {
    const name = r.customer_name || "Naamloos";
    const email = r.customer_email || null;
    const phone = r.customer_phone || null;
    
    // Create unique key
    const key = `${name.toLowerCase()}-${email?.toLowerCase() || ""}-${phone || ""}`;
    
    if (!seen.has(key) && name !== "Naamloos") {
      seen.set(key, {
        id: `derived-${r.id}`,
        source: "internal",
        name,
        email,
        phone,
        klantnummer: r.klantnummer || null,
      });
    }
  }
  
  return Array.from(seen.values());
}

// Search WeFact customers
async function searchWefactCustomers(term: string): Promise<UnifiedCustomer[]> {
  try {
    // Call internal WeFact API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3050";
    const res = await fetch(`${baseUrl}/api/wefact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "search", term }),
    });
    
    if (!res.ok) {
      console.error("❌ WeFact search failed:", res.status);
      return [];
    }
    
    const data = await res.json();
    const debtors = data.debtors || [];
    
    return debtors.map((d: any) => {
      const firstName = d.FirstName || d.Initials || "";
      const lastName = d.Surname || d.SurName || "";
      const companyName = d.CompanyName || "";
      const name = companyName || `${firstName} ${lastName}`.trim() || "Onbekend";
      
      return {
        id: `wefact-${d.Identifier}`,
        source: "wefact" as const,
        name,
        email: d.EmailAddress || null,
        phone: d.PhoneNumber || d.Telephone || null,
        klantnummer: d.DebtorCode || null,
        company: companyName || null,
        address: d.Address || null,
        city: d.City || d.ZipCode || null,
        wefactId: d.Identifier,
      };
    });
  } catch (err) {
    console.error("❌ WeFact search error:", err);
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const { error: authError, user } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const { term, sources = ["internal", "wefact"] } = body;

    if (!term || term.trim().length < 2) {
      return NextResponse.json({ customers: [] });
    }

    // Get user's company_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .maybeSingle();

    const companyId = profile?.company_id;

    // Search in parallel
    const searchPromises: Promise<UnifiedCustomer[]>[] = [];
    
    if (sources.includes("internal")) {
      searchPromises.push(searchInternalCustomers(term.trim(), companyId));
    }
    
    if (sources.includes("wefact")) {
      searchPromises.push(searchWefactCustomers(term.trim()));
    }

    const results = await Promise.all(searchPromises);
    const allCustomers = results.flat();

    // Sort: exact matches first, then by name
    const termLower = term.trim().toLowerCase();
    allCustomers.sort((a, b) => {
      const aExact = a.name.toLowerCase() === termLower || a.email?.toLowerCase() === termLower;
      const bExact = b.name.toLowerCase() === termLower || b.email?.toLowerCase() === termLower;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Internal customers first (they're already in our system)
      if (a.source === "internal" && b.source !== "internal") return -1;
      if (a.source !== "internal" && b.source === "internal") return 1;
      
      return a.name.localeCompare(b.name);
    });

    // Limit results
    const limited = allCustomers.slice(0, 20);

    return NextResponse.json({ customers: limited });
  } catch (e: any) {
    console.error("❌ Customer search error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
