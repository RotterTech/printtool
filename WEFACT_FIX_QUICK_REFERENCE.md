# WeFact API Fix - Quick Implementation Summary

## What Was Fixed

The WeFact API debtor.add endpoint was failing with:
> "Either a company name or a last name must be provided"

**Root Cause**: `CompanyName` field was conditionally omitted if no company name was provided.

## Solution Applied

Updated `app/api/wefact/route.ts` (mode === 'add' section):

### 1. Always Include Required Fields
```typescript
wefactParams = {
  CompanyName: bedrijf.trim() || "",  // ✅ Always present
  SurName: achternaam.trim() || "",   // ✅ Always present
  Sex: "m",                           // ✅ Default
  Country: "NL"                       // ✅ Default
};
```

### 2. Sanitize Initials
```typescript
const firstLetter = voornaam.charAt(0).toUpperCase();
initials = /^[A-Z]$/.test(firstLetter) ? firstLetter + "." : "";
// Now only valid uppercase letters are accepted
```

### 3. Enhanced Logging
```typescript
console.log(`✅ SANITIZED wefactParams (FINAL PAYLOAD):`, JSON.stringify(wefactParams, null, 2));
console.log(`📡 EXACT JSON PAYLOAD TO SEND:`, JSON.stringify(payload, null, 2));
```

You'll now see the exact JSON being sent to WeFact in your terminal.

## Key Changes at a Glance

| Aspect | Before | After |
|--------|--------|-------|
| CompanyName | Conditionally omitted | Always included (empty string if blank) |
| SurName | Conditionally included | Always included (empty string if blank) |
| Sex | Default "m" | Still defaults to "m" |
| Country | Default "NL" | Still defaults to "NL" |
| Initials | Any first character | Only valid uppercase letter + period |
| Logging | Generic logs | Detailed payload visibility |

## Testing the Fix

Once the dev server is running:

```bash
# Test 1: Individual without company
curl -X POST http://localhost:3001/api/wefact \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "add",
    "clientData": {
      "klant": "Janssen",
      "voornaam": "Jan",
      "email": "jan@example.nl"
    }
  }'

# Expected result: ✅ Success with DebtorCode
```

## What to Look for in Console

When you trigger the WeFact creation, you should see:

```
🔍 WeFact Mapping (BEFORE SANITIZATION):
   - bedrijf (CompanyName): ""
   - achternaam (SurName): "Janssen"
   - voornaam (Initials): "Jan" → "J."
   - Contactgegevens: email="jan@example.nl", telefoon="", adres=""

✅ SANITIZED wefactParams (FINAL PAYLOAD):
{
  "CompanyName": "",
  "SurName": "Janssen",
  "Sex": "m",
  "Country": "NL",
  "Initials": "J.",
  "EmailAddress": "jan@example.nl"
}

📡 EXACT JSON PAYLOAD TO SEND:
{
  "api_key": "...",
  "controller": "debtor",
  "action": "add",
  "params": {
    "CompanyName": "",
    "SurName": "Janssen",
    "Sex": "m",
    "Country": "NL",
    "Initials": "J.",
    "EmailAddress": "jan@example.nl"
  }
}
```

This shows that `CompanyName` is now explicitly included (even though empty) and `SurName` is properly set.

## Files Changed

- ✅ `app/api/wefact/route.ts` - Fixed lines 63-131

---

**Status**: Ready for testing ✅

