import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password, role } = body;

    // Validate input
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "Email, password, and role are required" },
        { status: 400 }
      );
    }

    if (role !== "admin" && role !== "medewerker") {
      return NextResponse.json(
        { error: "Role must be 'admin' or 'medewerker'" },
        { status: 400 }
      );
    }

    // 1. SECURITY CHECK: Verify caller is an admin
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignored in Server Components
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Not logged in" },
        { status: 401 }
      );
    }

    // Check if caller has admin role
    const { data: callerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // 2. CREATE USER WITH ADMIN CLIENT
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create the user
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
      });

    if (createError) {
      console.error("Error creating user:", createError);
      return NextResponse.json(
        { error: createError.message || "Failed to create user" },
        { status: 500 }
      );
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: "User creation failed" },
        { status: 500 }
      );
    }

    // 3. UPDATE PROFILE WITH ROLE
    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUser.user.id,
        email: newUser.user.email,
        role: role,
        created_at: new Date().toISOString(),
      });

    if (profileUpdateError) {
      console.error("Error updating profile:", profileUpdateError);
      // User is created but profile update failed
      return NextResponse.json(
        {
          error: "User created but profile update failed",
          user: newUser.user,
        },
        { status: 500 }
      );
    }

    // Success
    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          role: role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Unexpected error in create-user API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
