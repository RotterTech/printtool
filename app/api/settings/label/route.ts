import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/apiAuth";

export interface LabelSettings {
  default_format: "brother_62mm" | "brother_29mm" | "dymo_99014" | "zebra_4x6" | "receipt_80mm";
  auto_print: boolean;
  font_size_modifier: number;
  orientation: "portrait" | "landscape";
}

const VALID_FORMATS = ["brother_62mm", "brother_29mm", "dymo_99014", "zebra_4x6", "receipt_80mm"];
const VALID_ORIENTATIONS = ["portrait", "landscape"];

const DEFAULT_LABEL_SETTINGS: LabelSettings = {
  default_format: "brother_62mm",
  auto_print: true,
  font_size_modifier: 1.0,
  orientation: "portrait",
};

export async function GET() {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get user's company_id from profile
  const { data: profile, error: profileError } = await supabaseService
    .from("profiles")
    .select("company_id")
    .eq("id", user!.id)
    .single();

  if (profileError || !profile?.company_id) {
    return NextResponse.json({ error: "Geen bedrijf gevonden" }, { status: 404 });
  }

  // Get company settings
  const { data: company, error: companyError } = await supabaseService
    .from("companies")
    .select("settings")
    .eq("id", profile.company_id)
    .single();

  if (companyError) {
    return NextResponse.json({ error: "Fout bij ophalen instellingen" }, { status: 500 });
  }

  const labelSettings: LabelSettings = {
    ...DEFAULT_LABEL_SETTINGS,
    ...(company?.settings?.label_settings || {}),
  };

  return NextResponse.json({ label_settings: labelSettings });
}

export async function PATCH(req: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get user's profile with role and company_id
  const { data: profile, error: profileError } = await supabaseService
    .from("profiles")
    .select("company_id, role")
    .eq("id", user!.id)
    .single();

  if (profileError || !profile?.company_id) {
    return NextResponse.json({ error: "Geen bedrijf gevonden" }, { status: 404 });
  }

  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Alleen admins mogen instellingen wijzigen" }, { status: 403 });
  }

  // Parse and validate input
  let body: Partial<LabelSettings>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  if (body.default_format && !VALID_FORMATS.includes(body.default_format)) {
    return NextResponse.json({ error: "Ongeldig label formaat" }, { status: 400 });
  }
  if (body.orientation && !VALID_ORIENTATIONS.includes(body.orientation)) {
    return NextResponse.json({ error: "Ongeldige oriëntatie" }, { status: 400 });
  }
  if (body.font_size_modifier !== undefined) {
    const mod = Number(body.font_size_modifier);
    if (isNaN(mod) || mod < 0.5 || mod > 2.0) {
      return NextResponse.json({ error: "font_size_modifier moet tussen 0.5 en 2.0 zijn" }, { status: 400 });
    }
    body.font_size_modifier = mod;
  }
  if (body.auto_print !== undefined && typeof body.auto_print !== "boolean") {
    return NextResponse.json({ error: "auto_print moet een boolean zijn" }, { status: 400 });
  }

  // Get current company settings
  const { data: company, error: companyError } = await supabaseService
    .from("companies")
    .select("settings")
    .eq("id", profile.company_id)
    .single();

  if (companyError) {
    return NextResponse.json({ error: "Fout bij ophalen bedrijf" }, { status: 500 });
  }

  // Merge label_settings into existing settings
  const currentSettings = company?.settings || {};
  const currentLabelSettings = currentSettings.label_settings || {};
  const mergedLabelSettings: LabelSettings = {
    ...DEFAULT_LABEL_SETTINGS,
    ...currentLabelSettings,
    ...body,
  };

  const updatedSettings = {
    ...currentSettings,
    label_settings: mergedLabelSettings,
  };

  const { error: updateError } = await supabaseService
    .from("companies")
    .update({ settings: updatedSettings })
    .eq("id", profile.company_id);

  if (updateError) {
    return NextResponse.json({ error: "Fout bij opslaan instellingen" }, { status: 500 });
  }

  return NextResponse.json({ label_settings: mergedLabelSettings });
}
