import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";

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

    // Initialize Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    // Parse request body
    const body = await request.json();
    console.log("📦 Received body:", JSON.stringify(body, null, 2));

    // Validate parts array
    if (!body.parts || !Array.isArray(body.parts)) {
      console.error("❌ Invalid payload: parts array missing");
      return NextResponse.json(
        { error: "Invalid payload: parts array is required" },
        { status: 400 }
      );
    }

    if (body.parts.length === 0) {
      console.error("❌ Empty parts array");
      return NextResponse.json(
        { error: "No parts to save" },
        { status: 400 }
      );
    }

    // Map frontend payload to database schema
    const partsToInsert = body.parts.map((part: any) => ({
      short_id: part.short_id,
      category: part.part_type,
      brand: part.source_brand,
      model: part.source_model,
      specs: part.part_specs,
      serial_number: part.part_serial || null,
      note: part.part_notes || null,
      quantity: part.quantity || 1,
      status: "Op Voorraad",
      created_at: new Date().toISOString(),
    }));

    console.log("💾 Inserting into DB:", JSON.stringify(partsToInsert, null, 2));

    // Insert into database
    const { data, error } = await supabase
      .from("pulled_parts")
      .insert(partsToInsert)
      .select();

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    console.log("✅ Successfully inserted:", data);
    return NextResponse.json({ success: true, parts: data }, { status: 201 });
  } catch (e: any) {
    console.error("❌ API Error:", e);
    return NextResponse.json(
      { error: e?.message || "Unknown server error" },
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
      return NextResponse.json(
        { error: "Part ID(s) are required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const deleteQuery = supabase.from("pulled_parts").delete();
    const { error } = ids.length > 0
      ? await deleteQuery.in("id", ids)
      : await deleteQuery.eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Delete failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown server error" },
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
      return NextResponse.json({ error: "Part ID is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    // Build update payload
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Map known fields
    if (updateData.status !== undefined) payload.status = updateData.status;
    if (updateData.used_by_client !== undefined) payload.used_by_client = updateData.used_by_client;
    if (updateData.used_in_device !== undefined) payload.used_in_device = updateData.used_in_device;
    if (updateData.customer_id !== undefined) payload.customer_id = toValidUuidOrNull(updateData.customer_id);
    if (updateData.note !== undefined) payload.note = updateData.note;
    if (updateData.category !== undefined) payload.category = updateData.category;
    if (updateData.specs !== undefined) payload.specs = updateData.specs;
    if (updateData.brand !== undefined) payload.brand = updateData.brand;
    if (updateData.model !== undefined) payload.model = updateData.model;

    // Set used_date on checkout
    if (updateData.status === "Gebruikt" && !payload.used_date) {
      payload.used_date = new Date().toISOString();
    }

    console.log("📋 Part PUT update:", { id, payload });

    const { data, error } = await supabase
      .from("pulled_parts")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Part update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    console.error("❌ PUT /api/parts error:", e);
    return NextResponse.json({ error: e?.message || "Unknown server error" }, { status: 500 });
  }
}
