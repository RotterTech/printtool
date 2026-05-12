import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/apiAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* GET — Repair counts per customer ID (works for derived-* IDs too) */
export async function GET(req: Request) {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids");
    if (!idsParam) return NextResponse.json({ counts: {} });

    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ counts: {} });

    // For derived customers, the count is already embedded in the derived data
    // For real customers, query by customer_id FK
    const realIds = ids.filter((id) => !id.startsWith("derived-"));
    const counts: Record<string, number> = {};

    if (realIds.length > 0) {
      const { data } = await supabase
        .from("repairs")
        .select("customer_id")
        .in("customer_id", realIds);

      for (const row of data || []) {
        if (row.customer_id) {
          counts[row.customer_id] = (counts[row.customer_id] || 0) + 1;
        }
      }
    }

    // Derived IDs get their count from the _repair_count field (set client-side)
    return NextResponse.json({ counts });
  } catch {
    return NextResponse.json({ counts: {} });
  }
}
