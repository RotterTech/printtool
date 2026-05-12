import { createClient } from "@supabase/supabase-js";
import StatusClient from "./StatusClient";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SAFE_COLUMNS = "job_id, customer_name, device_brand, device_model, device_type, status, datum_in, datum_uit, created_at, onderdeel_naam";

interface StatusPageProps {
  params: Promise<{ id: string }>;
}

export default async function StatusPage({ params }: StatusPageProps) {
  const { id } = await params;

  if (!id || id.trim() === "") {
    return <StatusClient repair={null} error="Geen referentienummer opgegeven." />;
  }

  let repair = null;

  // Try status_token (UUID) first, then fall back to job_id
  if (UUID_RE.test(id)) {
    try {
      const { data } = await supabase
        .from("repairs")
        .select(SAFE_COLUMNS)
        .eq("status_token", id)
        .maybeSingle();
      repair = data;
    } catch {
      // status_token column may not exist yet — ignore and fall through
    }
  }

  // Fallback: look up by job_id (for old links / before migration)
  if (!repair) {
    const { data } = await supabase
      .from("repairs")
      .select(SAFE_COLUMNS)
      .eq("job_id", id)
      .maybeSingle();
    repair = data;
  }

  if (!repair) {
    return <StatusClient repair={null} error="Reparatie niet gevonden. Controleer het referentienummer." />;
  }

  return <StatusClient repair={repair} />;
}
