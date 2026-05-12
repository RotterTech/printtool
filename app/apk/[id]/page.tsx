import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { notFound } from "next/navigation";
import APKDetailClient from "@/components/APKDetailClient";

export default async function APKDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Initialize Supabase server client
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
          } catch {}
        },
      },
    }
  );

  // Fetch APK job by ID (id is the database uuid, not job_id)
  const { data: job, error } = await supabase
    .from("apk_maintenance")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !job) {
    console.error("❌ APK job not found:", error);
    notFound();
  }

  console.log("✅ Fetched APK job:", job.job_id);

  return (
    <div className="min-h-screen bg-gray-50">
      <APKDetailClient initialData={job} />
    </div>
  );
}
