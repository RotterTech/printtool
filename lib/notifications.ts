import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// Template variable replacement
// ============================================================

interface RepairData {
  job_id?: string;
  status_token?: string;
  customer_name?: string;
  first_name?: string;
  last_name?: string;
  customer_email?: string;
  customer_phone?: string;
  device_brand?: string;
  device_model?: string;
  device_type?: string;
  problem_description?: string;
  onderdeel_naam?: string;
  kosten?: number | string | null;
  agreed_price?: number | string | null;
  status?: string;
  [key: string]: any;
}

function replaceTemplateVars(
  template: string,
  repair: RepairData,
  companyName: string,
  channel: "email" | "whatsapp" = "email"
): string {
  const name =
    repair.customer_name ||
    `${repair.first_name || ""} ${repair.last_name || ""}`.trim() ||
    "Klant";

  const apparaat = [repair.device_brand, repair.device_model]
    .filter(Boolean)
    .join(" ") || "apparaat";

  // Multi-part support: onderdeel_naam may be a JSON array of parts
  let onderdeelDisplay = repair.onderdeel_naam || "";
  try {
    const parsed = JSON.parse(repair.onderdeel_naam || "");
    if (Array.isArray(parsed)) {
      onderdeelDisplay = parsed.map((p: any) => p.naam).filter(Boolean).join(", ");
    }
  } catch {}

  const kosten =
    repair.kosten != null && repair.kosten !== ""
      ? `€${Number(repair.kosten).toFixed(2)}`
      : repair.agreed_price != null && repair.agreed_price !== ""
        ? `€${Number(repair.agreed_price).toFixed(2)}`
        : "n.v.t.";

  const statusLinkUrl = repair.status_token
    ? `https://pc-picker.nl/status/${repair.status_token}`
    : repair.job_id
      ? `https://pc-picker.nl/status/${repair.job_id}`
      : "";

  // For email: render as styled button. For WhatsApp: plain URL
  const statusLinkOutput = channel === "email" && statusLinkUrl
    ? `<div style="text-align:center;margin:20px 0"><a href="${statusLinkUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:bold;box-shadow:0 4px 14px rgba(37,99,235,0.3)">📍 Status volgen</a><br><span style="font-size:12px;color:#9ca3af">${statusLinkUrl}</span></div>`
    : statusLinkUrl;

  return template
    .replace(/{klant_naam}/g, name)
    .replace(/{apparaat}/g, apparaat)
    .replace(/{job_id}/g, repair.job_id || "")
    .replace(/{probleem}/g, repair.problem_description || "")
    .replace(/{onderdeel}/g, onderdeelDisplay)
    .replace(/{kosten}/g, kosten)
    .replace(/{bedrijf_naam}/g, companyName)
    .replace(/{status}/g, repair.status || "")
    .replace(/{status_link}/g, statusLinkOutput);
}

// ============================================================
// Email via Resend — professional HTML matching receipt design
// ============================================================

// Status → progress step mapping
const STATUS_STEP: Record<string, number> = {
  "Nieuw": 1,
  "Besteld": 2,
  "In reparatie": 3,
  "Reparatie klaar": 4,
  "Afgehaald": 5,
  "Geannuleerd": 0,
};

const STATUS_EMOJI: Record<string, string> = {
  "Nieuw": "📥",
  "Besteld": "📦",
  "In reparatie": "🔧",
  "Reparatie klaar": "✅",
  "Afgehaald": "🏠",
  "Geannuleerd": "❌",
};

const STATUS_LABEL: Record<string, string> = {
  "Nieuw": "Reparatie ontvangen",
  "Besteld": "Onderdeel besteld",
  "In reparatie": "In reparatie",
  "Reparatie klaar": "Klaar voor afhalen",
  "Afgehaald": "Afgehaald",
  "Geannuleerd": "Geannuleerd",
};

