import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { requireAuth } from "@/lib/apiAuth";
import { COMPANY } from "@/lib/config";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RECEIPT_TYPES = ["innamebon", "afhaalbon", "offertebon", "werkbon", "garantiekaart"] as const;
type ReceiptType = typeof RECEIPT_TYPES[number];

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });
}

function formatCurrency(v: string | number | null | undefined) {
  if (!v) return "—";
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(num);
}

function getCustomerName(r: any) {
  const first = r.first_name || r.voornaam || "";
  const last = r.last_name || "";
  return (first || last) ? `${first} ${last}`.trim() : r.customer_name || r.klant || "Klant";
}

// Status progress bar for email (matches StatusClient.tsx design)
function buildProgressBar(activeStep: number) {
  const steps = [
    { step: 1, label: "Ontvangen", icon: "📥" },
    { step: 2, label: "In reparatie", icon: "🔧" },
    { step: 3, label: "Klaar", icon: "✅" },
    { step: 4, label: "Afgehaald", icon: "🏠" },
  ];

  return `
    <table style="width:100%;border-collapse:collapse;margin:20px 0" cellpadding="0" cellspacing="0">
      <tr>
        ${steps.map((s) => `
          <td style="text-align:center;width:25%;padding:0 4px">
            <div style="
              width:36px;height:36px;border-radius:50%;
              background:${s.step <= activeStep ? "#22c55e" : "#e5e7eb"};
              color:${s.step <= activeStep ? "white" : "#9ca3af"};
              display:inline-block;line-height:36px;
              font-size:14px;font-weight:bold;
            ">${s.step <= activeStep ? "✓" : s.step}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px">${s.label}</div>
          </td>
        `).join("")}
      </tr>
      <tr>
        <td colspan="4" style="padding:0 20px">
          <div style="display:flex;margin-top:-20px;margin-bottom:8px">
            ${steps.slice(0, -1).map((s) => `
              <div style="flex:1;height:3px;background:${s.step < activeStep ? "#22c55e" : "#e5e7eb"};margin:0 2px"></div>
            `).join("")}
          </div>
        </td>
      </tr>
    </table>
  `;
}

// Status link button matching StatusClient design
function buildStatusButton(statusId: string) {
  const statusUrl = `https://pc-picker.nl/status/${statusId}`;
  return `
    <div style="text-align:center;margin:24px 0">
      <a href="${statusUrl}" style="
        display:inline-block;
        background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color:white;
        text-decoration:none;
        padding:14px 32px;
        border-radius:12px;
        font-size:15px;
        font-weight:bold;
        box-shadow:0 4px 14px rgba(37,99,235,0.3);
      ">📍 Status volgen</a>
      <p style="margin:8px 0 0;font-size:12px;color:#9ca3af">of ga naar: ${statusUrl}</p>
    </div>
  `;
}

