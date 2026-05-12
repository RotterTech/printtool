import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/apiAuth";
import { sendNotification } from "@/lib/notifications";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await req.json();
    const { id, datum_uit, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing ID" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("repairs")
      .update({
        datum_uit,
        status,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Send notification if status is "Reparatie klaar"
    if (status === "Reparatie klaar" || status === "Afgehaald") {
      const { data: repair } = await supabase
        .from("repairs")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (repair) {
        sendNotification(repair.company_id || null, repair, status).catch((err) =>
          console.error("⚠️ Notification send error (non-blocking):", err)
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}



