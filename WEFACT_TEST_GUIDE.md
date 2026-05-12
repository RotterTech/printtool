# WeFact Integration - Final Test Guide

**Status**: ✅ Production Ready  
**Last Updated**: January 29, 2026

---

## 🏗️ Architecture Overview

### Backend Features (`app/api/wefact/route.ts`)
- ✅ **Smart Field Mapper**: Accepts Dutch OR English field names
- ✅ **10-Second Timeout**: AbortController prevents VPS hanging
- ✅ **Detailed Logging**: Full request/response console output
- ✅ **Strict Defaults**: CompanyName/SurName always included in payload
- ✅ **Validation**: Early rejection if both names are empty

### Frontend Features (`components/RepairForm.tsx`)
- ✅ **WeFact-Aligned Form**: Matches official WeFact debtor structure
- ✅ **McDonald's Quick Buttons**: 4 pre-configured repair types
- ✅ **Software/Hardware Grids**: Quick-click issue buttons
- ✅ **Dutch UI Labels**: User-friendly interface

---

## The Three Test Scenarios

### Test 1: Terminal - Direct API Format (English)

Works straight from the terminal with proper WeFact field names:

```bash
curl -s -X POST http://localhost:3001/api/wefact \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "add",
    "clientData": {
      "CompanyName": "PrintTool Test BV",
      "SurName": "Jansen",
      "Initials": "P.",
      "Sex": "m",
      "Address": "Keizersgracht 100",
      "ZipCode": "1015 AA",
      "City": "Amsterdam",
      "Country": "NL",
      "EmailAddress": "test@printtool.nl",
      "PhoneNumber": "0101234567"
    }
  }' | jq .
```

**Expected Success**:
```json
{
  "status": "success",
  "debtor": {
    "Identifier": "123456",
    "DebtorCode": "DB001",
    "CompanyName": "PrintTool Test BV",
    "SurName": "Jansen",
    "Sex": "m",
    "Country": "NL"
  }
}
```

---

### Test 2: Terminal - Form Format (Dutch)

Uses the form field names - backend maps them automatically:

```bash
curl -s -X POST http://localhost:3001/api/wefact \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "add",
    "clientData": {
      "bedrijf": "PrintTool Groep",
      "achternaam": "Visser",
      "voornaam": "P.",
      "geslacht": "f",
      "straat": "Prinsengracht 50",
      "postcode": "1015 SG",
      "plaats": "Amsterdam",
      "email": "petra@printtool.nl",
      "telefoon": "0202468135"
    }
  }' | jq .
```

**Expected Success**:
```json
{
  "status": "success",
  "debtor": {
    "Identifier": "123457",
    "DebtorCode": "DB002",
    "CompanyName": "",
    "SurName": "Visser",
    "Sex": "f",
    "Country": "NL"
  }
}
```

---

### Test 3: UI - Click Quick Button

1. Go to the Inboeken form
2. Fill in customer name (use "Handmatig invullen" if no WeFact match)
3. Navigate to "Klacht & Status" section
4. Click one of the 4 green quick buttons:
   - 🖥️ Windows Herstel
   - 🔋 Accu Vervangen
   - 🛠️ Scherm Reparatie
   - 🧼 Onderhoudsbeurt
5. Verify the description text is appended
6. Submit the repair

**Expected**:
- Quick button text appears in "Omschrijving"
- Professional description is pre-filled
- Rest of form can be filled normally
- Repair saves with proper customer info

---

## What to Look For

### Terminal Output (Backend Logging)

When you run a test, you should see in the terminal:

```
📤 Sending to WeFact: { Sex: "m", CompanyName: "...", SurName: "...", ... }
📥 WeFact Response: { status: "success", debtor: { ... } }
```

### Success Indicators

✅ Status code 200  
✅ Response has `status: "success"`  
✅ Response includes `debtor.DebtorCode`  
✅ Response includes `debtor.Identifier`  

### Error Cases

**Case 1: Missing both names**
```json
{ "message": "Error: CompanyName or SurName is empty in the backend." }
```

**Case 2: WeFact rejects (wrong format)**
```json
{ "message": "Error message from WeFact API" }
```

**Case 3: No API key**
```json
{ "message": "Connection error" }
```

---

## Quick Button Descriptions

| Button | Text Added |
|--------|-----------|
| 🖥️ Windows Herstel | "Windows start niet op / BSOD. Herinstallatie nodig." |
| 🔋 Accu Vervangen | "Accu loopt snel leeg / laadt niet op." |
| 🛠️ Scherm Reparatie | "Scherm defect / barst. Vervangen." |
| 🧼 Onderhoudsbeurt | "Laptop wordt heet en is traag. Intern reinigen." |

**How it works**:
1. Click button → text appends to description field
2. Multiple clicks → text adds multiple times (newline separated)
3. Can edit in textarea if needed

---

## Copy-Paste Test Commands

### Test 1 (Copy directly):
```bash
curl -s -X POST http://localhost:3001/api/wefact -H "Content-Type: application/json" -d '{"mode":"add","clientData":{"CompanyName":"PrintTool Test BV","SurName":"Jansen","Initials":"P.","EmailAddress":"test@printtool.nl"}}' | jq .
```

### Test 2 (Copy directly):
```bash
curl -s -X POST http://localhost:3001/api/wefact -H "Content-Type: application/json" -d '{"mode":"add","clientData":{"bedrijf":"PrintTool Groep","achternaam":"Visser","voornaam":"P.","email":"petra@printtool.nl"}}' | jq .
```

---

## Success Checklist

- [ ] Backend starts without errors
- [ ] Test 1 (English API format) returns success
- [ ] Test 2 (Dutch form format) returns success  
- [ ] Quick buttons appear in green on the form
- [ ] Clicking a button appends text to description
- [ ] Multiple button clicks add multiple lines
- [ ] Form can be submitted after clicking buttons
- [ ] New repairs are saved with customer info

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| 404 on /api/wefact | Restart dev server |
| Field not mapping | Check field name in clientData |
| Button not working | Ensure form section is expanded |
| No terminal output | Check dev server is running |
| WeFact error | Check API key in .env.local |

---

**Ready to test!** 🚀

