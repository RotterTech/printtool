import { NextResponse } from 'next/server';
import { API, fetchWithRetry, mapClientToWeFact } from '@/lib/config';
import { requireAuth } from "@/lib/apiAuth";

// User-friendly error messages (Dutch)
const USER_FRIENDLY_ERRORS: Record<string, string> = {
  "api_key": "WeFact API sleutel is niet geconfigureerd. Ga naar Instellingen om deze in te stellen.",
  "ECONNREFUSED": "Kan geen verbinding maken met WeFact. Controleer je internetverbinding.",
  "timeout": "WeFact reageert niet. Probeer het later opnieuw.",
  "Already exists": "Deze klant bestaat al in WeFact.",
  "EmailAddress": "Het e-mailadres is ongeldig of al in gebruik.",
  "SurName": "Achternaam is verplicht.",
  "CompanyName": "Bedrijfsnaam of achternaam is verplicht.",
};

function getUserFriendlyError(error: string): string {
  for (const [key, message] of Object.entries(USER_FRIENDLY_ERRORS)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }
  return error;
}

// ============================================================================
// 🚀 POST HANDLER
// ============================================================================
export async function POST(request: Request) {
  const WEFACT_URL = API.wefactUrl;

  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const apiKey = process.env.WEFACT_API_KEY;
    if (!apiKey) {
      console.error("❌ WEFACT_API_KEY not configured");
      return NextResponse.json({ 
        success: false,
        code: "NO_API_KEY",
        message: "WeFact API sleutel is niet geconfigureerd. Ga naar Instellingen → Integraties om deze in te stellen.",
        userMessage: "⚙️ WeFact is nog niet ingesteld. Vraag je beheerder om de API sleutel te configureren."
      }, { status: 500 });
    }

    const body = await request.json();
    const { mode, clientData, identifier } = body;

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 INCOMING REQUEST");
    console.log("   Mode:", mode);
    console.log("   Raw clientData:", JSON.stringify(clientData, null, 2));
    if (identifier) console.log("   Identifier:", identifier);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    // ===== MODE: DETAIL (Fetch full debtor details) =====
    if (mode === 'detail') {
      if (!identifier) {
        return NextResponse.json({ message: "No identifier provided for detail mode" }, { status: 400 });
      }
      try {
        const response = await fetchWithRetry(WEFACT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            controller: "debtor",
            action: "show",
            Identifier: identifier
          }),
        });
        const data = await response.json();
        console.log("🔎 DETAIL RESULT:", JSON.stringify(data, null, 2));
        if (data.status === 'error') {
          let errorMessages = "Onbekende WeFact fout";
          if (data.errors) {
            if (Array.isArray(data.errors)) {
              errorMessages = data.errors.join(', ');
            } else if (typeof data.errors === 'object') {
              errorMessages = Object.values(data.errors).join(', ');
            } else {
              errorMessages = String(data.errors);
            }
          }
          return NextResponse.json({
            success: false,
            code: "WEFACT_ERROR",
            message: getUserFriendlyError(errorMessages),
            userMessage: `⚠️ ${getUserFriendlyError(errorMessages)}`,
            wefactStatus: data.status,
            wefactErrors: data.errors
          }, { status: 400 });
        }
        return NextResponse.json({
          ...data,
          success: true,
          code: "DETAIL",
        });
      } catch (fetchError: any) {
        console.error("❌ FETCH ERROR (DETAIL):", fetchError.message);
        return NextResponse.json({
          success: false,
          code: "DETAIL_FETCH_ERROR",
          message: fetchError.message,
        }, { status: 500 });
      }
    }

    // ===== MODE: ADD (Create new debtor) =====
    if (mode === 'add' || mode === 'smart-add') {
      // 🗺️ Smart mapping: accepts Dutch OR English field names
      const params = mapClientToWeFact(clientData);

      console.log("🗺️ MAPPED PARAMS:", JSON.stringify(params, null, 2));

      // 🛑 Validation: WeFact requires CompanyName OR SurName
      if (!params.CompanyName && !params.SurName) {
        console.error("❌ VALIDATION FAILED: Both CompanyName and SurName are empty");
        return NextResponse.json({ 
          message: "Fout: Vul een bedrijfsnaam of achternaam in." 
        }, { status: 400 });
      }

      // ===== SMART DUPLICATE CHECK (for smart-add mode) =====
      if (mode === 'smart-add') {
        console.log("🔍 Smart-add: checking for existing debtors...");
        const matchingDebtors: any[] = [];

        // Search by email (most unique identifier)
        const emailToSearch = params.EmailAddress?.trim();
        if (emailToSearch) {
          try {
            const emailRes = await fetchWithRetry(WEFACT_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ api_key: apiKey, controller: "debtor", action: "list", search: emailToSearch }),
            });
            const emailData = await emailRes.json();
            if (emailData.debtors && Array.isArray(emailData.debtors)) {
              for (const d of emailData.debtors) {
                if (d.EmailAddress?.toLowerCase() === emailToSearch.toLowerCase()) {
                  matchingDebtors.push({ ...d, matchReason: "email" });
                }
              }
            }
          } catch (e) { console.warn("Smart-add email search failed:", e); }
        }

        // Search by phone number
        const phoneToSearch = params.PhoneNumber?.trim()?.replace(/[\s\-\(\)]/g, '');
        if (phoneToSearch && phoneToSearch.length >= 6) {
          try {
            const phoneRes = await fetchWithRetry(WEFACT_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ api_key: apiKey, controller: "debtor", action: "list", search: phoneToSearch }),
            });
            const phoneData = await phoneRes.json();
            if (phoneData.debtors && Array.isArray(phoneData.debtors)) {
              for (const d of phoneData.debtors) {
                const existingPhone = (d.PhoneNumber || d.MobileNumber || "").replace(/[\s\-\(\)]/g, '');
                if (existingPhone && (existingPhone.includes(phoneToSearch) || phoneToSearch.includes(existingPhone))) {
                  // Avoid duplicates from email search
                  if (!matchingDebtors.find(m => m.Identifier === d.Identifier)) {
                    matchingDebtors.push({ ...d, matchReason: "telefoon" });
                  }
                }
              }
            }
          } catch (e) { console.warn("Smart-add phone search failed:", e); }
        }

        // Search by name (surname or company)
        const nameToSearch = params.SurName?.trim() || params.CompanyName?.trim();
        if (nameToSearch && nameToSearch.length >= 2) {
          try {
            const nameRes = await fetchWithRetry(WEFACT_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ api_key: apiKey, controller: "debtor", action: "list", search: nameToSearch }),
            });
            const nameData = await nameRes.json();
            if (nameData.debtors && Array.isArray(nameData.debtors)) {
              for (const d of nameData.debtors) {
                // Check if name matches closely
                const dName = (d.SurName || d.Surname || d.CompanyName || "").toLowerCase();
                const searchLower = nameToSearch.toLowerCase();
                if (dName === searchLower || dName.includes(searchLower) || searchLower.includes(dName)) {
                  if (!matchingDebtors.find(m => m.Identifier === d.Identifier)) {
                    matchingDebtors.push({ ...d, matchReason: "naam" });
                  }
                }
              }
            }
          } catch (e) { console.warn("Smart-add name search failed:", e); }
        }

        // If we found potential matches, return them for user review
        if (matchingDebtors.length > 0) {
          console.log(`🔍 Smart-add: found ${matchingDebtors.length} potential match(es)`);
          return NextResponse.json({
            success: false,
            code: "POTENTIAL_DUPLICATES",
            message: `${matchingDebtors.length} mogelijke bestaande klant(en) gevonden.`,
            userMessage: `⚠️ We vonden ${matchingDebtors.length} mogelijke match(es) in WeFact. Controleer of deze klant al bestaat.`,
            matches: matchingDebtors,
          }, { status: 200 }); // 200 because it's not an error, it's a suggestion
        }

        console.log("🔍 Smart-add: no matches found, proceeding with creation...");
        // No matches → fall through to normal add
      }

      // 📦 Build WeFact payload - Parameters go DIRECTLY in the root, not nested!
      const payload = {
        api_key: apiKey,
        controller: "debtor",
        action: "add",
        ...params  // ← SPREAD directly, not nested in "params"
      };

      console.log("📤 SENDING TO WEFACT:");
      console.log("   URL:", WEFACT_URL);
      console.log("   Timeout:", API.timeoutMs, "ms");
      console.log("   Max Retries:", API.maxRetries);
      console.log("   Payload:", JSON.stringify({ ...payload, api_key: "***HIDDEN***" }, null, 2));

      try {
        // 🚀 Use centralized fetchWithRetry for automatic timeout & retry
        const response = await fetchWithRetry(WEFACT_URL, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload),
        });

        // 📦 Get raw response text first for debugging
        const rawText = await response.text();
        
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📥 WEFACT RAW RESPONSE:");
        console.log("   HTTP Status:", response.status);
        console.log("   Raw Body:", rawText);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        // Parse JSON
        let data: any;
        try {
          data = JSON.parse(rawText);
        } catch (parseErr) {
          console.error("❌ JSON PARSE ERROR: Response is not valid JSON");
          return NextResponse.json({ message: "WeFact returned invalid JSON" }, { status: 502 });
        }

        console.log("📊 PARSED RESPONSE:");
        console.log("   status:", data.status);
        console.log("   errors:", JSON.stringify(data.errors, null, 2));
        console.log("   debtor:", JSON.stringify(data.debtor, null, 2));

        // ===== CRITICAL: Check status key =====
        if (data.status === 'error') {
          console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.error("❌ WEFACT RETURNED STATUS: error");
          console.error("   Errors object:", JSON.stringify(data.errors, null, 2));
          
          // Extract error messages from errors object/array
          let errorMessages = "Onbekende WeFact fout";
          if (data.errors) {
            if (Array.isArray(data.errors)) {
              errorMessages = data.errors.join(', ');
            } else if (typeof data.errors === 'object') {
              errorMessages = Object.values(data.errors).join(', ');
            } else {
              errorMessages = String(data.errors);
            }
          }
          
          console.error("   Extracted message:", errorMessages);
          console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          
          // Check if client already exists (common scenario)
          const isAlreadyExists = errorMessages.toLowerCase().includes('already exists') ||
                                  errorMessages.toLowerCase().includes('bestaat al') ||
                                  errorMessages.toLowerCase().includes('duplicate');
          
          if (isAlreadyExists) {
            return NextResponse.json({ 
              success: false,
              code: "ALREADY_EXISTS",
              message: "Deze klant bestaat al in WeFact.",
              userMessage: "👤 Deze klant staat al in WeFact. Je kunt zoeken om de bestaande klant te selecteren.",
              wefactStatus: data.status,
              wefactErrors: data.errors 
            }, { status: 409 }); // 409 Conflict
          }
          
          return NextResponse.json({ 
            success: false,
            code: "WEFACT_ERROR",
            message: getUserFriendlyError(errorMessages),
            userMessage: `⚠️ ${getUserFriendlyError(errorMessages)}`,
            wefactStatus: data.status,
            wefactErrors: data.errors 
          }, { status: 400 });
        }

        // ===== SUCCESS: status === 'success' =====
        if (data.status === 'success') {
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("✅ WEFACT RETURNED STATUS: success");
          console.log("   DebtorCode:", data.debtor?.DebtorCode);
          console.log("   Identifier:", data.debtor?.Identifier);
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          return NextResponse.json({
            ...data,
            success: true,
            code: "CREATED",
            userMessage: `✅ Klant ${data.debtor?.DebtorCode || ''} succesvol aangemaakt in WeFact!`
          });
        }

        // ===== UNKNOWN STATUS =====
        console.warn("⚠️ UNKNOWN WEFACT STATUS:", data.status);
        return NextResponse.json(data);

      } catch (fetchError: any) {
        console.error("❌ FETCH ERROR:", fetchError.message);
        
        // Check if it's a timeout error from fetchWithRetry
        if (fetchError.message.includes('Timeout')) {
          return NextResponse.json({ 
            success: false,
            code: "TIMEOUT",
            message: "WeFact reageert niet binnen de gestelde tijd.",
            userMessage: "⏱️ WeFact is momenteel traag. Probeer het over een paar minuten opnieuw."
          }, { status: 504 });
        }
        
        // Connection refused
        if (fetchError.message.includes('ECONNREFUSED') || fetchError.message.includes('fetch failed')) {
          return NextResponse.json({ 
            success: false,
            code: "CONNECTION_ERROR",
            message: "Kan geen verbinding maken met WeFact.",
            userMessage: "🔌 Kan geen verbinding maken met WeFact. Controleer je internetverbinding."
          }, { status: 503 });
        }
        
        throw fetchError;
      }
    }

    // ===== MODE: SEARCH (Find debtors) =====
    if (mode === 'search') {
      const searchTerm = body.term || clientData?.searchTerm || clientData?.search || "";
      
      console.log("🔍 SEARCH MODE - Term:", searchTerm);

      try {
        const response = await fetchWithRetry(WEFACT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            controller: "debtor",
            action: "list",
            search: searchTerm
          }),
        });

        const data = await response.json();
        
        console.log("🔍 SEARCH RESULTS:", data.debtors?.length || 0, "found");
        return NextResponse.json(data);

      } catch (fetchError: any) {
        if (fetchError.message.includes('Timeout')) {
          return NextResponse.json({ message: "Search timeout" }, { status: 504 });
        }
        throw fetchError;
      }
    }

    // ===== Unknown mode =====
    console.warn("⚠️ Unknown mode:", mode);
    return NextResponse.json({ message: "Unknown action: " + mode }, { status: 400 });

  } catch (error: any) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ CRITICAL ERROR:", error.message);
    console.error("   Stack:", error.stack);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    return NextResponse.json({ message: error.message || "Server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
