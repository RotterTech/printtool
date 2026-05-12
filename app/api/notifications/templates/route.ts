import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/apiAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — List templates for company
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

    let query = supabase
      .from("notification_templates")
      .select("*")
      .order("created_at");
    query = companyId ? query.eq("company_id", companyId) : query.is("company_id", null);

    const { data: templates } = await query;

    return NextResponse.json({ templates: templates || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT — Update a template
export async function PUT(req: Request) {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await req.json();
    const { id, email_enabled, whatsapp_enabled, email_subject, email_body, whatsapp_body } = body;

    if (!id) {
      return NextResponse.json({ error: "Template ID verplicht" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("notification_templates")
      .update({
        email_enabled,
        whatsapp_enabled,
        email_subject,
        email_body,
        whatsapp_body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, template: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
