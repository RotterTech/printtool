import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logActivity } from "@/utils/logger";
import { computeCustomerName } from "@/lib/repair-fields";
import { requireAuth } from "@/lib/apiAuth";
import { sendNotification } from "@/lib/notifications";

const NOTIFY_STATUSES = ["Nieuw", "Besteld", "In reparatie", "Reparatie klaar", "Afgehaald", "Geannuleerd"];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    // Helper: Convert empty strings to NULL for Postgres numeric columns
    const toNumericOrNull = (value: any) => {
      if (value === "" || value === null || value === undefined) return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    };
  try {
    const { error: authError, user } = await requireAuth();
    if (authError) return authError;

    const body = await req.json();
    
    console.log("📥 Received update body:", JSON.stringify(body, null, 2));
    // Extra debug: Log all critical fields individually
    console.log("[DEBUG] device_brand:", body.device_brand, "| merk:", body.merk);
    console.log("[DEBUG] device_model:", body.device_model, "| model:", body.model);
    console.log("[DEBUG] serial_number:", body.serial_number, "| serienummer:", body.serienummer);
    console.log("[DEBUG] agreed_price:", body.agreed_price, "| prijsafspraak:", body.prijsafspraak);
    console.log("[DEBUG] kosten:", body.kosten);
    console.log("[DEBUG] accessories:", body.accessories);
    console.log("[DEBUG] problem_description:", body.problem_description, "| omschrijving:", body.omschrijving);
    console.log("[DEBUG] klant:", body.klant, "| customer_name:", body.customer_name);
    console.log("[DEBUG] klantnummer:", body.klantnummer, "| customer_number:", body.customer_number);

    // Extract the ID (required)
    const { id } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: "ID is required for update" },
        { status: 400 }
      );
    }

    // Require critical fields to be present, no fallback or silent acceptance
    const requiredFields = [
      { key: "customer_name", label: "Klantnaam", value: body.customer_name || body.klant || body.last_name || body.first_name },
      { key: "device_brand", label: "Merk", value: body.device_brand || body.merk },
      { key: "device_model", label: "Model", value: body.device_model || body.model },
      // Serienummer is NIET verplicht
      // Only require prijsafspraak (price agreement) field to exist (can be empty string)
      { key: "prijsafspraak", label: "Prijsafspraak", value: ("prijsafspraak" in body) || ("agreed_price" in body) },
      { key: "kosten", label: "Kosten", value: ("kosten" in body) },
      { key: "problem_description", label: "Probleemomschrijving", value: body.problem_description || body.omschrijving },
      { key: "status", label: "Status", value: body.status },
      // Only require accessories field to exist (can be empty array)
      { key: "accessories", label: "Meegenomen accessoires", value: ("accessories" in body) || ("meegekomen_accessoires" in body) },
    ];

    const missingFields = requiredFields.filter(f => {
      // For prijsafspraak, kosten, accessories: only require presence (not non-empty)
      if (["prijsafspraak", "agreed_price", "kosten", "accessories"].includes(f.key)) {
        return !f.value;
      }
      // For all others: require non-empty value
      return !f.value || f.value === "";
    });
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: "Verplichte velden ontbreken",
          missing: missingFields.map(f => f.label),
          message: `Vul alle verplichte velden in: ${missingFields.map(f => f.label).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Only use the values, no fallback
    const payload: Record<string, any> = {
      job_id: body.job_id || body.jobid,
      customer_name: body.customer_name || body.klant || `${body.first_name || ""} ${body.last_name || ""}`.trim() || "",
      customer_email: body.customer_email ?? "",
      customer_phone: body.customer_phone ?? "",
      klantnummer: body.customer_number || body.klantnummer || "",
      device_brand: body.device_brand ?? "",
      device_model: body.device_model ?? "",
      serial_number: body.serial_number ?? "",
      device_password: body.device_password ?? "",
      problem_description: body.problem_description ?? "",
      status: body.status ?? "",
      // Only send agreed_price (canonical column)
      agreed_price: toNumericOrNull(body.agreed_price ?? body.prijsafspraak ?? ""),
      kosten: toNumericOrNull(body.kosten ?? ""),
      onderdeel_besteld: body.onderdeel_besteld ?? false,
      onderdeel_naam: body.onderdeel_naam ?? "",
      onderdeel_leverancier: body.onderdeel_leverancier ?? "",
      datum_in: body.datum_in === "" ? null : (body.datum_in ?? null),
      datum_uit: body.datum_uit === "" ? null : (body.datum_uit ?? null),
      adres: body.adres ?? "",
      woonplaats: body.woonplaats ?? "",
      // Always map accessories from both possible fields, fallback to empty array
      accessories: Array.isArray(body.accessories)
        ? body.accessories.map((acc: any) => ({
            ...acc,
            quantity: toNumericOrNull(acc.quantity),
          }))
        : (Array.isArray(body.meegekomen_accessoires)
            ? body.meegekomen_accessoires.map((acc: any) => ({
                ...acc,
                quantity: toNumericOrNull(acc.quantity),
              }))
            : []),
      device_type: body.device_type ?? "",
    };
    
    console.log("📤 Mapped payload for Supabase:", JSON.stringify(payload, null, 2));
    // Log all mapped payload fields for extra debug
    Object.entries(payload).forEach(([k, v]) => {
      console.log(`[PAYLOAD] ${k}:`, v);
    });

    // Update the repair record in Supabase
    const { data, error } = await supabase
      .from("repairs")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase update error:", error);
      console.error("Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      return NextResponse.json(
        {
          error: error.message || "Update mislukt",
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Reparatie niet gevonden" },
        { status: 404 }
      );
    }

    console.log("✅ Repair updated successfully:", data.job_id || data.jobid);

    // Auto-send notification if status is a trigger status
    if (body.status && NOTIFY_STATUSES.includes(body.status)) {
      sendNotification(data.company_id || null, data, body.status).catch((err) =>
        console.error("⚠️ Notification send error (non-blocking):", err)
      );
    }

    // Log the activity
    const changedFields = Object.keys(payload).filter(
      (key) => payload[key as keyof typeof payload] !== undefined
    );
    await logActivity(
      supabase,
      "UPDATE",
      "REPAIR",
      data.job_id || data.jobid,
      {
        description: "Reparatie status/details gewijzigd",
        changed_fields: changedFields,
        status: payload.status,
      },
      user?.id
    );

    return NextResponse.json({
      success: true,
      data,
      message: `Reparatie #${data.job_id || data.jobid} bijgewerkt!`,
    });
  } catch (e: any) {
    console.error("❌ Server error:", e);
    return NextResponse.json(
      {
        error: "Serverfout bij update",
        message: e?.message || "Onbekende fout",
      },
      { status: 500 }
    );
  }
}
