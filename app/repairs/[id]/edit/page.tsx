import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import EditRepairForm from "./EditRepairForm";

// Direct Supabase client for server-side queries
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRepairPage({ params }: EditPageProps) {
  const { id } = await params;

  console.log("🔍 EditRepairPage: Fetching repair with job_id:", id);

  // Fetch repair data by job_id (short code on sticker)
  const { data: repair, error } = await supabase
    .from("repairs")
    .select("*")
    .eq("job_id", id)
    .single();

  if (error) {
    console.error("❌ Database error:", error);
    return (
      <div className="p-6 text-red-600">
        ❌ Fout bij laden reparatie: {error.message}
      </div>
    );
  }

  if (!repair) {
    console.warn("⚠️  Repair not found:", id);
    return (
      <div className="p-6 text-red-600">
        ❌ Reparatie niet gevonden
      </div>
    );
  }

  // Normalize new column names to the EditRepairForm props
  const normalizedRepair = {
    ...repair,
    jobid: repair.job_id ?? id,
    first_name: repair.first_name ?? "",
    last_name: repair.last_name ?? "",
    klant: repair.customer_name ?? "",
    email: repair.customer_email ?? "",
    telefoon: repair.customer_phone ?? "",
    klantnummer: repair.klantnummer ?? "",
    merk: repair.device_brand ?? "",
    model: repair.device_model ?? "",
    serienummer: repair.serial_number ?? "",
    device_password: repair.device_password ?? "",
    omschrijving: repair.problem_description ?? "",
    prijsafspraak: repair.agreed_price ?? "",
    status: repair.status ?? "Nieuw",
    onderdeel_besteld: repair.onderdeel_besteld ?? false,
    onderdeel_naam: repair.onderdeel_naam ?? "",
    onderdeel_leverancier: repair.onderdeel_leverancier ?? "",
    adres: repair.adres ?? "",
    woonplaats: repair.woonplaats ?? "",
    kosten: repair.kosten ?? "",
    datum_in: repair.datum_in ?? "",
    send_to_wefact: repair.send_to_wefact !== false,
  } as any;

  console.log("✅ Normalized repair data:", {
    status: normalizedRepair.status,
    merk: normalizedRepair.merk,
    model: normalizedRepair.model,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <EditRepairForm repair={normalizedRepair} />
    </div>
  );
}
