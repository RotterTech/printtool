# DDK Print Agent

Print labels via USB-printer vanuit elke locatie.

## Vereisten

- **Node.js 18+**: [Download](https://nodejs.org/)
- **Windows PC** met USB labelprinter (Brother, Dymo, etc.)
- Optioneel: Python 3 + Visual Studio Build Tools (voor native printer support)

## Installatie

```bash
npm install
```

Voor native printer support (Brother/Dymo):
```bash
npm install @thiagoelg/node-printer
```

## Setup

1. Ga in de webapp naar **Instellingen > Print Queue**
2. Maak een **Print Agent** aan
3. Kopieer de **API key**
4. Start de agent:

```bash
node agent.js
```

5. Vul de server URL (bijv. `https://pc-picker.nl`) en API key in
6. De agent slaat dit op in `agent-config.json`

## Gebruik

De agent draait continu en:
- Pollt elke 3 seconden voor nieuwe printjobs
- Rendert labels als afbeelding (QR-code + barcode)
- Print via de standaard systeemprinter
- Meldt het resultaat terug aan de server

In de webapp:
- Bij **Label Printen** pagina: klik **Print via USB**
- In **Instellingen > Print Queue**: bekijk status van jobs

## Problemen oplossen

| Probleem | Oplossing |
|----------|-----------|
| "Ongeldige API key" | Maak een nieuwe agent aan in Instellingen |
| Geen printers gevonden | Installeer `@thiagoelg/node-printer` |
| Printer niet beschikbaar | Check of de printer aan staat en als standaard is ingesteld |
