import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// GET: List print agents for the company
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

    const { data: agents, error } = await supabase
      .from("print_agents")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ agents: agents || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Register a new print agent
export async function POST(request: Request) {
  try {
    const { supabase, user, error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const { name } = body;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: "Geen bedrijf gevonden" }, { status: 400 });
    }

    // Generate secure API key
    const apiKey = `pa_${crypto.randomBytes(32).toString("hex")}`;

    const { data: agent, error: insertError } = await supabase
      .from("print_agents")
      .insert({
        company_id: profile.company_id,
        name: name || "Mijn Printer",
        api_key: apiKey,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ agent });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove a print agent
export async function DELETE(request: Request) {
  try {
    const { supabase, user, error: authError } = await requireAuth();
    if (authError) return authError;

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Agent ID is verplicht" }, { status: 400 });
    }

    const { error } = await supabase
      .from("print_agents")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
