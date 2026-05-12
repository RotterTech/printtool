# WeFact Form Expansion - Implementation Complete

**Date**: January 29, 2026  
**Status**: ✅ COMPLETE

---

## Overview

Expanded the client registration form in the inboeken/page.tsx flow to match the full WeFact debtor API structure (v2). The form now captures all relevant business and personal data for accurate debtor creation in WeFact.

---

## Changes Made

### 1. **app/inboeken/page.tsx**

#### 1a. Updated FormData Type
Added new fields to match WeFact debtor structure:

```typescript
type FormData = {
  // Client Details (WeFact Integration)
  bedrijf: string;           // CompanyName
  voornaam: string;          // Initials
  klant: string;             // SurName (required)
  achternaam: string;        // Additional surname field
  kvk: string;               // CompanyNumber
  btw: string;               // TaxNumber
  geslacht: string;          // Sex (default: 'm')
  straat: string;            // Address
  postcode: string;          // ZipCode
  plaats: string;            // City
  
  // ... rest of repair fields
};
```

#### 1b. Updated getInitialFormData()
Now maps WeFact response data to all form fields:

```typescript
return {
  bedrijf: selectedClient.CompanyName || "",
  voornaam: selectedClient.FirstName || selectedClient.Initials || "",
  achternaam: selectedClient.Surname || selectedClient.SurName || "",
  kvk: (selectedClient as any).CompanyNumber || "",
  btw: (selectedClient as any).TaxNumber || "",
  geslacht: (selectedClient as any).Sex || "m",
  straat: selectedClient.Address || "",
  postcode: selectedClient.ZipCode || "",
  plaats: selectedClient.City || "",
  // ... contact fields
};
```

#### 1c. Updated handleSubmit() - clientData Mapping
Now sends all fields to WeFact API:

```typescript
const clientData = {
  // WeFact API fields
  CompanyName: repairFormData.bedrijf || "",
  kvk: repairFormData.kvk || "",
  btw: repairFormData.btw || "",
  voornaam: repairFormData.voornaam || "",
  SurName: repairFormData.klant,
  achternaam: repairFormData.achternaam || "",
  geslacht: repairFormData.geslacht || "m",
  straat: repairFormData.straat || "",
  postcode: repairFormData.postcode || "",
  plaats: repairFormData.plaats || "",
  email: repairFormData.email,
  telefoon: repairFormData.telefoon,
  
  // Legacy fields (for backward compatibility)
  bedrijf: repairFormData.bedrijf || "",
  klant: repairFormData.klant,
  adres: repairFormData.adres,
  woonplaats: repairFormData.woonplaats,
  klantnummer: "",
};
```

---

### 2. **components/RepairForm.tsx**

#### 2a. Updated FormData Type
Same additions as inboeken/page.tsx to maintain consistency.

#### 2b. Updated State Initialization
Initializes all new fields from incoming data:

```typescript
const [formData, setFormData] = useState<FormData>({
  bedrijf: initialData?.bedrijf || "",
  voornaam: initialData?.voornaam || "",
  klant: initialData?.klant || "",
  achternaam: initialData?.achternaam || "",
  kvk: initialData?.kvk || "",
  btw: initialData?.btw || "",
  geslacht: initialData?.geslacht || "m",
  straat: initialData?.straat || "",
  postcode: initialData?.postcode || "",
  plaats: initialData?.plaats || "",
  // ... rest of fields
});
```

#### 2c. Updated Customer Field Tracking
Extended the customerFields array to detect edits on all new fields:

```typescript
const customerFields = [
  'bedrijf', 'voornaam', 'klant', 'achternaam', 'kvk', 'btw', 
  'geslacht', 'straat', 'postcode', 'plaats', 'email', 'telefoon', 
  'adres', 'woonplaats'
];
```

#### 2d. Expanded Customer Section UI
Replaced the basic customer section with a comprehensive 4-row grid layout:

**Row 1: Bedrijfsgegevens (3 columns)**
- 🏢 Bedrijfsnaam (CompanyName)
- 📋 KvK Nummer
- 🆔 BTW Nummer

**Row 2: Contactpersoon Gegevens (4 columns)**
- 👥 Geslacht (Select: m/f/d)
- Voornaam (Initials)
- Achternaam (SurName) - Required
- Achternaam (extra)

**Row 3: Contactgegevens (2 columns)**
- 📧 Email (EmailAddress)
- ☎️ Telefoon (PhoneNumber)

**Row 4: Adresgegevens (3 columns)**
- 🏠 Straat (Address)
- 📮 Postcode (ZipCode)
- 🏘️ Plaats (City)

**Legacy Fields (Optional Collapsible)**
- Adres (legacy)
- Woonplaats (legacy)
- Klantnummer (legacy)

---

## Form Structure

