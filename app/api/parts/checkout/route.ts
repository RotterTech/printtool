import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/apiAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper to validate UUID - derived IDs are not valid UUIDs
const toValidUuidOrNull = (value: any) => {
  if (!value || typeof value !== 'string') return null;
  // If it starts with "derived-", it's a synthetic ID from repairs, not a real customer
  if (value.startsWith('derived-')) return null;
  // Basic UUID validation (v4)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value) ? value : null;
};

export async function POST(req: Request) {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await req.json();
    const {
      id,
      status,
      customer_name,
      customer_id,
      job_id,
      target_device,
      sold_date,
    } = body;

    console.log("📥 Checkout request body:", JSON.stringify(body, null, 2));

    // Validate required fields
    if (!id) {
      console.warn("⚠️ Missing part ID");
      return NextResponse.json(
        { error: "Part ID is required" },
        { status: 400 }
      );
    }

    if (!customer_name || !customer_name.trim()) {
      console.warn("⚠️ Missing customer name");
      return NextResponse.json(
        { error: "Klantnaam is required" },
        { status: 400 }
      );
    }

    if (!status) {
      console.warn("⚠️ Missing status");
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    console.log(`📤 Updating part ${id} with status: ${status}`);

    // Build the update object mapped to existing columns
    const updateData: Record<string, any> = {
      status: status,
      updated_at: new Date().toISOString(),
      used_by_client: customer_name.trim(),
      used_in_device: target_device?.trim() || null,
      used_date: sold_date || new Date().toISOString(),
    };

    // Add customer_id if provided (for linking to customer profile)
    const validCustomerId = toValidUuidOrNull(customer_id);
    if (validCustomerId) {
      updateData.customer_id = validCustomerId;
    }

    console.log("📋 Update data:", JSON.stringify(updateData, null, 2));

    // Update the part
    const { data, error } = await supabase
      .from("pulled_parts")
      .update(updateData)
      .eq("id", id)
      .select("*");

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
          error: `Database error: ${error.message}`,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.warn("⚠️ Part not found:", id);
      return NextResponse.json(
        { error: `Part with id "${id}" not found` },
        { status: 404 }
      );
    }

    console.log(`✅ Part ${id} checked out to ${customer_name}:`, data[0]);

    return NextResponse.json({
      success: true,
      message: "Part successfully checked out",
      part: data[0],
    });
  } catch (e: any) {
    console.error("Checkout API error:", e);
    console.error("Error message:", e?.message);
    console.error("Error stack:", e?.stack);
    return NextResponse.json(
      {
        error: `Server error: ${e instanceof Error ? e.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
