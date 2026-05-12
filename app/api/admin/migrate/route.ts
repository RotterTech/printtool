import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/apiAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — Check migration status
export async function GET() {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const checks: Record<string, boolean> = {};

    // Check status_token column
    const { error: e1 } = await supabase.from("repairs").select("status_token").limit(1);
    checks.status_token = !e1;

    // Check customers table
    const { error: e2 } = await supabase.from("customers").select("id").limit(1);
    checks.customers_table = !e2;

    // Check customer_id on repairs
    const { error: e3 } = await supabase.from("repairs").select("customer_id").limit(1);
    checks.repairs_customer_id = !e3;

    // Check customer_id on refurbished_stock
    const { error: e4 } = await supabase.from("refurbished_stock").select("customer_id").limit(1);
    checks.refurbished_customer_id = !e4;

    const allGood = Object.values(checks).every(v => v);

    return NextResponse.json({
      migrated: allGood,
      checks,
      sql_file: "db/migrations/2026-03-25_customers_and_status_token.sql",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
