# Client Registration Form Expansion - Quick Reference

**Status**: ✅ COMPLETE - All changes implemented and compiled

---

## What Was Added

Expanded the Inboeken form to capture the full WeFact debtor structure with 4 organized rows:

### **Row 1: Bedrijfsgegevens** (3 fields)
- 🏢 Bedrijfsnaam → `CompanyName`
- 📋 KvK Nummer → `CompanyNumber`
- 🆔 BTW Nummer → `TaxNumber`

### **Row 2: Contactpersoon** (4 fields)
- 👥 Geslacht → `Sex` (Select: m/f/d)
- Voornaam → `Initials`
- Achternaam * → `SurName` **(Required)**
- Achternaam (extra) → custom field

### **Row 3: Contact** (2 fields)
- 📧 Email → `EmailAddress`
- ☎️ Telefoon → `PhoneNumber`

### **Row 4: Adres** (3 fields)
- 🏠 Straat → `Address`
- 📮 Postcode → `ZipCode`
- 🏘️ Plaats → `City`

**Optional Legacy Section** (checkbox toggle)
- Adres (old field)
- Woonplaats (old field)
- Klantnummer (old field)

---

## Files Modified

1. ✅ **app/inboeken/page.tsx**
   - Updated FormData type (+9 new fields)
   - Updated getInitialFormData() mapping
   - Updated handleSubmit() clientData payload

2. ✅ **components/RepairForm.tsx**
   - Updated FormData type (+9 new fields)
   - Updated state initialization
   - Updated form UI (expanded customer section)
   - Updated emptyForm reset logic

---

## How It Works

### When WeFact Client is Selected
```
WeFact response → getInitialFormData() → Form pre-fills all fields
```

### When Manual Entry
```
User fills all fields → handleSubmit() → Sends to /api/wefact
```

### API Payload Sent
```typescript
clientData: {
  CompanyName: "...",
  CompanyNumber: "...",
  TaxNumber: "...",
  Sex: "m",
  Initials: "...",
  SurName: "...",
  EmailAddress: "...",
  PhoneNumber: "...",
  Address: "...",
  ZipCode: "...",
  City: "..."
}
```

---

## Field Mapping Reference

| Frontend | API Field | Description |
|----------|-----------|-------------|
| bedrijf | CompanyName | Business name |
| kvk | CompanyNumber | Chamber of Commerce |
| btw | TaxNumber | VAT number |
| geslacht | Sex | Gender (m/f/d) |
| voornaam | Initials | First name/initials |
| klant | SurName | Last name ⭐ |
| achternaam | - | Extra surname |
| email | EmailAddress | Email |
| telefoon | PhoneNumber | Phone |
| straat | Address | Street |
| postcode | ZipCode | Postal code |
| plaats | City | City |

---

## Responsive Layout

- **Mobile**: All fields stack (1 column)
- **Tablet**: 2 columns
- **Desktop**: 3-4 columns per row

---

## Validation

- **Required**: Achternaam (SurName) - WeFact requires CompanyName OR SurName
- **Geslacht default**: "m" (male)
- **All new fields**: Optional (WeFact will accept partial data)

---

## Testing

Simply test the form in the inboeken page:

1. **Via WeFact**: Click WeFact search → Select client → All fields auto-fill
2. **Manual**: Click "Handmatig invullen" → Fill form → Submit creates debtor

---

## Backward Compatibility

✅ Old fields still work:
- `bedrijf` + `klant` + `email` + `telefoon` still functional
- New fields (`kvk`, `btw`, `geslacht`, etc.) are additive
- API handles both old and new field names

---

**Ready for production testing!** 🚀

