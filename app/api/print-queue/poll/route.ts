import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Service role client for agent auth (agents use API key, not user session)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET: Print Agent polls for pending jobs
// Auth via ?api_key=xxx (no user session needed)
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.nextUrl.searchParams.get("api_key");
    if (!apiKey || apiKey.length < 20) {
      return NextResponse.json({ error: "Ongeldige API key" }, { status: 401 });
    }

    // Find agent by API key
    const { data: agent, error: agentError } = await supabase
      .from("print_agents")
      .select("id, company_id, printer_name")
      .eq("api_key", apiKey)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent niet gevonden" }, { status: 401 });
    }

    // Update last_seen
    await supabase
      .from("print_agents")
      .update({ last_seen_at: new Date().toISOString(), is_online: true })
      .eq("id", agent.id);

    // Fetch pending jobs for this company
    const { data: jobs, error: jobsError } = await supabase
      .from("print_jobs")
      .select("*")
      .eq("company_id", agent.company_id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10);

    if (jobsError) {
      return NextResponse.json({ error: jobsError.message }, { status: 500 });
    }

    // Claim these jobs (set agent_id + status = printing)
    if (jobs && jobs.length > 0) {
      const ids = jobs.map((j) => j.id);
      await supabase
        .from("print_jobs")
        .update({ agent_id: agent.id, status: "printing" })
        .in("id", ids);
    }

    return NextResponse.json({ jobs: jobs || [], agent_id: agent.id });
  } catch (err: any) {
    console.error("Poll error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Agent reports job result (printed or failed)
export async function PATCH(request: NextRequest) {
  try {
    const apiKey = request.nextUrl.searchParams.get("api_key");
    if (!apiKey || apiKey.length < 20) {
      return NextResponse.json({ error: "Ongeldige API key" }, { status: 401 });
    }

    // Verify agent
    const { data: agent } = await supabase
      .from("print_agents")
      .select("id")
      .eq("api_key", apiKey)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent niet gevonden" }, { status: 401 });
    }

    const body = await request.json();
    const { job_id, status, error_message } = body;

    if (!job_id || !["printed", "failed"].includes(status)) {
      return NextResponse.json(
        { error: "job_id en status (printed/failed) zijn verplicht" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "printed") {
      updateData.printed_at = new Date().toISOString();
    }
    if (error_message) {
      updateData.error_message = error_message;
    }

    const { error: updateError } = await supabase
      .from("print_jobs")
      .update(updateData)
      .eq("id", job_id)
      .eq("agent_id", agent.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Patch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