function buildNotificationEmailHtml(
  messageBody: string,
  senderName: string,
  repair: RepairData,
  triggerStatus: string
): string {
  const jobId = repair.job_id || "";
  const statusId = repair.status_token || jobId;
  const statusUrl = statusId ? `https://pc-picker.nl/status/${statusId}` : "";
  const activeStep = STATUS_STEP[triggerStatus] || 1;
  const emoji = STATUS_EMOJI[triggerStatus] || "📋";
  const statusLabel = STATUS_LABEL[triggerStatus] || triggerStatus;

  const naam = repair.customer_name ||
    `${repair.first_name || ""} ${repair.last_name || ""}`.trim() || "Klant";
  const apparaat = [repair.device_brand, repair.device_model].filter(Boolean).join(" ") || "—";
  const datumIn = repair.datum_in || repair.created_at;
  const formattedDate = datumIn
    ? new Date(datumIn).toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" })
    : "—";

  const kosten = repair.kosten != null && repair.kosten !== ""
    ? `€${Number(repair.kosten).toFixed(2)}`
    : repair.agreed_price != null && repair.agreed_price !== ""
      ? `€${Number(repair.agreed_price).toFixed(2)}`
      : null;

  let onderdeelDisplay = repair.onderdeel_naam || "";
  try {
    const parsed = JSON.parse(repair.onderdeel_naam || "");
    if (Array.isArray(parsed)) {
      onderdeelDisplay = parsed.map((p: any) => p.naam).filter(Boolean).join(", ");
    }
  } catch {}

  // Build progress bar
  const allSteps = [
    { step: 1, label: "Ontvangen" },
    { step: 2, label: "Onderdeel besteld" },
    { step: 3, label: "In reparatie" },
    { step: 4, label: "Klaar" },
    { step: 5, label: "Afgehaald" },
  ];

  // Show Besteld step only when relevant
  const showBesteld = triggerStatus === "Besteld" || !!onderdeelDisplay;
  const steps = showBesteld ? allSteps : allSteps.filter((s) => s.step !== 2);
  // Remap activeStep when Besteld is hidden
  const displayStep = showBesteld ? activeStep : (
    triggerStatus === "In reparatie" ? 2 : triggerStatus === "Reparatie klaar" ? 3 : triggerStatus === "Afgehaald" ? 4 : activeStep
  );

  const progressBar = activeStep > 0 ? `
    <table style="width:100%;border-collapse:collapse;margin:20px 0" cellpadding="0" cellspacing="0">
      <tr>
        ${steps.map((s, i) => {
          const stepNum = showBesteld ? s.step : i + 1;
          const filled = showBesteld ? s.step <= activeStep : stepNum <= displayStep;
          return `
          <td style="text-align:center;width:${Math.round(100 / steps.length)}%;padding:0 4px">
            <div style="width:36px;height:36px;border-radius:50%;background:${filled ? "#22c55e" : "#e5e7eb"};color:${filled ? "white" : "#9ca3af"};display:inline-block;line-height:36px;font-size:14px;font-weight:bold">${filled ? "✓" : stepNum}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px">${s.label}</div>
          </td>
        `}).join("")}
      </tr>
    </table>
  ` : "";

  // Build info rows
  const infoRows: string[] = [];
  infoRows.push(`<tr><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;width:38%;font-size:13px">👤 Klant</td><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b">${naam}</td></tr>`);
  infoRows.push(`<tr><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;width:38%;font-size:13px">💻 Apparaat</td><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b">${apparaat}</td></tr>`);
  if (repair.problem_description) {
    infoRows.push(`<tr><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;width:38%;font-size:13px">🔍 Klacht</td><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b">${repair.problem_description}</td></tr>`);
  }
  if (onderdeelDisplay) {
    infoRows.push(`<tr><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;width:38%;font-size:13px">🔩 Onderdeel</td><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b">${onderdeelDisplay}</td></tr>`);
  }
  if (kosten) {
    infoRows.push(`<tr><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;width:38%;font-size:13px">💰 Kosten</td><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b">${kosten}</td></tr>`);
  }
  infoRows.push(`<tr><td style="padding:12px 16px;color:#64748b;width:38%;font-size:13px">📅 Innamedatum</td><td style="padding:12px 16px;font-weight:600;color:#1e293b">${formattedDate}</td></tr>`);

  const messageHtml = messageBody.replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:20px">
    <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      <!-- Header -->
      <div style="background:linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);color:white;padding:28px 20px;text-align:center;border-radius:12px 12px 0 0">
        <h1 style="margin:0;font-size:26px;font-weight:800;letter-spacing:0.5px">${senderName}</h1>
      </div>

      <div style="padding:28px 24px">
        <!-- Status icon + title -->
        <div style="text-align:center;margin-bottom:20px">
          <span style="font-size:40px">${emoji}</span>
          <h2 style="color:#1e293b;margin:8px 0 0;font-size:22px;font-weight:700">${statusLabel}</h2>
        </div>

        <!-- Reference number -->
        ${jobId ? `
        <div style="background:linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin-bottom:20px;text-align:center">
          <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600">Referentienummer</p>
          <p style="margin:6px 0 0;font-family:'Courier New',monospace;font-size:28px;font-weight:800;color:#1e40af;letter-spacing:2px">${jobId}</p>
        </div>
        ` : ""}

        <!-- Progress bar -->
        ${progressBar}

        <!-- Custom message -->
        <div style="font-size:15px;color:#475569;line-height:1.7;margin-bottom:20px">
          ${messageHtml}
        </div>

        <!-- Repair details card -->
        <div style="background:#f8fafc;border-radius:12px;overflow:hidden;margin-bottom:16px">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            ${infoRows.join("")}
          </table>
        </div>

        ${triggerStatus === "Reparatie klaar" ? `
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px;margin:20px 0;text-align:center">
          <p style="margin:0;font-size:24px">📍</p>
          <p style="margin:8px 0 0;font-size:15px;color:#166534;font-weight:700">Klaar om op te halen!</p>
          <p style="margin:4px 0 0;font-size:13px;color:#15803d">Kom langs tijdens openingstijden.</p>
        </div>
        ` : ""}

        ${triggerStatus === "Besteld" && onderdeelDisplay ? `
        <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:12px;padding:16px;margin:20px 0;text-align:center">
          <p style="margin:0;font-size:14px;color:#9a3412;font-weight:600">📦 Besteld onderdeel: <strong>${onderdeelDisplay}</strong></p>
          <p style="margin:6px 0 0;font-size:13px;color:#c2410c">Zodra het onderdeel binnen is, gaan we direct verder.</p>
        </div>
        ` : ""}

        <!-- Status button -->
        ${statusUrl ? `
        <div style="text-align:center;margin:24px 0">
          <a href="${statusUrl}" style="display:inline-block;background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:bold;box-shadow:0 4px 14px rgba(37,99,235,0.3)">📍 Status volgen</a>
          <p style="margin:8px 0 0;font-size:12px;color:#9ca3af">of ga naar: ${statusUrl}</p>
        </div>
        ` : ""}
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px">
        <p style="margin:0;font-size:12px;color:#94a3b8">${senderName}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1">© ${new Date().getFullYear()} ${senderName}. Alle rechten voorbehouden.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(
  to: string,
  subject: string,
  body: string,
  senderName: string,
  senderEmail?: string,
  repair?: RepairData,
  triggerStatus?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY niet geconfigureerd" };

  try {
    const resend = new Resend(apiKey);
    const fromAddress = senderEmail
      ? `${senderName} <${senderEmail}>`
      : `${senderName} <onboarding@resend.dev>`;

    // Use full professional template when repair data is available
    const html = repair && triggerStatus
      ? buildNotificationEmailHtml(body, senderName, repair, triggerStatus)
      : `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:20px"><div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)"><div style="background:linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);color:white;padding:28px 20px;text-align:center"><h1 style="margin:0;font-size:26px;font-weight:800">${senderName}</h1></div><div style="padding:28px 24px;font-size:15px;color:#334155;line-height:1.7">${body.replace(/\n/g, "<br>")}</div><div style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0"><p style="margin:0;font-size:12px;color:#94a3b8">${senderName}</p></div></div></div></body></html>`;

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject,
      html,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// WhatsApp via Meta Cloud API
// ============================================================

async function sendWhatsApp(
  to: string,
  body: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: "WhatsApp niet geconfigureerd" };
  }

  // Format phone number: remove +, spaces, dashes
  const formattedNumber = to.replace(/[\s\-\+\(\)]/g, "");

  try {
    // First, try sending as a text message (only works within 24h window)
    // For initial contact, use the hello_world template
    const res = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedNumber,
          type: "text",
          text: { body },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      // If text fails (outside 24h window), try template
      if (data.error?.code === 131047 || data.error?.code === 131026) {
        // Use hello_world template as fallback
        const templateRes = await fetch(
          `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: formattedNumber,
              type: "template",
              template: {
                name: "hello_world",
                language: { code: "en_US" },
              },
            }),
          }
        );
        const templateData = await templateRes.json();
        if (!templateRes.ok) {
          return {
            success: false,
            error: templateData.error?.message || "WhatsApp template fout",
          };
        }
        return {
          success: true,
          id: templateData.messages?.[0]?.id,
        };
      }

      return {
        success: false,
        error: data.error?.message || "WhatsApp fout",
      };
    }

    return { success: true, id: data.messages?.[0]?.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// Main: Send notification for a repair status change
// ============================================================

export async function sendNotification(
  companyId: string | null,
  repair: RepairData,
  triggerStatus: string
): Promise<{
  email?: { success: boolean; error?: string };
  whatsapp?: { success: boolean; error?: string };
}> {
  const results: {
    email?: { success: boolean; error?: string };
    whatsapp?: { success: boolean; error?: string };
  } = {};

  // Helper: query with company_id (supports null)
  const companyFilter = (query: any) =>
    companyId ? query.eq("company_id", companyId) : query.is("company_id", null);

  // 1. Get company settings
  const { data: settings } = await companyFilter(
    supabase.from("notification_settings").select("*")
  ).maybeSingle();

  const emailGlobal = settings?.email_enabled ?? true;
  const whatsappGlobal = settings?.whatsapp_enabled ?? true;
  const senderName = settings?.sender_name || "De Digitale Klusjesman";
  const senderEmail = settings?.sender_email || undefined;

  // 2. Get company name
  let companyName = senderName;
  if (companyId) {
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .maybeSingle();
    companyName = company?.name || senderName;
  }

  // 3. Get template for this trigger (try company-specific first, fallback to global)
  let { data: template } = await companyFilter(
    supabase.from("notification_templates").select("*")
  ).eq("trigger_status", triggerStatus).maybeSingle();

  // Fallback: if company-specific not found, try global (null) templates
  if (!template && companyId) {
    const { data: globalTemplate } = await supabase
      .from("notification_templates")
      .select("*")
      .is("company_id", null)
      .eq("trigger_status", triggerStatus)
      .maybeSingle();
    template = globalTemplate;
  }

  if (!template) {
    console.log(`⚠️ No notification template for status "${triggerStatus}"`);
    return results;
  }

  // 4. Send email if enabled and customer has email
  if (emailGlobal && template.email_enabled && repair.customer_email) {
    const subject = replaceTemplateVars(template.email_subject, repair, companyName, "email");
    const body = replaceTemplateVars(template.email_body, repair, companyName, "email");

    const emailResult = await sendEmail(
      repair.customer_email,
      subject,
      body,
      senderName,
      senderEmail,
      repair,
      triggerStatus
    );
    results.email = emailResult;

    // Log
    await supabase.from("notification_log").insert({
      company_id: companyId || null,
      repair_id: repair.id || null,
      channel: "email",
      recipient: repair.customer_email,
      trigger_status: triggerStatus,
      subject,
      body,
      status: emailResult.success ? "sent" : "failed",
      error_message: emailResult.error || null,
      external_id: emailResult.id || null,
    });
  }

  // 5. Send WhatsApp if enabled and customer has phone
  if (whatsappGlobal && template.whatsapp_enabled && repair.customer_phone) {
    const body = replaceTemplateVars(template.whatsapp_body, repair, companyName, "whatsapp");
    const waResult = await sendWhatsApp(repair.customer_phone, body);
    results.whatsapp = waResult;

    // Log
    await supabase.from("notification_log").insert({
      company_id: companyId || null,
      repair_id: repair.id || null,
      channel: "whatsapp",
      recipient: repair.customer_phone,
      trigger_status: triggerStatus,
      subject: null,
      body,
      status: waResult.success ? "sent" : "failed",
      error_message: waResult.error || null,
      external_id: waResult.id || null,
    });
  }

  return results;
}

// ============================================================
// Test: Send a test message to a specific address
// ============================================================

export async function sendTestNotification(
  channel: "email" | "whatsapp",
  recipient: string,
  companyName: string
): Promise<{ success: boolean; error?: string }> {
  if (channel === "email") {
    return sendEmail(
      recipient,
      `Test notificatie - ${companyName}`,
      `Dit is een test email van ${companyName}.\n\nAls je dit ontvangt, werken de email notificaties correct! ✅`,
      companyName
    );
  } else {
    return sendWhatsApp(
      recipient,
      `Dit is een test van ${companyName}. ✅\n\nAls je dit ontvangt, werken de WhatsApp notificaties!`
    );
  }
}
