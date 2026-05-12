/* ======================================================
   DELETE — Bulk verwijderen
====================================================== */
export async function DELETE(req: Request) {
  try {
    const { error: authError, user } = await requireAuth();
    if (authError) return authError;

    const body = await req.json();
    const ids: string[] = body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Geen ids opgegeven" }, { status: 400 });
    }
    const { error } = await supabase
      .from("repairs")
      .delete()
      .in("id", ids);
    if (error) {
      console.error("❌ BULK DELETE ERROR:", error);
      return NextResponse.json({ error: error.message || "Verwijderen mislukt" }, { status: 500 });
    }
    // Log activiteit
    await logActivity(
      supabase,
      "DELETE",
      "REPAIR",
      ids.join(","),
      `Bulk verwijderd: ${ids.length} repairs`,
      user?.id
    );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("❌ BULK DELETE SERVER ERROR:", e);
    return NextResponse.json({ error: e?.message || "Serverfout" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logActivity } from "@/utils/logger";
import { computeCustomerName } from "@/lib/repair-fields";
import { requireAuth } from "@/lib/apiAuth";
import { sendNotification } from "@/lib/notifications";

// Statuses that trigger notifications
const NOTIFY_STATUSES = ["Nieuw", "Besteld", "In reparatie", "Reparatie klaar", "Afgehaald", "Geannuleerd"];

// Gebruik ALLEEN de ANON KEY aan client side / route handlers
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Service client for customer auto-linking
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ Helper: Convert empty strings to NULL for Postgres numeric columns
const toNumericOrNull = (value: any) => {
  if (value === "" || value === null || value === undefined) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
};

/* ======================================================
   POST — Reparatie opslaan
====================================================== */
export async function POST(req: Request) {
  try {
    const { error: authError, user } = await requireAuth();
    if (authError) return authError;

    const body = await req.json();
    
    // Debug: Log incoming request
    console.log("📥 POST /api/repairs - Received body:", JSON.stringify(body, null, 2));

    // Get user's company_id
    const { data: profile } = await supabaseService
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .maybeSingle();
    const userCompanyId = profile?.company_id || null;

    // Validate required fields
    const firstName = body.first_name || body.voornaam || "";
    const lastName = body.last_name || body.klant || body.achternaam || "";
    const customerName = body.customer_name || computeCustomerName(firstName, lastName);
    if (!lastName.trim() && !customerName.trim()) {
      console.error("❌ Validation failed: customer name is required");
      return NextResponse.json({ 
        error: "Klantnaam is verplicht" 
      }, { status: 400 });
    }

    // Generate jobId if not provided
    const jobId = body.job_id || body.jobId || body.jobid || 
                  Math.random().toString(16).substring(2, 8).toUpperCase();

    // ✅ CRITICAL: Map to EXACT database column names (mix of English and Dutch)
    const payload: Record<string, any> = {
      company_id: userCompanyId,
      job_id: jobId,
      customer_name: customerName || computeCustomerName(firstName, lastName),
      customer_email: body.customer_email || body.email || "",
      customer_phone: body.customer_phone || body.telefoon || "",
      klantnummer: body.customer_number || body.klantnummer || "",
      device_brand: body.device_brand || body.merk || "",
      device_model: body.device_model || body.model || "",
      device_type: body.device_type || "laptop",
      serial_number: body.serial_number || body.serienummer || "",
      device_password: body.device_password || "",
      problem_description: body.problem_description || body.omschrijving || "",
      agreed_price: toNumericOrNull(body.agreed_price || body.prijsafspraak),
      kosten: toNumericOrNull(body.kosten),
      status: body.status || "Nieuw",
      onderdeel_besteld: Boolean(body.onderdeel_besteld),
      onderdeel_naam: body.onderdeel_naam || "",
      onderdeel_leverancier: body.onderdeel_leverancier || "",
      accessories: Array.isArray(body.accessories)
        ? body.accessories.map((acc: any) => ({
            ...acc,
            quantity: toNumericOrNull(acc.quantity),
          }))
        : [],
      datum_in: body.datum_in || new Date().toISOString(),
      datum_uit: body.datum_uit || null,
      adres: body.adres || "",
      woonplaats: body.woonplaats || "",
      created_at: new Date().toISOString(),
    };

    console.log("📤 Sending to Supabase repairs table:", JSON.stringify(payload, null, 2));

    // Insert into database
    const { data, error } = await supabase
      .from("repairs")
      .insert([payload])
      .select("*");

    if (error) {
      console.error("❌ SUPABASE INSERT ERROR:", error);
      console.error("❌ Error Code:", error.code);
      console.error("❌ Error Message:", error.message);
      console.error("❌ Error Details:", error.details);
      console.error("❌ Error Hint:", error.hint);
      console.error("❌ Failed Payload:", JSON.stringify(payload, null, 2));
      
      return NextResponse.json({ 
        error: error.message || "Database fout bij opslaan",
        details: error.details,
        hint: error.hint,
        code: error.code,
      }, { status: 500 });
    }

    console.log("✅ Successfully inserted repair:", data);

    // Auto-link to customer (non-blocking, best-effort)
    if (data?.[0]) {
      const repair = data[0];
      const companyId = userCompanyId || repair.company_id;
      const email = repair.customer_email;
      const phone = repair.customer_phone;

      // Try to find existing customer by email or phone
      (async () => {
        try {
          let customerId: string | null = null;

          if (email || phone) {
            const conditions: string[] = [];
            if (email) conditions.push(`email.eq.${email}`);
            if (phone) conditions.push(`phone.eq.${phone}`);

            const { data: existing } = await supabaseService
              .from("customers")
              .select("id")
              .eq("company_id", companyId)
              .or(conditions.join(","))
              .limit(1)
              .maybeSingle();

            customerId = existing?.id || null;
          }

          // Create new customer if not found
          if (!customerId) {
            const nameParts = (repair.customer_name || "").split(" ");
            const { data: newCust } = await supabaseService
              .from("customers")
              .insert([{
                company_id: companyId,
                first_name: nameParts[0] || "",
                last_name: nameParts.slice(1).join(" ") || "",
                email: email || null,
                phone: phone || null,
                adres: repair.adres || null,
                woonplaats: repair.woonplaats || null,
                klantnummer: repair.klantnummer || null,
              }])
              .select("id")
              .single();
            customerId = newCust?.id || null;
          }

          // Link repair to customer
          if (customerId) {
            await supabaseService
              .from("repairs")
              .update({ customer_id: customerId })
              .eq("id", repair.id);
          }
        } catch (e) {
          console.error("⚠️ Customer auto-link error (non-blocking):", e);
        }
      })();
    }

    // Auto-send notification for new repair
    if (data?.[0]) {
      sendNotification(data[0].company_id || null, data[0], "Nieuw").catch((err) =>
        console.error("⚠️ Notification send error (non-blocking):", err)
      );
    }

    // Log the activity
    await logActivity(
      supabase,
      "CREATE",
      "REPAIR",
      jobId,
      `Nieuwe reparatie aangemaakt voor ${payload.customer_name}`,
      user?.id
    );

    return NextResponse.json({ 
      success: true, 
      jobId: jobId,
      data: data 
    }, { status: 201 });

  } catch (e) {
    console.error("❌ POST ERROR - Exception thrown:", e);
    console.error("❌ Stack trace:", e instanceof Error ? e.stack : "No stack trace");
    const errorMessage = e instanceof Error ? e.message : "Onbekende server fout";
    
    return NextResponse.json({ 
      error: errorMessage,
      details: "Zie server logs voor meer info"
    }, { status: 500 });
  }
}

/* ======================================================
   GET — Dashboard + filters
====================================================== */
export async function GET(req: Request) {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);

    let query = supabase
      .from("repairs")
      .select("*")
      .order("datum_in", { ascending: false });

    const status = searchParams.get("status");
    const klant = searchParams.get("klant");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const q = searchParams.get("q");

    if (status && status !== "all") query = query.eq("status", status);
    if (klant) query = query.ilike("klant", `%${klant}%`);
    if (from) query = query.gte("datum_in", from);
    if (to) query = query.lte("datum_in", to);

    if (q) {
      query = query.or(`
        klant.ilike.%${q}%,
        merk.ilike.%${q}%,
        model.ilike.%${q}%,
        omschrijving.ilike.%${q}%,
        jobid.ilike.%${q}%
      `);
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (e) {
    console.error("SERVER ERROR:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ======================================================
   PATCH — Update reparatie status
====================================================== */
export async function PATCH(req: Request) {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const body = await req.json();

    if (!id) {
      console.error("❌ PATCH ERROR: ID is required");
      return NextResponse.json(
        { error: "ID is required for update" },
        { status: 400 }
      );
    }

    console.log("🔄 PATCH /api/repairs - Updating repair id:", id, "Data:", body);

    const { data, error } = await supabase
      .from("repairs")
      .update(body)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("❌ SUPABASE PATCH ERROR:", error);
      return NextResponse.json(
        { error: error.message || "Update failed" },
        { status: 400 }
      );
    }

    if (!data) {
      console.error("❌ PATCH ERROR: Repair not found with id:", id);
      return NextResponse.json(
        { error: "Repair not found" },
        { status: 404 }
      );
    }

    console.log("✅ PATCH SUCCESS - Repair updated:", data.jobid);

    // Auto-send notification if status changed to a trigger status
    if (body.status && NOTIFY_STATUSES.includes(body.status)) {
      sendNotification(data.company_id || null, data, body.status).catch((err) =>
        console.error("⚠️ Notification send error (non-blocking):", err)
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: `Repair #${data.jobid} updated successfully`,
    });
  } catch (e: any) {
    console.error("❌ PATCH SERVER ERROR:", e);
    return NextResponse.json(
      { error: "Server error: " + (e?.message || "Unknown error") },
      { status: 500 }
    );
  }
}
