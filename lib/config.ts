/**
 * 🏢 CENTRALE CONFIGURATIE
 * ========================
 * 
 * Alle settings voor de app op één plek.
 * Verander hier → verandert overal in de app.
 * 
 * Perfect voor SaaS: elke klant kan eigen config hebben.
 */

// ============================================================================
// 🏢 BEDRIJFSGEGEVENS
// ============================================================================
export const COMPANY = {
  /** Bedrijfsnaam op labels en in de app */
  name: "De Digitale Klusjesman",
  
  /** Korte naam voor compacte weergave */
  shortName: "DDKM",
  
  /** Slogan/tagline onder logo */
  tagline: "ddkm.nl",
  
  /** Contact email */
  email: "info@ddkm.nl",
  
  /** Contact telefoon */
  phone: "06 – 454 454 51",
  
  /** Website URL (waar de app draait) */
  website: "https://pc-picker.nl",
  
  /** Publieke website voor klanten */
  publicWebsite: "https://ddkm.nl",
  
  /** KvK nummer */
  kvk: "",
  
  /** BTW nummer */
  btw: "",
} as const;

// ============================================================================
// 🏷️ LABEL CONFIGURATIE
// ============================================================================
export const LABEL = {
  /** Label breedte in mm (thermische printers) */
  widthMm: 62,
  
  /** Label hoogte in mm */
  heightMm: 100,
  
  /** Toon logo op label */
  showLogo: true,
  
  /** Logo pad (relatief aan /public) */
  logoPath: "/logo.png",
  
  /** Toon QR code */
  showQRCode: true,
  
  /** QR code grootte in pixels */
  qrSize: 80,
  
  /** Toon barcode */
  showBarcode: true,
  
  /** Barcode type: 'CODE128' | 'CODE39' | 'EAN13' */
  barcodeType: "CODE128" as "CODE128" | "CODE39" | "EAN13",
  
  /** Sectie titels op label */
  sections: {
    customer: "KLANT",
    device: "APPARAAT",
    problem: "KLACHT",
  },
} as const;

// ============================================================================
// 🌐 API CONFIGURATIE
// ============================================================================
export const API = {
  /** Timeout voor externe API calls (ms) */
  timeoutMs: 30000, // 30 seconden (was 10)
  
  /** Aantal retry pogingen bij timeout */
  maxRetries: 2,
  
  /** Wachttijd tussen retries (ms) */
  retryDelayMs: 1000,
  
  /** WeFact API URL */
  wefactUrl: "https://api.mijnwefact.nl/v2/",
  
  /** Print service URL (lokaal) */
  printServiceUrl: "http://localhost:3001",
} as const;

// ============================================================================
// 📱 APPARAAT TYPES
// ============================================================================
export type DeviceType = "laptop" | "desktop" | "printer" | "console" | "tablet" | "telefoon";

export const DEVICE_TYPES: { value: DeviceType; label: string; emoji: string }[] = [
  { value: "laptop", label: "Laptop", emoji: "💻" },
  { value: "desktop", label: "Desktop", emoji: "🖥️" },
  { value: "printer", label: "Printer", emoji: "🖨️" },
  { value: "console", label: "Game Console", emoji: "🎮" },
  { value: "tablet", label: "Tablet", emoji: "📱" },
  { value: "telefoon", label: "Telefoon", emoji: "📞" },
];

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  laptop: "Laptop",
  desktop: " Desktop",
  printer: " Printer",
  console: " Console",
  tablet: "Tablet",
  telefoon: "Telefoon",
};

