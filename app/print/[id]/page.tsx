import { createClient } from "@supabase/supabase-js";
import PrintView from "@/components/PrintView";

// Direct Supabase client for server-side queries
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintPage({ params }: PrintPageProps) {
  // ✅ In Next.js 15+, params is a Promise - must await it
  const { id } = await params;

  console.log("🖨️ Printing for ID:", id);

  // ✅ Validate id before proceeding
  if (!id || id.trim() === "") {
    return (
      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", color: "red" }}>
        ❌ Fout: Geen ID gevonden in URL
      </div>
    );
  }

  // ✅ Try to fetch repair by job_id first (if URL uses Job ID like /print/1477F3)
  // If that fails, try by UUID id
  let repair = null;
  let error = null;

  try {
    console.log("🔍 Attempting to fetch repair with job_id:", id);
    const { data, error: dbError } = await supabase
      .from("repairs")
      .select("*")
      .eq("job_id", id)
      .maybeSingle();

    console.log("📦 Database Result (job_id query):", data);
    console.log("❌ Database Error (job_id query):", dbError);

    if (dbError) {
      console.error("❌ Query error:", dbError.message);
      error = dbError.message || "Database fout";
    } else if (data) {
      repair = data;
      console.log("✅ Repair found by job_id:", repair);
    } else {
      // If job_id query returns null, try by UUID id
      console.log("⚠️  No repair found by job_id, trying by UUID id:", id);
      const { data: uuidData, error: uuidError } = await supabase
        .from("repairs")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      console.log("📦 Database Result (id query):", uuidData);
      console.log("❌ Database Error (id query):", uuidError);

      if (uuidError) {
        console.error("❌ UUID query error:", uuidError.message);
        error = uuidError.message || "Database fout";
      } else if (uuidData) {
        repair = uuidData;
        console.log("✅ Repair found by id:", repair);
      } else {
        error = "Reparatie niet gevonden voor ID: " + id;
        console.warn("⚠️  No repair found for either job_id or id:", id);
      }
    }
  } catch (err: any) {
    error = "Fout bij ophalen reparatie: " + (err?.message || "onbekend");
    console.error("❌ Unexpected error:", err);
  }

  // If error or no repair found, show error with specific message
  if (error || !repair) {
    console.error("🚨 FINAL ERROR STATE:", { error, repair });
    return (
      <div style={{
        padding: "40px",
        fontFamily: "Arial, sans-serif",
        color: "red",
        backgroundColor: "#ffcccc",
        borderRadius: "8px",
        maxWidth: "600px",
        margin: "50px auto",
      }}>
        <h1>❌ Reparatie met Job ID {id} niet gevonden.</h1>
        <p><strong>Fout:</strong> {error || "Onbekend"}</p>
        <p style={{ marginTop: "20px", fontSize: "12px", color: "#666" }}>
          💡 Check de browser console en terminal voor meer details.
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print\:hidden {
            display: none !important;
          }
        <PrintView repair={mappedRepair} />;
      `}</style>

      <PrintView repair={repair} />

      {/* Script to trigger print on load */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.addEventListener('load', () => { setTimeout(() => window.print(), 500); });`,
        }}
      />
    </>
  );
}


