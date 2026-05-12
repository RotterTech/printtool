import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  // Get current user's profile for role check
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!currentProfile) {
    return NextResponse.json({ error: "Profiel niet gevonden" }, { status: 404 });
  }

  const body = await request.json();
  const { targetUserId, full_name, role, email } = body;

  // Determine which user we're editing
  const editingOther = targetUserId && targetUserId !== user.id;

  // Only admins can edit other users or change roles
  if (editingOther && currentProfile.role !== "admin") {
    return NextResponse.json({ error: "Geen rechten om andere gebruikers te bewerken" }, { status: 403 });
  }

  if (role && currentProfile.role !== "admin") {
    return NextResponse.json({ error: "Geen rechten om rollen te wijzigen" }, { status: 403 });
  }

  // Build update payload
  const updateData: Record<string, any> = {};
  if (full_name !== undefined) updateData.full_name = full_name.trim();
  if (email !== undefined) updateData.email = email.trim();
  if (role && currentProfile.role === "admin") {
    if (!["admin", "medewerker"].includes(role)) {
      return NextResponse.json({ error: "Ongeldige rol" }, { status: 400 });
    }
    updateData.role = role;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Niets om bij te werken" }, { status: 400 });
  }

  const idToUpdate = editingOther ? targetUserId : user.id;

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", idToUpdate)
    .select()
    .single();

  if (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Kon profiel niet bijwerken" }, { status: 500 });
  }

  return NextResponse.json({ success: true, profile: data });
}
