import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

// POST: Create a new print job in the queue
export async function POST(request: Request) {
  try {
    const { supabase, user, error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const { job_type, reference_id, label_data } = body;

    if (!label_data) {
      return NextResponse.json({ error: "label_data is verplicht" }, { status: 400 });
    }

    // Get user's company_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: "Geen bedrijf gevonden" }, { status: 400 });
    }

    // Find the company's active print agent
    const { data: agent } = await supabase
      .from("print_agents")
      .select("id")
      .eq("company_id", profile.company_id)
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    // Create print job
    const { data: job, error: insertError } = await supabase
      .from("print_jobs")
      .insert({
        company_id: profile.company_id,
        agent_id: agent?.id || null,
        job_type: job_type || "repair_label",
        reference_id: reference_id || null,
        label_data,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Print queue insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, job });
  } catch (err: any) {
    console.error("Print queue error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET: List recent print jobs for the company
export async function GET() {
  try {
    const { supabase, user, error: authError } = await requireAuth();
    if (authError) return authError;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: "Geen bedrijf gevonden" }, { status: 400 });
    }

    const { data: jobs, error } = await supabase
      .from("print_jobs")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ jobs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
