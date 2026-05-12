import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/apiAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — Get notification settings for company
export async function GET() {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .maybeSingle();

    const companyId = profile?.company_id || null;

    let settingsQuery = supabase.from("notification_settings").select("*");
    settingsQuery = companyId ? settingsQuery.eq("company_id", companyId) : settingsQuery.is("company_id", null);
    const { data: settings } = await settingsQuery.maybeSingle();

    // Get recent notification logs
    let logsQuery = supabase.from("notification_log").select("*");
    logsQuery = companyId ? logsQuery.eq("company_id", companyId) : logsQuery.is("company_id", null);
    const { data: logs } = await logsQuery
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      settings: settings || {
        email_enabled: true,
        whatsapp_enabled: true,
        sender_name: "De Digitale Klusjesman",
        sender_email: null,
      },
      logs: logs || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT — Update notification settings
export async function PUT(req: Request) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .maybeSingle();

    if (!profile?.company_id) {
      // No company: use null for global settings
    }

    const companyId = profile?.company_id || null;

    const body = await req.json();

    // For null company_id, we need a special upsert approach
    if (!companyId) {
      // Check if global settings exist
      const { data: existing } = await supabase
        .from("notification_settings")
        .select("id")
        .is("company_id", null)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("notification_settings")
          .update({
            email_enabled: body.email_enabled ?? true,
            whatsapp_enabled: body.whatsapp_enabled ?? true,
            sender_name: body.sender_name || "De Digitale Klusjesman",
            sender_email: body.sender_email || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .maybeSingle();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ success: true, settings: data });
      } else {
        const { data, error } = await supabase
          .from("notification_settings")
          .insert({
            company_id: null,
            email_enabled: body.email_enabled ?? true,
            whatsapp_enabled: body.whatsapp_enabled ?? true,
            sender_name: body.sender_name || "De Digitale Klusjesman",
            sender_email: body.sender_email || null,
          })
          .select()
          .maybeSingle();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ success: true, settings: data });
      }
    }

    const { data, error } = await supabase
      .from("notification_settings")
      .upsert(
        {
          company_id: companyId,
          email_enabled: body.email_enabled ?? true,
          whatsapp_enabled: body.whatsapp_enabled ?? true,
          sender_name: body.sender_name || "De Digitale Klusjesman",
          sender_email: body.sender_email || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id" }
      )
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
