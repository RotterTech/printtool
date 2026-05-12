import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/apiAuth";
import { sendNotification } from "@/lib/notifications";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST — Send notification for a repair
export async function POST(req: Request) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await req.json();
    const { repair_id, trigger_status } = body;

    if (!repair_id || !trigger_status) {
      return NextResponse.json(
        { error: "repair_id en trigger_status zijn verplicht" },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .maybeSingle();

    const companyId = profile?.company_id || null;

    // Get repair data
    const { data: repair, error: repairError } = await supabase
      .from("repairs")
      .select("*")
      .eq("id", repair_id)
      .maybeSingle();

    if (repairError || !repair) {
      return NextResponse.json({ error: "Reparatie niet gevonden" }, { status: 404 });
    }

    // Send notification
    const results = await sendNotification(
      companyId,
      repair,
      trigger_status
    );

    return NextResponse.json({ success: true, results });
  } catch (e: any) {
    console.error("❌ Notification send error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
