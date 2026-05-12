import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SettingsDashboard from "./SettingsDashboard";

export default async function SettingsPage() {
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

  // Fetch authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Fetch current user profile
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!currentProfile) {
    redirect("/login");
  }

  // Fetch all profiles for team management
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const profiles = profilesData ?? [];

  // Fetch audit logs
  let auditLogs: any[] = [];
  
  if (currentProfile.role === "admin") {
    const { data: auditLogsData, error: logsError } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    auditLogs = auditLogsData ?? [];
    
    if (logsError) {
      console.error("Audit logs error:", logsError);
    }
  }

  return (
    <SettingsDashboard
      profiles={profiles}
      currentUserId={user.id}
      currentUserRole={currentProfile.role}
      auditLogs={auditLogs}
    />
  );
}
