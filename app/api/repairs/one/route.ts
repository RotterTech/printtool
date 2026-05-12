import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as printer from "@thiagoelg/node-printer";
import { requireAuth } from "@/lib/apiAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Attempts to find and print repair details on a Brother printer
 * Failures do NOT crash the API - only logged as warnings
 */
async function attemptPrintLabel(repairData: any): Promise<void> {
  try {
    console.log("🖨️  Attempting to find Brother printer...");
    
    const printers = printer.getPrinters();
    console.log(`📋 Available printers: ${printers.map((p) => p.name).join(", ")}`);
    
    const brotherPrinter = printers.find((p) =>
      p.name.toLowerCase().includes("brother")
    );

    if (!brotherPrinter) {
      console.warn(
        "⚠️  No Brother printer found. Skipping print. Available: " +
          printers.map((p) => p.name).join(", ")
      );
      return;
    }

    console.log(`✅ Found Brother printer: ${brotherPrinter.name}`);

    // Format repair data as simple text for printing
    const printContent = `
=====================================
          REPAIR LABEL
=====================================
Job ID: ${repairData.jobid || "N/A"}
Description: ${repairData.description || "N/A"}
Created: ${repairData.created_at || "N/A"}
Status: ${repairData.status || "N/A"}
=====================================
    `;

    // Print to the Brother printer
    printer.printDirect({
      printer: brotherPrinter.name,
      data: printContent,
      type: "TEXT",
      success: function () {
        console.log("✨ Print job sent successfully to " + brotherPrinter.name);
      },
      error: function (err: Error) {
        console.error("❌ Print error:", err.message);
      },
    });

  } catch (printErr: any) {
    // Log but do NOT crash - this is non-critical
    console.warn(
      "⚠️  Print service failed (non-critical):",
      printErr?.message || printErr
    );
  }
}

export async function GET(request: Request) {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    // Extract jobid from query parameters (App Router)
    const { searchParams } = new URL(request.url);
    const jobid = searchParams.get("jobid");
    const skipPrint = ["1", "true", "yes"].includes(
      (searchParams.get("skipPrint") || "").toLowerCase()
    );

    console.log("🔍 API CALL /repairs/one → jobid =", jobid);

    // ✅ STRICT VALIDATION: Reject missing or empty jobid
    if (!jobid || jobid.trim() === "") {
      console.warn("❌ Missing or empty jobid parameter");
      return NextResponse.json(
        { error: "Job ID is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Query the database
    const byJobId = await supabase
      .from("repairs")
      .select("*")
      .eq("job_id", jobid)
      .maybeSingle();

    let data = byJobId.data;
    let error = byJobId.error;

    if (!data) {
      const byLegacyJobId = await supabase
        .from("repairs")
        .select("*")
        .eq("jobid", jobid)
        .maybeSingle();

      data = byLegacyJobId.data;
      error = byLegacyJobId.error;
    }

    console.log("📦 Database result:", {
      found: !!data,
      error: error?.message,
    });

    // Handle database errors
    if (error) {
      console.error("❌ Database error:", error);
      return NextResponse.json(
        { error: "Database error: " + (error.message || "Unknown error") },
        { status: 500 }
      );
    }

    // Handle not found
    if (!data) {
      console.warn("⚠️  Repair not found for jobid:", jobid);
      return NextResponse.json(
        { error: "Repair not found for the given Job ID" },
        { status: 404 }
      );
    }

    // ✅ FAIL-SAFE PRINTING: Attempt print but don't fail if it fails
    if (!skipPrint) {
      attemptPrintLabel(data).catch((err) => {
        console.warn("⚠️  Background print task failed:", err?.message || err);
      });
    }

    // ✅ Return success with data regardless of print status
    return NextResponse.json({
      success: true,
      data,
      message: "Repair data retrieved successfully",
    });

  } catch (err: any) {
    console.error("❌ Unexpected server error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? err?.message : undefined,
      },
      { status: 500 }
    );
  }
}


