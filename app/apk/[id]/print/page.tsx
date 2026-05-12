"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import LabelPreview from "@/components/LabelPreview";

export default function APKPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJob = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data } = await supabase
        .from("apk_maintenance")
        .select("*")
        .eq("id", id)
        .single();

      setJob(data);
      setLoading(false);

      // Trigger print after data is ready
      if (data) {
        setTimeout(() => {
          window.print();
        }, 500);
      }
    };

    fetchJob();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center">⏳ Laden...</div>;
  }

  if (!job) {
    return <div className="p-8 text-red-600">❌ APK job niet gevonden</div>;
  }

  const labelData = {
    type: "apk",
    job_id: job.job_id,
    customer_name: job.customer_name,
    device_brand: job.device_brand,
    device_model: job.device_model,
  };

  return (
    <div className="w-full h-screen bg-white flex items-center justify-center">
      <LabelPreview repair={labelData} />
    </div>
  );
}
