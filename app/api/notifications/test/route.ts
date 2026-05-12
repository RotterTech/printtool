import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { sendTestNotification } from "@/lib/notifications";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST — Send a test notification
export async function POST(req: Request) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await req.json();
    const { channel, recipient } = body;

    if (!channel || !recipient) {
      return NextResponse.json(
        { error: "channel en recipient zijn verplicht" },
        { status: 400 }
      );
    }

    if (channel !== "email" && channel !== "whatsapp") {
      return NextResponse.json(
        { error: "channel moet 'email' of 'whatsapp' zijn" },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .maybeSingle();

    let companyName = "De Digitale Klusjesman";
    if (profile?.company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", profile.company_id)
        .maybeSingle();
      companyName = company?.name || companyName;
    }

    const result = await sendTestNotification(channel, recipient, companyName);

    return NextResponse.json({ success: result.success, error: result.error });
  } catch (e: any) {
    console.error("❌ Test notification error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
