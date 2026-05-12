import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/apiAuth";

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/create-company
 * Creates a new company for a user (called after signup)
 */
export async function POST(req: Request) {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await req.json();
    const { userId, companyName, email } = body;

    if (!userId || !companyName) {
      return NextResponse.json(
        { error: "userId and companyName are required" },
        { status: 400 }
      );
    }

    // Generate slug from company name
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50);

    // Calculate trial end date (7 days from now)
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 7);

    // 1. Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: companyName,
        slug: `${slug}-${Date.now().toString(36)}`, // Ensure uniqueness
        owner_id: userId,
        trial_started: new Date().toISOString(),
        trial_ends: trialEnds.toISOString(),
        plan: "trial",
        is_active: true,
        billing_email: email,
        settings: {
          custom_brand_models: null,
          custom_prices: null,
          wefact_api_key: null,
          label_settings: {},
          theme: "default",
        },
      })
      .select()
      .single();

    if (companyError) {
      console.error("❌ Error creating company:", companyError);
      return NextResponse.json(
        { error: "Failed to create company", details: companyError.message },
        { status: 500 }
      );
    }

    console.log("✅ Company created:", company.id);

    // 2. Update or create profile with company_id
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        company_id: company.id,
        role: "admin", // Owner is always admin
        email: email,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error("❌ Error updating profile:", profileError);
      // Don't fail - company is created, profile update is secondary
    } else {
      console.log("✅ Profile linked to company");
    }

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        trial_ends: company.trial_ends,
        plan: company.plan,
      },
    });
  } catch (error: any) {
    console.error("❌ Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
