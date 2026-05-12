import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface CreateApkBody {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  klantnummer?: string;
  device_brand: string;
  device_model: string;
}

function generateJobId(): string {
  // 6-character uppercase alphanumeric ID
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CreateApkBody>;
    const customer_name = body.customer_name?.trim();
    const customer_email = body.customer_email?.trim() || null;
    const customer_phone = body.customer_phone?.trim() || null;
    const klantnummer = body.klantnummer?.trim() || null;
    const device_brand = body.device_brand?.trim();
    const device_model = body.device_model?.trim();

    if (!customer_name || !device_brand || !device_model) {
      return NextResponse.json(
        { error: "customer_name, device_brand en device_model zijn verplicht" },
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
            } catch {
              // Ignored in Server Components / Route Handlers
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: login vereist" },
        { status: 401 }
      );
    }

    // Try inserting with generated job_id; retry a few times on unique constraint violation
    const maxAttempts = 5;
    let attempt = 0;
    let insertError: any = null;
    let insertedRow: any = null;

    while (attempt < maxAttempts) {
      const job_id = generateJobId();
      const { data, error } = await supabase
        .from("apk_maintenance")
        .insert({
          job_id,
          customer_name,
          customer_email,
          customer_phone,
          klantnummer,
          device_brand,
          device_model,
          // status defaults to 'Ingeboekt'
        })
        .select("*")
        .single();

      if (!error && data) {
        insertedRow = data;
        insertError = null;
        break;
      }

      // If duplicate key on job_id, retry; otherwise break
      if (error?.code === "23505" || (error?.message || "").toLowerCase().includes("duplicate")) {
        attempt += 1;
        continue;
      } else {
        insertError = error;
        break;
      }
    }

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || "Kon APK job niet aanmaken" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, job: insertedRow },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Interne serverfout" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const body = await request.json().catch(() => null);
    const ids = Array.isArray(body?.ids) ? body.ids : [];

    if (!id && ids.length === 0) {
      return NextResponse.json(
        { error: "id(s) are required" },
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

    const deleteQuery = supabase.from("apk_maintenance").delete();
    const { error } = ids.length > 0
      ? await deleteQuery.in("id", ids)
      : await deleteQuery.eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Delete failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Interne serverfout" },
      { status: 500 }
    );
  }
}