// ============================================================================
// 🎨 MERK KLEUREN (voor visuele herkenning)
// ============================================================================
export const BRAND_COLORS: Record<string, { bg: string; text: string; border: string; hex: string }> = {
  // Laptop/Desktop merken
  "Lenovo": { bg: "bg-red-100", text: "text-red-800", border: "border-red-300", hex: "#E2231A" },
  "HP": { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300", hex: "#0096D6" },
  "Dell": { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-300", hex: "#007DB8" },
  "Asus": { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-300", hex: "#000000" },
  "Acer": { bg: "bg-green-100", text: "text-green-800", border: "border-green-300", hex: "#83B81A" },
  "Apple": { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300", hex: "#555555" },
  "Microsoft": { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-300", hex: "#00A4EF" },
  
  // Printer merken
  "Canon": { bg: "bg-red-100", text: "text-red-800", border: "border-red-300", hex: "#CC0000" },
  "Epson": { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300", hex: "#003399" },
  "Brother": { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300", hex: "#005BAC" },
  
  // Console merken
  "Sony": { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300", hex: "#003087" },
  "Nintendo": { bg: "bg-red-100", text: "text-red-800", border: "border-red-300", hex: "#E60012" },
  
  // Telefoon merken
  "Samsung": { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300", hex: "#1428A0" },
  "Google": { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300", hex: "#4285F4" },
  "OnePlus": { bg: "bg-red-100", text: "text-red-800", border: "border-red-300", hex: "#F5010C" },
  "Xiaomi": { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", hex: "#FF6900" },
  
  // Fallbacks
  "Custom Build": { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300", hex: "#7C3AED" },
  "Overig": { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-300", hex: "#6B7280" },
};

// Helper function to convert hex color to Tailwind-like classes
function hexToColorClasses(hex: string): { bg: string; text: string; border: string } {
  // For custom colors, we use inline styles instead of Tailwind classes
  // Return neutral classes that work with inline style overrides
  return {
    bg: "bg-white",
    text: "text-black", 
    border: "border-gray-300"
  };
}

// Helper to get brand color (with custom color support from localStorage)
export function getBrandColor(brand: string): { bg: string; text: string; border: string; hex: string } {
  // Check for custom color in localStorage (client-side only)
  if (typeof window !== 'undefined') {
    try {
      const customColors = localStorage.getItem("printtool_brand_colors");
      if (customColors) {
        const parsed = JSON.parse(customColors);
        if (parsed[brand]) {
          const customHex = parsed[brand];
          return {
            ...hexToColorClasses(customHex),
            hex: customHex
          };
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }
  
  // Fall back to default colors
  return BRAND_COLORS[brand] || BRAND_COLORS["Overig"];
}

// ============================================================================
// 🎒 ACCESSOIRES (tas, adapter, kabel, etc.)
// ============================================================================
export const ACCESSORY_TYPES = [
  { value: "adapter", label: "Adapter/Oplader", emoji: "🔌", defaultIncluded: true },
  { value: "tas", label: "Laptoptas", emoji: "💼", defaultIncluded: false },
  { value: "muis", label: "Muis", emoji: "🖱️", defaultIncluded: false },
  { value: "toetsenbord", label: "Toetsenbord", emoji: "⌨️", defaultIncluded: false },
  { value: "kabel_hdmi", label: "HDMI Kabel", emoji: "🔗", defaultIncluded: false },
  { value: "kabel_usb", label: "USB Kabel", emoji: "🔗", defaultIncluded: false },
  { value: "kabel_netwerk", label: "Netwerk Kabel", emoji: "🔗", defaultIncluded: false },
  { value: "dock", label: "Docking Station", emoji: "🖥️", defaultIncluded: false },
  { value: "monitor", label: "Monitor", emoji: "🖥️", defaultIncluded: false },
  { value: "usb_stick", label: "USB Stick", emoji: "💾", defaultIncluded: false },
  { value: "externe_hdd", label: "Externe HDD/SSD", emoji: "💿", defaultIncluded: false },
  { value: "headset", label: "Headset/Koptelefoon", emoji: "🎧", defaultIncluded: false },
  { value: "webcam", label: "Webcam", emoji: "📷", defaultIncluded: false },
  { value: "cd_dvd", label: "Installatie CD/DVD", emoji: "💿", defaultIncluded: false },
  { value: "handleiding", label: "Handleiding/Papieren", emoji: "📄", defaultIncluded: false },
  { value: "doos", label: "Originele Doos", emoji: "📦", defaultIncluded: false },
  { value: "anders", label: "Anders...", emoji: "📎", defaultIncluded: false },
] as const;

export type AccessoryType = typeof ACCESSORY_TYPES[number]['value'];

// Helper to get accessories (with custom overrides from localStorage)
export function getAccessoryTypes(): typeof ACCESSORY_TYPES[number][] {
  // Check for custom accessories in localStorage (client-side only)
  if (typeof window !== 'undefined') {
    try {
      const customAccessories = localStorage.getItem("printtool_accessories");
      if (customAccessories) {
        return JSON.parse(customAccessories);
      }
    } catch {
      // Ignore localStorage errors
    }
  }
  
  // Fall back to default accessories
  return [...ACCESSORY_TYPES];
}

// ============================================================================
// 🔧 MERK & MODEL DATABASE
// ============================================================================
export const BRAND_MODELS: Record<DeviceType, Record<string, string[]>> = {
  laptop: {
    "Lenovo": ["ThinkPad X1", "ThinkPad T-Series", "ThinkPad E-Series", "ThinkBook", "ThinkCentre Tiny", "IdeaPad", "Yoga", "Legion", "Anders..."],
    "HP": ["ProBook", "EliteBook", "Pavilion", "Envy", "ZBook", "Anders..."],
    "Dell": ["Latitude", "Inspiron", "XPS", "Precision", "Vostro", "Anders..."],
    "Asus": ["ZenBook", "VivoBook", "ROG", "TUF", "ExpertBook", "Anders..."],
    "Acer": ["Aspire", "Swift", "Spin", "Nitro", "Predator", "Anders..."],
    "Apple": ["MacBook Air M1/M2", "MacBook Pro 13", "MacBook Pro 14/16", "Anders..."],
    "Overig": ["Microsoft Surface", "Samsung", "MSI", "Toshiba", "Anders..."]
  },
  desktop: {
    "Lenovo": ["ThinkCentre M-Series", "ThinkCentre Tiny", "ThinkStation", "Legion Tower", "Anders..."],
    "HP": ["ProDesk", "EliteDesk", "Pavilion Desktop", "OMEN", "Z Workstation", "Anders..."],
    "Dell": ["OptiPlex", "Precision", "Inspiron Desktop", "XPS Desktop", "Alienware", "Anders..."],
    "Apple": ["iMac 24", "Mac Mini", "Mac Studio", "Mac Pro", "Anders..."],
    "Custom Build": ["Gaming PC", "Workstation", "Home/Office PC", "Server", "Anders..."],
    "Overig": ["Asus", "Acer", "MSI", "Anders..."]
  },
  printer: {
    "HP": ["LaserJet", "OfficeJet", "DeskJet", "Envy", "PageWide", "Anders..."],
    "Canon": ["PIXMA", "imageCLASS", "MAXIFY", "imagePROGRAF", "Anders..."],
    "Epson": ["EcoTank", "WorkForce", "Expression", "SureColor", "Anders..."],
    "Brother": ["HL-Series", "MFC-Series", "DCP-Series", "Anders..."],
    "Overig": ["Samsung", "Lexmark", "Xerox", "Ricoh", "Anders..."]
  },
  console: {
    "Sony": ["PlayStation 5", "PlayStation 5 Digital", "PlayStation 4", "PlayStation 4 Pro", "PlayStation 4 Slim", "Anders..."],
    "Microsoft": ["Xbox Series X", "Xbox Series S", "Xbox One X", "Xbox One S", "Anders..."],
    "Nintendo": ["Switch OLED", "Switch", "Switch Lite", "Anders..."],
    "Overig": ["Steam Deck", "Retro Console", "Anders..."]
  },
  tablet: {
    "Apple": ["iPad Pro 12.9", "iPad Pro 11", "iPad Air", "iPad 10e gen", "iPad Mini", "Anders..."],
    "Samsung": ["Galaxy Tab S9", "Galaxy Tab S8", "Galaxy Tab A", "Anders..."],
    "Microsoft": ["Surface Pro", "Surface Go", "Anders..."],
    "Overig": ["Lenovo Tab", "Amazon Fire", "Huawei", "Anders..."]
  },
  telefoon: {
    "Apple": ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15", "iPhone 14", "iPhone SE", "Anders..."],
    "Samsung": ["Galaxy S24", "Galaxy S23", "Galaxy A-Series", "Galaxy Z Fold", "Galaxy Z Flip", "Anders..."],
    "Google": ["Pixel 8 Pro", "Pixel 8", "Pixel 7", "Anders..."],
    "Overig": ["OnePlus", "Xiaomi", "Huawei", "Motorola", "Anders..."]
  }
};

// ============================================================================
// 🔧 SNELKNOPPEN VOOR KLACHTEN
// ============================================================================
// ============================================================================
// 🔧 SNELKNOPPEN PER APPARAAT TYPE (Dynamisch)
// ============================================================================
export const DEVICE_PROBLEMS: Record<DeviceType, { label: string; value: string }[]> = {
  laptop: [
    { label: "💻 Windows",     value: "Windows opnieuw installeren" },
    { label: "🔋 Accu",        value: "Batterij/accu defect of versleten" },
    { label: "🖥️ Scherm",      value: "Scherm defect/kapot/gebarsten" },
    { label: "🔩 Scharnier",   value: "Scharnier/hinge kapot" },
    { label: "⌨️ Toetsenbord", value: "Toetsenbord defect" },
    { label: "🖱️ Touchpad",    value: "Touchpad/mousepad defect" },
    { label: "💿 SSD Upgrade", value: "SSD upgrade gewenst" },
    { label: "🔌 DC Jack",     value: "Laadt niet op / adapter probleem" },
    { label: "💾 Data",        value: "Data recovery / backup nodig" },
    { label: "🦠 Virus",       value: "Virus/malware verwijderen" },
    { label: "🔥 Ventilator",  value: "Laptop wordt te heet, reinigen" },
    { label: "🐌 Traag",       value: "Laptop is traag, optimalisatie nodig" },
  ],
  desktop: [
    { label: "💻 Windows",     value: "Windows opnieuw installeren" },
    { label: "💿 SSD Upgrade", value: "SSD upgrade gewenst" },
    { label: "🔌 Voeding",     value: "Voeding/PSU defect" },
    { label: "🧠 RAM",         value: "RAM geheugen probleem/upgrade" },
    { label: "🎮 GPU",         value: "Grafische kaart probleem" },
    { label: "🔧 Moederbord",  value: "Moederbord defect" },
    { label: "🔊 Geluid",      value: "Geen geluid / audio probleem" },
    { label: "📡 Netwerk",     value: "Geen internet / WiFi probleem" },
    { label: "💾 Data",        value: "Data recovery / backup nodig" },
    { label: "🦠 Virus",       value: "Virus/malware verwijderen" },
    { label: "🔥 Oververhit",  value: "PC wordt te heet, reinigen" },
    { label: "🐌 Traag",       value: "PC is traag, optimalisatie nodig" },
  ],
  printer: [
    { label: "📄 Papier",    value: "Papierstoring" },
    { label: "🖨️ Printkop",  value: "Printkop verstopt/defect" },
    { label: "🎨 Inkt",      value: "Inkt/toner probleem" },
    { label: "📡 WiFi",      value: "WiFi verbinding werkt niet" },
    { label: "💿 Driver",    value: "Driver probleem / niet herkend" },
    { label: "📉 Kwaliteit", value: "Afdrukkwaliteit slecht" },
    { label: "⚡ Stroom",    value: "Gaat niet aan / stroom probleem" },
    { label: "🔧 Scanner",   value: "Scanner werkt niet" },
  ],
  console: [
    { label: "📺 HDMI",       value: "HDMI poort defect / geen beeld" },
    { label: "🔥 Oververhit", value: "Console oververhit, reinigen" },
    { label: "💿 Disk",       value: "Disk drive leest niet / defect" },
    { label: "🎮 Controller", value: "Controller sync probleem" },
    { label: "💥 Crash",      value: "Software crash / freezing" },
    { label: "🔌 Stroom",     value: "Gaat niet aan / stroom probleem" },
    { label: "📡 WiFi",       value: "WiFi/netwerk verbinding probleem" },
    { label: "🧹 Reinigen",   value: "Intern reinigen (stof/vuil)" },
  ],
  tablet: [
    { label: "🖥️ Scherm",   value: "Scherm kapot/gebarsten" },
    { label: "🔋 Accu",     value: "Batterij defect/versleten" },
    { label: "🔌 Opladen",  value: "Laadt niet op" },
    { label: "🐌 Traag",    value: "Tablet is traag" },
    { label: "💿 Software", value: "Software probleem / reset" },
    { label: "🔒 Lock",     value: "iCloud/Google lock verwijderen" },
    { label: "📡 WiFi",     value: "WiFi verbinding werkt niet" },
    { label: "🔊 Geluid",   value: "Geen geluid / speaker defect" },
  ],
  telefoon: [
    { label: "🖥️ Scherm",   value: "Scherm kapot/gebarsten" },
    { label: "🔋 Accu",     value: "Batterij defect/versleten" },
    { label: "🔌 Opladen",  value: "Laadt niet op / poort defect" },
    { label: "💧 Water",    value: "Waterschade" },
    { label: "💿 Software", value: "Software probleem / reset" },
    { label: "📶 Simkaart", value: "Simkaart niet herkend" },
    { label: "📷 Camera",   value: "Camera defect" },
    { label: "🔊 Geluid",   value: "Geen geluid / microfoon defect" },
  ],
};

// ============================================================================
// 💰 PRIJZEN PER SERVICE (DDKM Tarieven)
// ============================================================================
export const PRICING = {
  // Werkplaats tarieven
  werkplaats: {
    kwartier: { label: "Directe reparatie (15 min)", price: 25 },
    halfUur: { label: "Directe reparatie (30 min)", price: 45 },
    vervolgKwartier: { label: "Vervolg per kwartier", price: 15 },
    onderzoek: { label: "Onderzoekskosten", price: 60 },
  },
  
  // Windows installaties
  windows: {
    basis: { label: "Windows herinstallatie (eigen licentie)", price: 40 },
    compleet: { label: "Windows + updates (eigen licentie)", price: 75 },
    nieuw: { label: "Windows nieuwe installatie + licentie", price: 149 },
    startKlaar: { label: "Windows start klaar maken", price: 85 },
    licentie: { label: "Nieuwe Windows 10/11 licentie", price: 75 },
  },
  
  // SSD Upgrades
  ssd: {
    s120: { label: "SSD 120 GB upgrade", price: 99 },
    s250: { label: "SSD 250 GB upgrade", price: 135 },
    s500: { label: "SSD 500 GB upgrade", price: 165 },
    s1000: { label: "SSD 1 TB upgrade", price: 185 },
    s2000: { label: "SSD 2 TB upgrade", price: 245 },
    nvme: { label: "Extra voor NVMe M.2", price: 15 },
  },
  
  // Data services
  data: {
    overzetten: { label: "Data overzetten (tot 35 GB)", price: 35 },
    migratie: { label: "Gehele HDD migratie naar SSD", price: 75 },
    handmatig: { label: "Handmatig installeren (per uur)", price: 55 },
    behuizing: { label: "HDD in USB behuizing", price: 35 },
    recovery: { label: "Eenvoudig data herstel", price: 85 },
    recoveryComplex: { label: "Complexe data recovery", price: 485 },
  },
  
  // Onderhoud
  onderhoud: {
    apk: { label: "Laptop/PC APK (10 punten check)", price: 55 },
    eset: { label: "ESET Anti Virus (1 jaar)", price: 42 },
    esetMetApk: { label: "ESET + APK combinatie", price: 85 },
    pickupReturn: { label: "Pick-up & return aan huis", price: 30 },
  },
  
  // Aan huis tarieven
  aanHuis: {
    particulier: { label: "Service aan huis (1,5 uur)", price: 65 },
    vervolgParticulier: { label: "Vervolg (per half uur)", price: 30 },
    spoed: { label: "Spoed/Zondag (1,5 uur)", price: 95 },
    vervolgSpoed: { label: "Spoed vervolg (per half uur)", price: 35 },
    zakelijk: { label: "Service onsite zakelijk (1 uur)", price: 75 },
    vervolgZakelijk: { label: "Zakelijk vervolg (per half uur)", price: 35 },
  },
} as const;

// Snelknoppen voor prijzen per apparaat type
export const QUICK_PRICES: Record<DeviceType, { label: string; price: number }[]> = {
  laptop: [
    { label: "APK Check", price: 55 },
    { label: "Rep 15 min", price: 15 },
    { label: "Rep 30 min", price: 45 },
    { label: "OZK", price: 60 },
    { label: "WP 1 uur", price: 60 },
    { label: "Win reinst", price: 75 },
    { label: "SSD 250 GB", price: 135 },
    { label: "SSD 500 GB", price: 165 },
    { label: "Accu rep", price: 85 },
    { label: "Scherm rep", price: 149 },
    { label: "Data OZ", price: 35 },
  ],
  desktop: [
    { label: "APK Check", price: 55 },
    { label: "Rep 15 min", price: 15 },
    { label: "Rep 30 min", price: 45 },
    { label: "OZK", price: 60 },
    { label: "WP 1 uur", price: 60 },
    { label: "Win reinst", price: 75 },
    { label: "SSD 500 GB", price: 165 },
    { label: "SSD 1 TB", price: 185 },
    { label: "RAM upgr", price: 65 },
    { label: "Reinigen intern", price: 45 },
    { label: "Data OZ", price: 35 },
  ],
  printer: [
    { label: "Diagnose", price: 25 },
    { label: "Reinigen", price: 35 },
    { label: "Printkop", price: 45 },
    { label: "Driver install", price: 25 },
    { label: "WiFi setup", price: 25 },
  ],
  console: [
    { label: "Diagnose", price: 25 },
    { label: "Reinigen intern", price: 45 },
    { label: "HDMI reparatie", price: 95 },
    { label: "Disk drive", price: 75 },
    { label: "Software reset", price: 35 },
  ],
  tablet: [
    { label: "Diagnose", price: 25 },
    { label: "Scherm reparatie", price: 129 },
    { label: "Accu vervangen", price: 65 },
    { label: "Software reset", price: 35 },
    { label: "Data backup", price: 35 },
  ],
  telefoon: [
    { label: "Diagnose", price: 25 },
    { label: "Scherm reparatie", price: 99 },
    { label: "Accu vervangen", price: 55 },
    { label: "Software reset", price: 35 },
    { label: "Data backup", price: 35 },
  ],
};

// Legacy export voor backwards compatibility
export const QUICK_BUTTONS = {
  hardware: DEVICE_PROBLEMS.laptop.slice(0, 8),
  software: [
    { label: "🐌 Traag", value: "PC is traag, optimalisatie nodig" },
    { label: "🦠 Virus", value: "Virus/malware verwijderen" },
    { label: "💿 Windows", value: "Windows opnieuw installeren" },
    { label: "📦 Software", value: "Software installeren" },
    { label: "💾 Data backup", value: "Data backup maken" },
  ],
} as const;

// ============================================================================
// 📊 STATUSSEN
// ============================================================================
export const REPAIR_STATUSES = [
  { value: "open", label: "Open", color: "bg-blue-100 text-blue-800" },
  { value: "in_progress", label: "In behandeling", color: "bg-yellow-100 text-yellow-800" },
  { value: "waiting_parts", label: "Wacht op onderdelen", color: "bg-orange-100 text-orange-800" },
  { value: "waiting_customer", label: "Wacht op klant", color: "bg-purple-100 text-purple-800" },
  { value: "completed", label: "Gereed", color: "bg-green-100 text-green-800" },
  { value: "delivered", label: "Afgehaald", color: "bg-gray-100 text-gray-800" },
  { value: "cancelled", label: "Geannuleerd", color: "bg-red-100 text-red-800" },
] as const;

export type RepairStatus = typeof REPAIR_STATUSES[number]['value'];

// ============================================================================
// 🎨 UI CONFIGURATIE
// ============================================================================
export const UI = {
  /** Primaire kleur (Tailwind class) */
  primaryColor: "blue",
  
  /** Sidebar breedte */
  sidebarWidth: "16rem",
  
  /** Toon versie in footer */
  showVersion: true,
  
  /** App versie */
  version: "2.0.0",
  
  /** Datum formaat */
  dateFormat: "nl-NL",
  
  /** Tijdzone */
  timezone: "Europe/Amsterdam",
} as const;

// ============================================================================
// 🔐 AUTH CONFIGURATIE
// ============================================================================
export const AUTH = {
  /** Session duur (seconden) */
  sessionDurationSeconds: 60 * 60 * 24 * 7, // 7 dagen
  
  /** Session refresh interval (ms) */
  refreshIntervalMs: 10 * 60 * 1000, // 10 minuten
  
  /** Redirect na login */
  redirectAfterLogin: "/inboeken",
  
  /** Redirect na logout */
  redirectAfterLogout: "/login",
} as const;

// ============================================================================
// 🎁 TRIAL / SAAS CONFIGURATIE
// ============================================================================
export const TRIAL = {
  /** Proefperiode in dagen */
  durationDays: 7,
  
  /** Features beschikbaar in trial */
  features: [
    "Reparaties inboeken",
    "Labels printen",
    "Klantenbeheer",
    "WeFact koppeling",
    "Onderdelen tracking",
    "Volledige support",
  ],
  
  /** Prijs na trial (per maand) */
  priceAfterTrial: 29,
  
  /** Toon countdown na X dagen */
  showWarningAfterDays: 5,
  
  /** Email herinnering dagen voor einde */
  reminderDaysBeforeEnd: [3, 1],
} as const;

// ============================================================================
// 💳 ABONNEMENTEN
// ============================================================================
export const PLANS = {
  trial: {
    name: "Proefperiode",
    price: 0,
    duration: "7 dagen",
    features: TRIAL.features,
  },
  starter: {
    name: "Starter",
    price: 29,
    duration: "per maand",
    features: [
      ...TRIAL.features,
      "Onbeperkt reparaties",
      "Email support",
    ],
  },
  professional: {
    name: "Professional",
    price: 49,
    duration: "per maand",
    features: [
      ...TRIAL.features,
      "Onbeperkt reparaties",
      "Prioriteit support",
      "API toegang",
      "Meerdere gebruikers",
    ],
  },
} as const;

// ============================================================================
// 📤 HELPER: Fetch met retry en timeout
// ============================================================================
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: { timeoutMs?: number; maxRetries?: number; retryDelayMs?: number } = {}
): Promise<Response> {
  const {
    timeoutMs = API.timeoutMs,
    maxRetries = API.maxRetries,
    retryDelayMs = API.retryDelayMs,
  } = config;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (attempt > 0) {
        console.log(`🔄 Retry poging ${attempt}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;

    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      if (error.name === 'AbortError') {
        console.error(`⏱️ Timeout na ${timeoutMs}ms (poging ${attempt + 1}/${maxRetries + 1})`);
        if (attempt === maxRetries) {
          throw new Error(`Timeout: geen reactie binnen ${timeoutMs / 1000} seconden na ${maxRetries + 1} pogingen`);
        }
      } else {
        // Niet-timeout error, gooi direct door
        throw error;
      }
    }
  }

  throw lastError || new Error("Fetch failed");
}

// ============================================================================
// 🗺️ WEFACT FIELD MAPPER
// ============================================================================
export function mapClientToWeFact(clientData: Record<string, any>) {
  const get = (...keys: string[]) => {
    for (const key of keys) {
      const val = clientData[key];
      if (val && typeof val === 'string' && val.trim()) {
        return val.trim();
      }
    }
    return "";
  };

  return {
    Sex: get("geslacht", "Sex") || "m",
    CompanyName: get("bedrijf", "CompanyName", "company", "firma"),
    SurName: get("achternaam", "naam", "SurName", "klant", "Surname", "lastName"),
    Initials: get("voornaam", "Initials", "firstName", "FirstName"),
    Address: get("straat", "adres", "Address", "street"),
    ZipCode: get("postcode", "ZipCode", "zipcode", "Zipcode"),
    City: get("plaats", "woonplaats", "City", "city"),
    Country: get("Country", "land") || "NL",
    EmailAddress: get("email", "EmailAddress", "Email", "e-mail"),
    PhoneNumber: get("telefoon", "PhoneNumber", "Telephone", "phone", "tel"),
    CompanyNumber: get("kvk", "CompanyNumber", "KvK", "chamberOfCommerce"),
    TaxNumber: get("btw", "TaxNumber", "BTW", "vatNumber"),
  };
}

// ============================================================================
// 📦 DEFAULT EXPORT (backwards compatible)
// ============================================================================
export const APP_CONFIG = {
  COMPANY_NAME: COMPANY.name,
  APP_TITLE: "PrintTool",
  APP_DESCRIPTION: "Reparatiebeheer & Label Printing System",
  HEADER_TITLE: "Werkplaats Kiosk",
  COMPANY_EMAIL: COMPANY.email,
  COMPANY_PHONE: COMPANY.phone,
  VERSION: UI.version,
  LOCALE: UI.dateFormat,
};

// ============================================================================
// 🔧 HELPER: Get Brand Models (from localStorage or default)
// ============================================================================
const STORAGE_KEY = "printtool_custom_brand_models";

/**
 * Get brand models from localStorage (user customized) or default config
 * Use this in components to get the current brand/model data
 */
export function getBrandModels(): Record<DeviceType, Record<string, string[]>> {
  // Only run on client
  if (typeof window === "undefined") {
    return BRAND_MODELS;
  }
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load custom brand models:", e);
  }
  
  return BRAND_MODELS;
}

/**
 * Get brands for a specific device type
 */
export function getBrandsForDevice(deviceType: DeviceType): string[] {
  const data = getBrandModels();
  return Object.keys(data[deviceType] || {});
}

/**
 * Get models for a specific brand within a device type
 */
export function getModelsForBrand(deviceType: DeviceType, brand: string): string[] {
  const data = getBrandModels();
  return data[deviceType]?.[brand] || [];
}

// ============================================================================
// 🔧 HELPER: Get Quick Prices (from localStorage or default)
// ============================================================================
const PRICES_STORAGE_KEY = "printtool_custom_prices";

/**
 * Get quick prices from localStorage (user customized) or default config
 * Use this in components to get the current pricing data
 */
export function getQuickPrices(): Record<DeviceType, { label: string; price: number }[]> {
  // Only run on client
  if (typeof window === "undefined") {
    return QUICK_PRICES;
  }
  
  try {
    const saved = localStorage.getItem(PRICES_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load custom prices:", e);
  }
  
  return QUICK_PRICES;
}

/**
 * Get quick prices for a specific device type
 */
export function getQuickPricesForDevice(deviceType: DeviceType): { label: string; price: number }[] {
  const data = getQuickPrices();
  return data[deviceType] || [];
}

export default {
  COMPANY,
  LABEL,
  API,
  DEVICE_TYPES,
  DEVICE_TYPE_LABELS,
  BRAND_MODELS,
  QUICK_BUTTONS,
  REPAIR_STATUSES,
  UI,
  AUTH,
  fetchWithRetry,
  mapClientToWeFact,
  APP_CONFIG,
  getBrandModels,
  getBrandsForDevice,
  getModelsForBrand,
  getQuickPrices,
  getQuickPricesForDevice,
};
