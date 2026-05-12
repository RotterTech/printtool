import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/apiAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper to safely convert numeric-ish values; empty string/null/undefined -> null
const toNumericOrNull = (value: any) => {
  if (value === "" || value === null || value === undefined) return null;
  const num = parseFloat(value);
  return Number.isNaN(num) ? null : num;
};

// Helper to validate UUID - derived IDs are not valid UUIDs
const toValidUuidOrNull = (value: any) => {
  if (!value || typeof value !== 'string') return null;
  // If it starts with "derived-", it's a synthetic ID from repairs, not a real customer
  if (value.startsWith('derived-')) return null;
  // Basic UUID validation (v4)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value) ? value : null;
};

export async function POST(request: Request) {

  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();

    // Validate required fields
    if (!body.brand || !body.brand.trim()) {
      return NextResponse.json({ error: "brand is required" }, { status: 400 });
    }
    if (!body.model || !body.model.trim()) {
      return NextResponse.json({ error: "model is required" }, { status: 400 });
    }

    const payload = {
      brand: body.brand,
      model: body.model,
      cpu: body.cpu ?? null,
      ram: body.ram ?? null,
      ssd: body.ssd ?? null,
      screen: body.screen ?? null,
      graphics: body.graphics ?? null,
      os: body.os ?? null,
      price: toNumericOrNull(body.price),
      status: body.status || "Te Koop",
      // Expect an array; if not provided or invalid, set to null
      ports: Array.isArray(body.ports) ? body.ports : null,
    } as const;

    const { data, error } = await supabase
      .from("refurbished_stock")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase insert error (refurbished_stock):", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    console.error("❌ Refurbished route error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const body = await request.json().catch(() => null);
    const ids = Array.isArray(body?.ids) ? body.ids : [];

    if (!id && ids.length === 0) {
      return NextResponse.json({ error: "id(s) are required" }, { status: 400 });
    }

    const deleteQuery = supabase.from("refurbished_stock").delete();
    const { error } = ids.length > 0
      ? await deleteQuery.in("id", ids)
      : await deleteQuery.eq("id", id);

    if (error) {
      console.error("❌ Supabase delete error (refurbished_stock):", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Refurbished delete error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Build update payload
    const payload: any = {};

    // Standard fields
    if (updateData.brand !== undefined) payload.brand = updateData.brand;
    if (updateData.model !== undefined) payload.model = updateData.model;
    if (updateData.cpu !== undefined) payload.cpu = updateData.cpu;
    if (updateData.ram !== undefined) payload.ram = updateData.ram;
    if (updateData.ssd !== undefined) payload.ssd = updateData.ssd;
    if (updateData.screen !== undefined) payload.screen = updateData.screen;
    if (updateData.graphics !== undefined) payload.graphics = updateData.graphics;
    if (updateData.os !== undefined) payload.os = updateData.os;
    if (updateData.price !== undefined) payload.price = toNumericOrNull(updateData.price);
    if (updateData.status !== undefined) payload.status = updateData.status;
    if (updateData.ports !== undefined) payload.ports = Array.isArray(updateData.ports) ? updateData.ports : null;

    // Sale fields
    if (updateData.sold_to_customer !== undefined) payload.sold_to_customer = updateData.sold_to_customer;
    if (updateData.customer_id !== undefined) payload.customer_id = toValidUuidOrNull(updateData.customer_id);
    if (updateData.sold_price !== undefined) payload.sold_price = toNumericOrNull(updateData.sold_price);
    if (updateData.sold_date !== undefined) payload.sold_date = updateData.sold_date;
    if (updateData.sold_notes !== undefined) payload.sold_notes = updateData.sold_notes;

    const { data, error } = await supabase
      .from("refurbished_stock")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase update error (refurbished_stock):", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Refurbished update error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
