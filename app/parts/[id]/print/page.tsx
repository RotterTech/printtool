import { createClient } from "@supabase/supabase-js";
import LabelPreview from "@/components/LabelPreview";
import AutoPrint from "@/components/AutoPrint";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PartPrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function PartPrintPage({ params }: PartPrintPageProps) {
  const { id } = await params;

  const normalizedId = id.toUpperCase();
  const isUuid = normalizedId.length > 30;
  const isNumeric = /^\d+$/.test(normalizedId);

  let query = supabase.from("pulled_parts").select("*");

  if (isUuid) {
    query = query.eq("id", id);
  } else if (isNumeric) {
    query = query.eq("short_id", normalizedId);
  } else {
    const shortId = normalizedId.startsWith("P") ? normalizedId : `P${normalizedId}`;
    query = query.eq("short_id", shortId);
  }

  const { data: part, error } = await query.maybeSingle();

  if (error && (error.code || error.message)) {
    return (
      <div style={{ padding: 20, color: "red", fontFamily: "Arial" }}>
        ❌ Fout bij laden van onderdeel voor print.
      </div>
    );
  }

  if (!part) {
    return (
      <div style={{ padding: 20, color: "red", fontFamily: "Arial" }}>
        ❌ Onderdeel niet gevonden.
      </div>
    );
  }

  return (
    <>
      <LabelPreview repair={{ ...part, mode: "part", type: "part" }} />
      <AutoPrint delayMs={100} />
    </>
  );
}
