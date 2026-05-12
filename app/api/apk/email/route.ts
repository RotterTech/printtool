import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { requireAuth } from "@/lib/apiAuth";
import { COMPANY } from "@/lib/config";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Build APK rapport email
function buildApkReportEmail(apk: any): { subject: string; html: string } {
  const jobId = apk.job_id || "—";
  const klant = apk.customer_name || "Klant";
  const merk = apk.device_brand || "";
  const model = apk.device_model || "";
  const datum = formatDate(apk.created_at);
  const monteur = apk.performed_by || "—";
  const scoreBefore = apk.scancircle_before ?? "—";
  const scoreAfter = apk.scancircle_after ?? "—";
  const improvementNotes = apk.improvement_notes || "";
  const checklist = apk.checklist_data || {};

  // Generate checklist items HTML
  const checklistItems = [
    "Windows Update",
    "Driver Update",
    "Firmware Update",
    "Disk Cleanup (Admin)",
    "Taakbalk Instellingen uitzetten",
    "Widgets & Nieuws widgets uitzetten",
    "msconfig check",
    "Opstart check",
    "Temp files clean",
    "Intern reinigen",
    "Extern reinigen",
    "ScanCircle scan doen"
  ];

  const checklistHtml = checklistItems.map(item => {
    const done = checklist[item] === true;
    return `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6">${done ? "✅" : "⬜"}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;color:${done ? "#059669" : "#6b7280"}">${item}</td>
    </tr>`;
  }).join("");

  // Improvement notes HTML
  const improvementHtml = improvementNotes ? `
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin-top:20px">
      <h3 style="margin:0 0 12px;color:#92400e;font-size:16px">📝 Aanbevelingen & Verbeterpunten</h3>
      <div style="color:#78350f;white-space:pre-line;font-size:14px">${improvementNotes.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </div>
  ` : "";

  // Score improvement visualization
  let scoreHtml = "";
  if (scoreBefore !== "—" && scoreAfter !== "—") {
    const improvement = Number(scoreAfter) - Number(scoreBefore);
    const improvementColor = improvement > 0 ? "#059669" : improvement < 0 ? "#dc2626" : "#6b7280";
    const improvementSign = improvement > 0 ? "+" : "";
    scoreHtml = `
      <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:16px;margin-top:20px;text-align:center">
        <h3 style="margin:0 0 12px;color:#065f46;font-size:16px">📊 ScanCircle Resultaat</h3>
        <div style="display:flex;justify-content:center;align-items:center;gap:20px;flex-wrap:wrap">
          <div style="text-align:center">
            <p style="margin:0;color:#6b7280;font-size:12px">VOOR</p>
            <p style="margin:4px 0 0;font-size:32px;font-weight:bold;color:#dc2626">${scoreBefore}</p>
          </div>
          <div style="font-size:24px;color:#6b7280">→</div>
          <div style="text-align:center">
            <p style="margin:0;color:#6b7280;font-size:12px">NA</p>
            <p style="margin:4px 0 0;font-size:32px;font-weight:bold;color:#059669">${scoreAfter}</p>
          </div>
          <div style="text-align:center;padding:8px 16px;background:white;border-radius:8px">
            <p style="margin:0;font-size:24px;font-weight:bold;color:${improvementColor}">${improvementSign}${improvement}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#6b7280">punten</p>
          </div>
        </div>
      </div>
    `;
  }

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <!-- Header -->
      <div style="background:#1e40af;color:white;padding:20px;text-align:center">
        <h1 style="margin:0;font-size:24px">${COMPANY.name}</h1>
        <p style="margin:4px 0 0;opacity:0.9;font-size:14px">${COMPANY.phone} | ${COMPANY.email}</p>
      </div>

      <!-- Content -->
      <div style="padding:24px">
        <h2 style="color:#1e40af;margin:0 0 16px;font-size:20px">🔧 APK / Onderhoudsrapport</h2>
        
        <!-- Reference -->
        <div style="background:#f0f9ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:20px">
          <p style="margin:0;font-size:16px"><strong>Referentienummer:</strong> <span style="font-family:monospace;font-size:18px;color:#1e40af">${jobId}</span></p>
        </div>

        <!-- Device Info -->
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;width:40%">Klant</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:600">${klant}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280">Apparaat</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:600">${merk} ${model}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280">Datum</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:600">${datum}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280">Technicus</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:600">${monteur}</td>
          </tr>
        </table>

        <!-- Checklist -->
        <h3 style="margin:20px 0 12px;color:#374151;font-size:16px">✅ Uitgevoerde werkzaamheden</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${checklistHtml}
        </table>

        <!-- Score -->
        ${scoreHtml}

        <!-- Improvements -->
        ${improvementHtml}

        <!-- Warranty -->
        <div style="background:#d1fae5;border:1px solid #6ee7b7;border-radius:8px;padding:12px;margin-top:20px">
          <p style="margin:0;font-size:13px;color:#065f46"><strong>Garantie:</strong> U heeft 90 dagen garantie op het uitgevoerde onderhoud.</p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:12px;color:#6b7280">
        <p style="margin:0">${COMPANY.name} | ${COMPANY.website}</p>
        <p style="margin:4px 0 0">${COMPANY.email} | ${COMPANY.phone}</p>
      </div>
    </div>
  `;

  return {
    subject: `APK Rapport ${jobId} — ${COMPANY.name}`,
    html
  };
}

export async function POST(request: Request) {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const { apkId, email } = body;

    if (!apkId) {
      return NextResponse.json({ error: "APK ID is required" }, { status: 400 });
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Geldig e-mailadres is verplicht" }, { status: 400 });
    }

    // Fetch APK job
    const { data: apk, error: fetchError } = await supabase
      .from("apk_maintenance")
      .select("*")
      .eq("id", apkId)
      .single();

    if (fetchError || !apk) {
      console.error("❌ APK niet gevonden:", fetchError);
      return NextResponse.json({ error: "APK job niet gevonden" }, { status: 404 });
    }

    // Build email
    const { subject, html } = buildApkReportEmail(apk);

    // Send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${COMPANY.name} <${process.env.RESEND_FROM_EMAIL || "noreply@resend.dev"}>`,
      to: email,
      subject,
      html,
    });

    if (emailError) {
      console.error("❌ Resend error:", emailError);
      return NextResponse.json({ error: "Email versturen mislukt" }, { status: 500 });
    }

    console.log(`✅ APK email verzonden naar ${email} voor job ${apk.job_id}`);

    return NextResponse.json({ 
      success: true, 
      message: `Email verzonden naar ${email}`,
      emailId: emailData?.id 
    });

  } catch (err: any) {
    console.error("❌ APK email error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
