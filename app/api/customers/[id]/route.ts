import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/apiAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Check if real customers table exists (cached, re-check every 60s)
let _hasCustomersTable: boolean | null = null;
let _tableCheckTime = 0;
async function hasCustomersTable(): Promise<boolean> {
  const now = Date.now();
  if (_hasCustomersTable !== null && now - _tableCheckTime < 60_000) return _hasCustomersTable;
  const { error } = await supabase.from("customers").select("id").limit(1);
  _hasCustomersTable = !error;
  _tableCheckTime = now;
  return _hasCustomersTable;
}

const REPAIR_FIELDS = "id, job_id, customer_name, customer_email, customer_phone, klantnummer, device_brand, device_model, device_type, status, problem_description, agreed_price, kosten, datum_in, datum_uit, created_at";
const APK_FIELDS = "id, job_id, customer_name, device_brand, device_model, status, created_at";
const PARTS_FIELDS = "id, short_id, category, brand, model, specs, status, used_by_client, used_in_device, used_date, created_at";

// Fetch APK records matching a customer name
async function fetchApkByName(customerName: string, companyId: string | null) {
  if (!customerName || customerName === "Naamloos") return [];
  let query = supabase
    .from("apk_maintenance")
    .select(APK_FIELDS)
    .eq("customer_name", customerName)
    .order("created_at", { ascending: false });
  if (companyId) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  }
  const { data } = await query;
  return data || [];
}

// Fetch pulled_parts by customer name or customer_id
async function fetchPartsByCustomer(customerName: string | null, customerId: string | null, companyId: string | null) {
  const parts: any[] = [];
  
  // Fetch by customer name (for derived customers)
  if (customerName && customerName !== "Naamloos") {
    const { data } = await supabase
      .from("pulled_parts")
      .select(PARTS_FIELDS)
      .eq("used_by_client", customerName)
      .in("status", ["Verkocht", "Gebruikt"])
      .order("used_date", { ascending: false });
    if (data) parts.push(...data);
  }
  
  // Also fetch by customer_id (for real customers with FK link)
  if (customerId && !customerId.startsWith("derived-")) {
    const { data } = await supabase
      .from("pulled_parts")
      .select(PARTS_FIELDS)
      .eq("customer_id", customerId)
      .in("status", ["Verkocht", "Gebruikt"])
      .order("used_date", { ascending: false });
    // Avoid duplicates
    if (data) {
      for (const p of data) {
        if (!parts.find(x => x.id === p.id)) parts.push(p);
      }
    }
  }
  
  return parts;
}

const REFURBISHED_FIELDS = "id, brand, model, origin, price, sold_price, status, sold_date, sold_to_customer, donor_name, donor_email, donor_phone, donor_klantnummer, created_at";

// Fetch refurbished purchases by customer name or customer_id
async function fetchRefurbishedByCustomer(customerName: string | null, customerId: string | null, companyId: string | null) {
  const purchases: any[] = [];
  
  // Fetch by customer name (sold_to_customer field)
  if (customerName && customerName !== "Naamloos") {
    const { data } = await supabase
      .from("refurbished_stock")
      .select(REFURBISHED_FIELDS)
      .eq("sold_to_customer", customerName)
      .eq("status", "Verkocht")
      .order("sold_date", { ascending: false });
    if (data) purchases.push(...data);
  }
  
  // Also fetch by customer_id (for real customers with FK link)
  if (customerId && !customerId.startsWith("derived-")) {
    const { data } = await supabase
      .from("refurbished_stock")
      .select(REFURBISHED_FIELDS)
      .eq("customer_id", customerId)
      .eq("status", "Verkocht")
      .order("sold_date", { ascending: false });
    // Avoid duplicates
    if (data) {
      for (const p of data) {
        if (!purchases.find(x => x.id === p.id)) purchases.push(p);
      }
    }
  }
  
  return purchases;
}