function buildReceiptHtml(type: ReceiptType, repair: any): { subject: string; html: string } {
  const jobId = repair.job_id || repair.jobid || repair.id || "—";
  const naam = getCustomerName(repair);
  const merk = repair.device_brand || "";
  const model = repair.device_model || "";
  const klacht = repair.problem_description || "";
  const prijs = formatCurrency(repair.agreed_price || repair.kosten);
  const datumIn = formatDate(repair.datum_in || repair.created_at);
  const datumUit = formatDate(repair.datum_uit);
  const statusId = repair.status_token || jobId;

  const header = `
    <div style="background:linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);color:white;padding:28px 20px;text-align:center;border-radius:12px 12px 0 0">
      <h1 style="margin:0;font-size:26px;font-weight:800;letter-spacing:0.5px">${COMPANY.name}</h1>
      <p style="margin:6px 0 0;opacity:0.85;font-size:13px">${COMPANY.tagline || ""}</p>
      <p style="margin:4px 0 0;opacity:0.75;font-size:12px">${COMPANY.phone} · ${COMPANY.email}</p>
    </div>
  `;

  const footer = `
    <div style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px">
      <p style="margin:0;font-size:12px;color:#94a3b8">${COMPANY.name} · ${COMPANY.website || "ddkm.nl"}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1">© ${new Date().getFullYear()} ${COMPANY.name}. Alle rechten voorbehouden.</p>
    </div>
  `;

  const wrap = (title: string, emoji: string, body: string, showProgressBar = false, progressStep = 1) => `
    <!DOCTYPE html>
    <html lang="nl">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
      <div style="max-width:560px;margin:0 auto;padding:20px">
        <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
          ${header}
          <div style="padding:28px 24px">
            <!-- Title -->
            <div style="text-align:center;margin-bottom:20px">
              <span style="font-size:40px">${emoji}</span>
              <h2 style="color:#1e293b;margin:8px 0 0;font-size:22px;font-weight:700">${title}</h2>
            </div>

            <!-- Reference box -->
            <div style="background:linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin-bottom:20px;text-align:center">
              <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600">Referentienummer</p>
              <p style="margin:6px 0 0;font-family:'Courier New',monospace;font-size:28px;font-weight:800;color:#1e40af;letter-spacing:2px">${jobId}</p>
            </div>

            ${showProgressBar ? buildProgressBar(progressStep) : ""}

            ${body}

            ${buildStatusButton(statusId)}
          </div>
          ${footer}
        </div>
      </div>
    </body>
    </html>
  `;

  const infoCard = (rows: [string, string][]) => `
    <div style="background:#f8fafc;border-radius:12px;overflow:hidden;margin-bottom:16px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${rows.map(([label, value], i) => `
          <tr>
            <td style="padding:12px 16px;${i < rows.length - 1 ? "border-bottom:1px solid #e2e8f0;" : ""}color:#64748b;width:38%;font-size:13px">${label}</td>
            <td style="padding:12px 16px;${i < rows.length - 1 ? "border-bottom:1px solid #e2e8f0;" : ""}font-weight:600;color:#1e293b">${value}</td>
          </tr>
        `).join("")}
      </table>
    </div>
  `;

  switch (type) {
    case "innamebon":
      return {
        subject: `Innamebon ${jobId} — ${COMPANY.name}`,
        html: wrap("Innamebon", "🧾", `
          <p style="color:#475569;margin-bottom:20px;font-size:15px;line-height:1.6">Beste <strong>${naam}</strong>, uw apparaat is in goede orde ontvangen. Hierbij uw innamebon.</p>
          ${infoCard([
            ["👤 Klant", naam],
            ["💻 Apparaat", `${merk} ${model}`],
            ["🔍 Klacht", klacht || "—"],
            ["💰 Prijsafspraak", prijs],
            ["📅 Innamedatum", datumIn],
          ])}
          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-top:20px">
            <p style="margin:0;font-size:13px;color:#854d0e;line-height:1.5">
              <strong>📋 Voorwaarden</strong><br>
              • Maximale opslagtermijn: 90 dagen na gereedmelding<br>
              • Garantie op reparatie: 90 dagen<br>
              • ${COMPANY.name} is niet aansprakelijk voor dataverlies
            </p>
          </div>
        `, true, 1),
      };

    case "afhaalbon":
      return {
        subject: `Afhaalbon ${jobId} — ${COMPANY.name}`,
        html: wrap("Afhaalbon", "📋", `
          <p style="color:#475569;margin-bottom:20px;font-size:15px;line-height:1.6">Beste <strong>${naam}</strong>, bedankt voor het ophalen van uw apparaat!</p>
          ${infoCard([
            ["👤 Klant", naam],
            ["💻 Apparaat", `${merk} ${model}`],
            ["📅 Innamedatum", datumIn],
            ["📅 Afhaaldatum", datumUit],
            ["💰 Kosten", prijs],
          ])}
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px;margin-top:20px;text-align:center">
            <p style="margin:0;font-size:24px">🛡️</p>
            <p style="margin:8px 0 0;font-size:15px;color:#166534;font-weight:700">90 dagen garantie</p>
            <p style="margin:4px 0 0;font-size:13px;color:#15803d">op de uitgevoerde reparatie. Bewaar deze bon als bewijs.</p>
          </div>
        `, true, 4),
      };

    case "offertebon":
      return {
        subject: `Offerte ${jobId} — ${COMPANY.name}`,
        html: wrap("Offerte", "💰", `
          <p style="color:#475569;margin-bottom:20px;font-size:15px;line-height:1.6">Beste <strong>${naam}</strong>, hierbij uw offerte voor de reparatie.</p>
          ${infoCard([
            ["💻 Apparaat", `${merk} ${model}`],
            ["🔍 Diagnose", klacht || "—"],
            ["💰 Geschatte kosten", `<span style="font-size:18px;color:#1e40af;font-weight:800">${prijs}</span>`],
            ["📅 Geldig tot", formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString())],
          ])}
          <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:12px;padding:16px;margin-top:20px;text-align:center">
            <p style="margin:0;font-size:14px;color:#1e40af;font-weight:600">Akkoord geven?</p>
            <p style="margin:6px 0 0;font-size:13px;color:#3b82f6">Reageer op deze e-mail of bel <strong>${COMPANY.phone}</strong></p>
          </div>
        `),
      };

    case "werkbon":
      return {
        subject: `Werkbon ${jobId} — ${COMPANY.name}`,
        html: wrap("Werkbon", "🔧", `
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px;margin-bottom:16px;text-align:center">
            <p style="margin:0;font-size:12px;color:#92400e;font-weight:600">⚠️ INTERN DOCUMENT — Niet voor klant</p>
          </div>
          ${infoCard([
            ["👤 Klant", naam],
            ["📱 Telefoon", repair.customer_phone || "—"],
            ["💻 Apparaat", `${merk} ${model}`],
            ["🔑 Wachtwoord", repair.device_password || "—"],
            ["🔍 Klacht", klacht || "—"],
            ["💰 Prijsafspraak", prijs],
            ["🔩 Onderdeel", repair.onderdeel_naam || "—"],
          ])}
        `, true, 2),
      };

    case "garantiekaart":
      const garantieEind = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      return {
        subject: `Garantiekaart ${jobId} — ${COMPANY.name}`,
        html: wrap("Garantiekaart", "🛡️", `
          <div style="text-align:center;padding:24px;background:linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);border-radius:12px;margin-bottom:20px">
            <p style="margin:0;font-size:42px;font-weight:900;color:#065f46">90 DAGEN</p>
            <p style="margin:4px 0 0;font-size:16px;color:#047857;font-weight:700;letter-spacing:2px">GARANTIE</p>
          </div>
          ${infoCard([
            ["👤 Klant", naam],
            ["💻 Apparaat", `${merk} ${model}`],
            ["🔧 Reparatie", klacht || "—"],
            ["📅 Garantie tot", `<strong style="color:#059669">${formatDate(garantieEind.toISOString())}</strong>`],
          ])}
          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-top:20px">
            <p style="margin:0;font-size:13px;color:#854d0e;line-height:1.6">
              <strong>📋 Garantievoorwaarden</strong><br>
              • Geldt uitsluitend voor de uitgevoerde reparatie<br>
              • Waterschade, valschade of verkeerd gebruik uitgesloten<br>
              • Reparatie door derden maakt garantie ongeldig
            </p>
          </div>
        `, true, 4),
      };
  }
}

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await req.json();
    const { repairId, receiptType } = body;

    if (!repairId || !receiptType) {
      return NextResponse.json({ error: "repairId en receiptType zijn verplicht" }, { status: 400 });
    }

    if (!RECEIPT_TYPES.includes(receiptType)) {
      return NextResponse.json({ error: `Ongeldig type: ${receiptType}` }, { status: 400 });
    }

    // Get repair
    const { data: repair, error: repairError } = await supabase
      .from("repairs")
      .select("*")
      .eq("id", repairId)
      .maybeSingle();

    if (repairError || !repair) {
      return NextResponse.json({ error: "Reparatie niet gevonden" }, { status: 404 });
    }

    const customerEmail = repair.customer_email || repair.email;
    if (!customerEmail) {
      return NextResponse.json({ error: "Geen e-mailadres beschikbaar" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY niet geconfigureerd" }, { status: 500 });
    }

    const { subject, html } = buildReceiptHtml(receiptType as ReceiptType, repair);

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: `${COMPANY.name} <onboarding@resend.dev>`,
      to: [customerEmail],
      subject,
      html,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id, sentTo: customerEmail });
  } catch (e: any) {
    console.error("❌ Receipt email error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
