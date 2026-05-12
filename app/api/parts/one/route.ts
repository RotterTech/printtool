import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/apiAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code || code.trim() === "") {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    const normalized = code.trim().toUpperCase();
    const isUuid = normalized.length > 30;
    const isNumeric = /^\d+$/.test(normalized);

    let query = supabase.from("pulled_parts").select("*");

    if (isUuid) {
      query = query.eq("id", normalized);
    } else if (isNumeric) {
      query = query.eq("short_id", normalized);
    } else {
      const shortId = normalized.startsWith("P") ? normalized : `P${normalized}`;
      query = query.eq("short_id", shortId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