// Fetch donations/inkoop by customer (where customer is the donor)
async function fetchDonationsByCustomer(customerName: string | null, customerId: string | null, companyId: string | null) {
  const donations: any[] = [];
  
  // Fetch by donor_name
  if (customerName && customerName !== "Naamloos") {
    const { data } = await supabase
      .from("refurbished_stock")
      .select(REFURBISHED_FIELDS)
      .eq("donor_name", customerName)
      .in("origin", ["donatie", "inkoop"])
      .order("created_at", { ascending: false });
    if (data) donations.push(...data);
  }
  
  // Also fetch by donor_id (for real customers with FK link)
  if (customerId && !customerId.startsWith("derived-")) {
    const { data } = await supabase
      .from("refurbished_stock")
      .select(REFURBISHED_FIELDS)
      .eq("donor_id", customerId)
      .in("origin", ["donatie", "inkoop"])
      .order("created_at", { ascending: false });
    // Avoid duplicates
    if (data) {
      for (const d of data) {
        if (!donations.find(x => x.id === d.id)) donations.push(d);
      }
    }
  }
  
  return donations;
}

/* ======================================================
   GET — Customer dossier: customer + repairs + purchases
====================================================== */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authError, user } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;

    // Get user's company_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .maybeSingle();

    const companyId = profile?.company_id;
    const useRealTable = await hasCustomersTable();

    // ============================================================
    // DERIVED MODE: No customers table — build dossier from repairs
    // ============================================================
    if (!useRealTable || id.startsWith("derived-")) {
      // The id is "derived-{repair_id}" — find the source repair to get email/phone/name
      const repairId = id.replace("derived-", "");
      const { data: sourceRepair } = await supabase
        .from("repairs")
        .select(REPAIR_FIELDS)
        .eq("id", repairId)
        .maybeSingle();

      if (!sourceRepair) {
        return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
      }

      const email = sourceRepair.customer_email || null;
      const phone = sourceRepair.customer_phone || null;
      const displayName = sourceRepair.customer_name || "Naamloos";
      const nameParts = displayName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Find all repairs matching this customer by email or phone
      const matchConditions: string[] = [];
      if (email) matchConditions.push(`customer_email.eq.${email}`);
      if (phone) matchConditions.push(`customer_phone.eq.${phone}`);
      // Also match by exact name if no email/phone
      if (matchConditions.length === 0 && displayName !== "Naamloos") {
        matchConditions.push(`customer_name.eq.${displayName}`);
      }

      let allRepairs: any[] = [];
      if (matchConditions.length > 0) {
        let query = supabase
          .from("repairs")
          .select(REPAIR_FIELDS)
          .or(matchConditions.join(","))
          .order("datum_in", { ascending: false });

        if (companyId) {
          query = query.or(`company_id.eq.${companyId},company_id.is.null`);
        }

        const { data } = await query;
        allRepairs = data || [];
      }

      // If no matches found, at least include the source repair
      if (allRepairs.length === 0) {
        allRepairs = [sourceRepair];
      }

      // Fetch APK/maintenance records by customer name
      const apkRecords = await fetchApkByName(displayName, companyId);

      // Fetch pulled_parts used for this customer
      const pulledParts = await fetchPartsByCustomer(displayName, null, companyId);

      // Fetch refurbished purchases for this customer
      const refurbishedPurchases = await fetchRefurbishedByCustomer(displayName, null, companyId);

      // Fetch donations/inkoop from this customer
      const customerDonations = await fetchDonationsByCustomer(displayName, null, companyId);

      // Build synthetic customer object
      const customer = {
        id,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        email,
        phone,
        klantnummer: sourceRepair.klantnummer || null,
        adres: null,
        woonplaats: null,
        notities: null,
        created_at: allRepairs[allRepairs.length - 1]?.created_at || sourceRepair.created_at,
        _derived: true,
      };

      // Calculate refurbished purchases spent
      const purchaseSpent = refurbishedPurchases.reduce(
        (sum: number, p: any) => sum + (parseFloat(p.sold_price) || parseFloat(p.price) || 0),
        0
      );

      return NextResponse.json({
        customer,
        repairs: allRepairs,
        apk: apkRecords,
        unlinked_repairs: [],
        purchases: refurbishedPurchases,
        parts: pulledParts,
        donations: customerDonations,
        stats: {
          total_repairs: allRepairs.length,
          active_repairs: allRepairs.filter(
            (r: any) => !["Afgehaald", "Geannuleerd"].includes(r.status)
          ).length,
          total_spent: allRepairs.reduce(
            (sum: number, r: any) => sum + (parseFloat(r.kosten) || parseFloat(r.agreed_price) || 0),
            0
          ) + purchaseSpent,
          total_apk: apkRecords.length,
          total_purchases: refurbishedPurchases.length,
          total_parts: pulledParts.length,
          total_donations: customerDonations.length,
        },
      });
    }

    // ============================================================
    // REAL TABLE MODE
    // ============================================================
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .maybeSingle();

    if (custErr || !customer) {
      return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
    }

    // Get linked repairs (via customer_id FK)
    const { data: linkedRepairs } = await supabase
      .from("repairs")
      .select(REPAIR_FIELDS)
      .eq("customer_id", id)
      .order("datum_in", { ascending: false });

    // Find repairs that match by email or phone but aren't linked yet
    const matchConditions: string[] = [];
    if (customer.email) matchConditions.push(`customer_email.eq.${customer.email}`);
    if (customer.phone) matchConditions.push(`customer_phone.eq.${customer.phone}`);

    let unmatchedRepairs: any[] = [];
    if (matchConditions.length > 0) {
      const linkedIds = (linkedRepairs || []).map((r: any) => r.id);
      const { data: extraRepairs } = await supabase
        .from("repairs")
        .select(REPAIR_FIELDS)
        .or(`company_id.eq.${companyId},company_id.is.null`)
        .is("customer_id", null)
        .or(matchConditions.join(","))
        .order("datum_in", { ascending: false });

      unmatchedRepairs = (extraRepairs || []).filter((r: any) => !linkedIds.includes(r.id));
    }

    // Fetch APK records by customer display name
    const customerDisplayName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || customer.display_name;
    const apkRecords = await fetchApkByName(customerDisplayName, companyId);

    // Fetch pulled_parts for this customer
    const pulledParts = await fetchPartsByCustomer(customerDisplayName, id, companyId);

    // Fetch refurbished purchases for this customer (by name and customer_id)
    const purchases = await fetchRefurbishedByCustomer(customerDisplayName, id, companyId);

    // Fetch donations/inkoop from this customer
    const donations = await fetchDonationsByCustomer(customerDisplayName, id, companyId);

    // Calculate total spent from repairs
    const repairSpent = [...(linkedRepairs || []), ...unmatchedRepairs].reduce(
      (sum: number, r: any) => sum + (parseFloat(r.kosten) || parseFloat(r.agreed_price) || 0),
      0
    );
    
    // Add laptop purchase prices to total spent
    const purchaseSpent = purchases.reduce(
      (sum: number, p: any) => sum + (parseFloat(p.sold_price) || parseFloat(p.price) || 0),
      0
    );

    return NextResponse.json({
      customer,
      repairs: linkedRepairs || [],
      apk: apkRecords,
      unlinked_repairs: unmatchedRepairs,
      purchases,
      parts: pulledParts,
      donations,
      stats: {
        total_repairs: (linkedRepairs?.length || 0) + unmatchedRepairs.length,
        active_repairs: [...(linkedRepairs || []), ...unmatchedRepairs].filter(
          (r: any) => !["Afgehaald", "Geannuleerd"].includes(r.status)
        ).length,
        total_spent: repairSpent + purchaseSpent,
        total_apk: apkRecords.length,
        total_purchases: purchases.length,
        total_parts: pulledParts.length,
        total_donations: donations.length,
      },
    });
  } catch (e: any) {
    console.error("❌ GET /api/customers/[id] error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