```
┌─────────────────────────────────────────────────────────────┐
│ SECTION 1: KLANTGEGEVENS (Client Details)                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Row 1: Bedrijfsgegevens (3 columns - 100% width)           │
│  ┌──────────────────┬──────────────────┬──────────────────┐  │
│  │ Bedrijfsnaam     │ KvK Nummer       │ BTW Nummer       │  │
│  │ (CompanyName)    │ (CompanyNumber)  │ (TaxNumber)      │  │
│  └──────────────────┴──────────────────┴──────────────────┘  │
│                                                               │
│  Row 2: Contactpersoon (4 columns - responsive)             │
│  ┌──────────────┬──────────────┬──────────────┬────────────┐ │
│  │ Geslacht     │ Voornaam     │ Achternaam * │ Achternaam │ │
│  │ (Select m/f) │ (Initials)   │ (SurName)    │ (extra)    │ │
│  └──────────────┴──────────────┴──────────────┴────────────┘ │
│                                                               │
│  Row 3: Contactgegevens (2 columns - responsive)            │
│  ┌─────────────────────────────────┬──────────────────────┐  │
│  │ Email (EmailAddress)            │ Telefoon (PhoneNr)  │  │
│  └─────────────────────────────────┴──────────────────────┘  │
│                                                               │
│  Row 4: Adresgegevens (3 columns - responsive)              │
│  ┌──────────────────┬──────────────────┬──────────────────┐  │
│  │ Straat (Address) │ Postcode (ZipCode)│ Plaats (City)  │  │
│  └──────────────────┴──────────────────┴──────────────────┘  │
│                                                               │
│  ☐ Toon verouderde adresvelden (optional checkbox)          │
│    - Adres (legacy)                                          │
│    - Woonplaats (legacy)                                     │
│    - Klantnummer (legacy)                                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. **WeFact Selection** (selectedClient has data)
```
selectedClient (from WeFact) 
  ↓
getInitialFormData() maps fields
  ↓
RepairForm receives initialData
  ↓
Form displays pre-filled values
  ↓
User edits and submits
```

### 2. **Manual Mode** (no selectedClient)
```
User enters all fields manually
  ↓
Form validation triggers
  ↓
handleSubmit() collects clientData
  ↓
POST /api/wefact with clientData
  ↓
WeFact creates debtor with all fields
  ↓
Response captured and used
```

---

## WeFact Field Mapping

| Form Field | WeFact API Field | Type | Required | Notes |
|---|---|---|---|---|
| bedrijf | CompanyName | String | No | Business name |
| kvk | CompanyNumber | String | No | Dutch Chamber of Commerce |
| btw | TaxNumber | String | No | VAT number (NL format) |
| voornaam | Initials | String | No | First letter(s) uppercase |
| klant | SurName | String | **YES** | Primary surname |
| achternaam | (custom) | String | No | Additional surname |
| geslacht | Sex | String (m/f/d) | No | Default: "m" |
| straat | Address | String | No | Street name and number |
| postcode | ZipCode | String | No | Postal code |
| plaats | City | String | No | City/Municipality |
| email | EmailAddress | String | No | Email address |
| telefoon | PhoneNumber | String | No | Phone number |
| klantnummer | (ignored) | String | No | WeFact generates DebtorCode |

---

## Responsive Design

Form adapts to screen sizes:

- **Mobile (< 768px)**: All fields stack vertically (1 column)
- **Tablet (768px - 1024px)**: 2 columns for some rows
- **Desktop (> 1024px)**: Full multi-column layout (3-4 columns per row)

---

## Validation & Requirements

1. **Required Field**: Achternaam (SurName) - WeFact requires either CompanyName or SurName
2. **Geslacht Default**: Defaults to "m" (male) if not specified
3. **Initials Sanitization**: Handled in `/api/wefact/route.ts` (uppercase first letter + period)
4. **Backward Compatibility**: Legacy fields still available via checkbox toggle

---

## Testing Scenarios

### Scenario 1: WeFact Search + Auto-Fill
```
1. User selects client from WeFact search
2. All fields auto-populated from WeFact data
3. User can edit any field
4. Submit sends updated data
```

### Scenario 2: Manual Entry
```
1. User clicks "Handmatig invullen"
2. Form shows empty fields
3. User fills in all details
4. Submit creates new debtor in WeFact
```

### Scenario 3: Minimal Entry
```
1. User enters only: SurName, Email
2. Submit creates debtor (CompanyName empty, but SurName present)
3. WeFact accepts (validation requirement met)
```

---

## Files Modified

1. ✅ `app/inboeken/page.tsx`
   - Updated FormData type
   - Updated getInitialFormData()
   - Updated handleSubmit() - clientData mapping

2. ✅ `components/RepairForm.tsx`
   - Updated FormData type
   - Updated state initialization
   - Updated customerFields tracking
   - Replaced customer section UI with expanded form

---

## Browser Testing Checklist

- [x] Form renders with all fields
- [x] Responsive layout on mobile/tablet/desktop
- [x] Pre-fill works from WeFact selection
- [x] Manual mode shows empty form
- [x] Geslacht dropdown works (m/f/d)
- [x] Legacy fields toggle visible/hidden
- [x] Field edits detected (clears selectedClient)
- [x] All fields included in WeFact payload

---

## API Request Example

When user submits with all fields filled:

```json
{
  "mode": "add",
  "clientData": {
    "CompanyName": "Tech Solutions BV",
    "kvk": "12345678",
    "btw": "NL123456789B01",
    "voornaam": "Jan",
    "SurName": "de Vries",
    "achternaam": "van der Berg",
    "geslacht": "m",
    "straat": "Keizersgracht 100",
    "postcode": "1015 AA",
    "plaats": "Amsterdam",
    "email": "jan@techsolutions.nl",
    "telefoon": "020-1234567"
  }
}
```

WeFact /api/wefact will map these to the proper fields and create the debtor.

---

## Backward Compatibility

The form maintains backward compatibility:
- Legacy `adres` and `woonplaats` fields still available
- Legacy `klantnummer` field still present
- Both new and old field names sent to API
- Frontend can handle both `Address`/`straat` and `address`/`adres`

---

## Notes for Future Development

- Consider adding field validation on frontend (e.g., email format, postcode length)
- KvK number format validation (8 digits for Dutch companies)
- BTW number validation (NL + 10 digits for Dutch companies)
- Phone number formatting options

