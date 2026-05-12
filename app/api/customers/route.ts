import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/apiAuth";
import { logActivity } from "@/utils/logger";

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

// Derive unique customers from repairs data
async function deriveCustomersFromRepairs(companyId: string | null, search?: string) {
  let query = supabase
    .from("repairs")
    .select("id, customer_name, customer_email, customer_phone, klantnummer, adres, woonplaats, created_at, company_id")
    .order("created_at", { ascending: false });

  if (companyId) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  }

  const { data: repairs } = await query;
  if (!repairs || repairs.length === 0) return [];

  // Group by email > phone > name (dedup key)
  const customerMap = new Map<string, any>();

  for (const r of repairs) {
    const displayName = r.customer_name || "Naamloos";
    const email = r.customer_email || null;
    const phone = r.customer_phone || null;

    // Dedup key: prefer email, then phone, then name
    const key = email || phone || displayName.toLowerCase();
    if (!key || key === "naamloos") continue;

    // Split name into first/last for display
    const nameParts = displayName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    if (!customerMap.has(key)) {
      customerMap.set(key, {
        id: `derived-${r.id}`,   // synthetic ID
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        email: email,
        phone: phone,
        klantnummer: r.klantnummer || null,
        adres: r.adres || null,
        woonplaats: r.woonplaats || null,
        created_at: r.created_at,
        _repair_count: 1,
        _derived: true,
      });
    } else {
      customerMap.get(key)._repair_count += 1;
      // Keep earliest created_at
      const existing = customerMap.get(key);
      if (r.created_at < existing.created_at) {
        existing.created_at = r.created_at;
      }
      // Fill missing fields
      if (!existing.email && email) existing.email = email;
      if (!existing.phone && phone) existing.phone = phone;
      if (!existing.klantnummer && r.klantnummer) existing.klantnummer = r.klantnummer;
      if (!existing.adres && r.adres) existing.adres = r.adres;
      if (!existing.woonplaats && r.woonplaats) existing.woonplaats = r.woonplaats;
    }
  }

  let results = Array.from(customerMap.values());

  // Apply search filter
  if (search) {
    const q = search.toLowerCase();
    results = results.filter((c: any) =>
      (c.display_name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.klantnummer || "").toLowerCase().includes(q)
    );
  }

  return results;
}

/* ======================================================
   GET — List / search customers
====================================================== */
export async function GET(req: Request) {
  try {
    const { error: authError, user } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const id = searchParams.get("id");

    // Get user's company_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .maybeSingle();

    const companyId = profile?.company_id;

    const useRealTable = await hasCustomersTable();

    // If no customers table, derive from repairs
    if (!useRealTable) {
      if (id) {
        // For derived customers, id is "derived-{repair_id}"
        return NextResponse.json({ error: "Klant niet gevonden (migratie niet gedraaid)" }, { status: 404 });
      }
      const derived = await deriveCustomersFromRepairs(companyId, q || undefined);
      return NextResponse.json({ data: derived });
    }

    // Real customers table exists
    if (id) {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .or(`company_id.eq.${companyId},company_id.is.null`)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
      }
      return NextResponse.json({ data });
    }

    let query = supabase
      .from("customers")
      .select("*")
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .order("created_at", { ascending: false });

    if (q) {
      query = query.or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,klantnummer.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (e: any) {
    console.error("❌ GET /api/customers error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* ======================================================
   POST — Create customer
====================================================== */
export async function POST(req: Request) {
  try {
    const { error: authError, user } = await requireAuth();
    if (authError) return authError;

    const body = await req.json();

    // Get user's company_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .maybeSingle();

    const companyId = profile?.company_id;

    const useRealTable = await hasCustomersTable();
    if (!useRealTable) {
      return NextResponse.json(
        { error: "Klanten worden automatisch aangemaakt vanuit reparaties. Maak een reparatie aan om een klant toe te voegen." },
        { status: 400 }
      );
    }

    const payload = {
      company_id: companyId,
      first_name: body.first_name || "",
      last_name: body.last_name || "",
      email: body.email || null,
      phone: body.phone || null,
      adres: body.adres || null,
      woonplaats: body.woonplaats || null,
      klantnummer: body.klantnummer || null,
      wefact_debtor_id: body.wefact_debtor_id || null,
      notities: body.notities || null,
    };

    const { data, error } = await supabase
      .from("customers")
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      console.error("❌ POST /api/customers error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logActivity(supabase, "CREATE", "CUSTOMER", data.id, `Klant aangemaakt: ${data.first_name} ${data.last_name}`, user?.id);

    return NextResponse.json({ data }, { status: 201 });
  } catch (e: any) {
    console.error("❌ POST /api/customers error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* ======================================================
   PATCH — Update customer
====================================================== */
export async function PATCH(req: Request) {
  try {
    const { error: authError, user } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID is verplicht" }, { status: 400 });
    }

    const body = await req.json();

    const useRealTable = await hasCustomersTable();
    if (!useRealTable) {
      return NextResponse.json({ error: "Klantgegevens kunnen nog niet bewerkt worden (migratie niet gedraaid)" }, { status: 400 });
    }

    // Get user's company_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .maybeSingle();

    const allowed = ["first_name", "last_name", "email", "phone", "adres", "woonplaats", "klantnummer", "wefact_debtor_id", "notities"];
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (body[key] !== undefined) payload[key] = body[key];
    }

    const { data, error } = await supabase
      .from("customers")
      .update(payload)
      .eq("id", id)
      .or(`company_id.eq.${profile?.company_id},company_id.is.null`)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
    }

    await logActivity(supabase, "UPDATE", "CUSTOMER", id, `Klant bijgewerkt: ${data.first_name} ${data.last_name}`, user?.id);

    return NextResponse.json({ data });
  } catch (e: any) {
    console.error("❌ PATCH /api/customers error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* ======================================================
   DELETE — Delete customer
====================================================== */
export async function DELETE(req: Request) {
  try {
    const { error: authError, user } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID is verplicht" }, { status: 400 });
    }

    const useRealTable = await hasCustomersTable();
    if (!useRealTable) {
      return NextResponse.json({ error: "Klant verwijderen niet beschikbaar (migratie niet gedraaid)" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .maybeSingle();

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id)
      .or(`company_id.eq.${profile?.company_id},company_id.is.null`);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logActivity(supabase, "DELETE", "CUSTOMER", id, "Klant verwijderd", user?.id);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("❌ DELETE /api/customers error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
