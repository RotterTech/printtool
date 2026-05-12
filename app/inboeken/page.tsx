"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RepairForm, type RepairFormRef } from "@/components/RepairForm";
import LabelPreview from "@/components/LabelPreview";
import { Button } from "@/components/ui/button";
import RefurbishForm from "@/components/RefurbishForm";
import DismantleForm from "@/components/DismantleForm";
import APKForm, { APKData } from "@/components/APKForm";
import StockBrowser from "@/components/StockBrowser";
import WeFactDebtorSearch from "@/components/WeFactDebtorSearch";
import CustomerSearch, { type UnifiedCustomer } from "@/components/CustomerSearch";
import { Building2, User, Mail, MapPin, Phone, Hash, X, Edit2, Wrench, Gift, Cpu, ClipboardCheck, ShoppingBag, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

type DeviceType = "laptop" | "desktop" | "printer" | "console" | "tablet" | "telefoon";
type ActionType = "reparatie" | "apk" | "donatie" | "demonteren" | "kopen" | null;

type FormData = {
  // Client Details (WeFact Integration)
  bedrijf: string;
  voornaam: string;
  klant: string;
  achternaam: string;
  kvk: string;
  btw: string;
  geslacht: string;
  straat: string;
  postcode: string;
  plaats: string;
  
  // Contact
  email: string;
  telefoon: string;
  klantnummer: string;
  
  // Address (legacy)
  adres: string;
  woonplaats: string;
  
  // Repair Details
  device_type: DeviceType;
  merk: string;
  model: string;
  serial_number: string;
  device_password?: string;
  omschrijving: string;
  accessories?: { type: string; label: string; quantity: number; notes: string }[];
  onderdeel_besteld: boolean;
  onderdeel_naam: string;
  onderdeel_leverancier: string;
  datum_in: string;
  prijsafspraak: string;
  kosten: string;
};

interface WeFactDebtor {
  Identifier: string;
  DebtorCode: string;
  CompanyName?: string;
  FirstName?: string;
  Surname?: string;
  Initials?: string;
  EmailAddress?: string;
  City?: string;
  ZipCode?: string;
  Address?: string;
  Zipcode?: string; // Fallback for list response
  Telephone?: string; // Fallback
  PhoneNumber?: string;
  [key: string]: any;
}

function InboekenPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repairFormRef = useRef<RepairFormRef>(null);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [jobId, setJobId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Flow state
  const [selectedClient, setSelectedClient] = useState<WeFactDebtor | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionType>(null);
  
  // APK form state
  const [apkJob, setApkJob] = useState<any | null>(null);
  const [apkForm, setApkForm] = useState<APKData>({ 
    customerName: "", 
    customerEmail: "",
    customerPhone: "",
    klantnummer: "",
    deviceType: "laptop", 
    brand: "", 
    model: "", 
    customModel: "", 
    accessories: [] 
  });
  
  // WeFact toggle: choose whether to send to WeFact
  const [sendToWefact, setSendToWefact] = useState(true);
  
  // Smart duplicate detection
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingWefactPayload, setPendingWefactPayload] = useState<any>(null);
  const [duplicateContext, setDuplicateContext] = useState<"submit" | "save-client">("submit");

  // Prefill from query params (when coming from customer page)
  useEffect(() => {
    const customer = searchParams.get("customer");
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");
    const klantnummer = searchParams.get("klantnummer");
    const type = searchParams.get("type");
    
    if (customer || email || phone) {
      // Set manual mode with prefilled data
      setManualMode(true);
      
      // Pre-set selected action if specified
      if (type === "apk") {
        setSelectedAction("apk");
        setApkForm(prev => ({ ...prev, customerName: customer || "" }));
      } else {
        setSelectedAction("reparatie");
      }
      
      // Create a mock client to prefill
      const nameParts = (customer || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      
      setSelectedClient({
        Identifier: "",
        DebtorCode: klantnummer || "",
        FirstName: firstName,
        Surname: lastName,
        EmailAddress: email || "",
        PhoneNumber: phone || "",
      } as WeFactDebtor);
    }
  }, [searchParams]);

  // Action options
  const actionOptions = [
    { key: "reparatie", label: "Reparatie", emoji: "🔧", icon: Wrench, description: "Apparaat ter reparatie", color: "from-blue-500 to-blue-600" },
    { key: "apk", label: "APK / Onderhoud", emoji: "🔍", icon: ClipboardCheck, description: "Preventief onderhoud", color: "from-green-500 to-green-600" },
    { key: "donatie", label: "Donatie / Inkoop", emoji: "🎁", icon: Gift, description: "Klant brengt apparaat", color: "from-purple-500 to-purple-600" },
    { key: "demonteren", label: "Demonteren", emoji: "🔩", icon: Cpu, description: "Onderdelen harvesten", color: "from-orange-500 to-orange-600" },
    { key: "kopen", label: "Komt Kopen", emoji: "🛒", icon: ShoppingBag, description: "Klant koopt iets", color: "from-pink-500 to-pink-600" },
  ] as const;

  // ===== SMART WEFACT: Check for duplicates before creating =====
  const smartWefactAdd = async (wefactPayload: any): Promise<{ success: boolean; debtor?: any; needsReview?: boolean; matches?: any[] }> => {
    console.log("🔍 Smart WeFact add: checking for duplicates first...");
    
    const res = await fetch("/api/wefact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...wefactPayload, mode: "smart-add" }),
    });
    
    const data = await res.json();
    console.log("📥 Smart-add response:", data.code, data);
    
    if (data.code === "POTENTIAL_DUPLICATES" && data.matches?.length > 0) {
      return { success: false, needsReview: true, matches: data.matches };
    }
    
    if (data.code === "CREATED" && data.debtor) {
      return { success: true, debtor: data.debtor };
    }
    
    if (data.code === "ALREADY_EXISTS") {
      return { success: false, needsReview: false };
    }
    
    if (!res.ok) {
      throw new Error(data.userMessage || data.message || "WeFact fout");
    }
    
    return { success: true, debtor: data.debtor };
  };
  
  // Force create (skip duplicate check, use normal "add" mode)
  const forceWefactAdd = async (wefactPayload: any): Promise<{ success: boolean; debtor?: any }> => {
    console.log("🚀 Force WeFact add: creating without duplicate check...");
    const res = await fetch("/api/wefact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...wefactPayload, mode: "add" }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.code === "ALREADY_EXISTS") {
        toast.info("👤 Deze klant bestaat al in WeFact");
        return { success: false };
      }
      throw new Error(data.userMessage || data.message || "WeFact fout");
    }
    return { success: true, debtor: data.debtor };
  };
  
  // Handle picking an existing debtor from duplicate dialog
  const handlePickExistingDebtor = async (debtor: any) => {
    console.log("✅ User picked existing debtor:", debtor.DebtorCode);
    setShowDuplicateDialog(false);
    setDuplicateMatches([]);
    
    // Fetch full details
    try {
      const detailRes = await fetch("/api/wefact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "detail", identifier: debtor.Identifier }),
      });
      const detailData = await detailRes.json();
      const fullDebtor = detailData.debtor || debtor;
      
      setSelectedClient(fullDebtor);
      toast.success(`✅ Gekoppeld aan bestaande klant: ${fullDebtor.DebtorCode}`);
      
      if (duplicateContext === "submit") {
        // Continue submit with linked debtor
        continueSubmitWithDebtor(fullDebtor);
      }
    } catch (e) {
      // Fallback: use the list data
      setSelectedClient(debtor);
      toast.success(`✅ Gekoppeld aan: ${debtor.DebtorCode}`);
      if (duplicateContext === "submit") {
        continueSubmitWithDebtor(debtor);
      }
    }
  };
  
  // Handle "create anyway" from duplicate dialog
  const handleForceCreate = async () => {
    setShowDuplicateDialog(false);
    setDuplicateMatches([]);
    
    if (!pendingWefactPayload) return;
    
    try {
      setSubmitting(true);
      const result = await forceWefactAdd(pendingWefactPayload);
      
      if (result.success && result.debtor) {
        setSelectedClient(result.debtor);
        toast.success(`✅ Nieuwe klant aangemaakt: ${result.debtor.DebtorCode}`);
        
        if (duplicateContext === "submit") {
          continueSubmitWithDebtor(result.debtor);
        }
      } else {
        toast.error("Kon klant niet aanmaken in WeFact");
      }
    } catch (error: any) {
      toast.error(error.message || "WeFact fout bij aanmaken");
    } finally {
      setSubmitting(false);
      setPendingWefactPayload(null);
    }
  };
  
  // Continue submit flow after debtor is resolved
  const continueSubmitWithDebtor = async (debtor: any) => {
    if (!formData) return;
    
    const finalKlantnummer = debtor.DebtorCode || "";
    
    await repairFormRef.current?.submit({
      klantnummer: finalKlantnummer,
      send_to_wefact: sendToWefact,
    } as Partial<FormData>);
    setSubmitting(false);
  };

  // Test data filler function
  const fillTestData = () => {
    const testClient = {
      Identifier: "999",
      DebtorCode: "TEST001",
      CompanyName: "",
      FirstName: "Jan",
      Surname: "Jansen",
      Initials: "J",
      EmailAddress: "jan.jansen@test.nl",
      PhoneNumber: "0612345678",
      Address: "Teststraat 123",
      ZipCode: "1234AB",
      City: "Amsterdam",
      Country: "NL",
    };
    
    setSelectedClient(testClient);
    setManualMode(false);
    toast.success("Test data ingeladen! 🧪");
    console.log("🧪 Test data loaded:", testClient);
  };

  const customerFields = ['bedrijf', 'voornaam', 'klant', 'achternaam', 'kvk', 'btw', 'geslacht', 'straat', 'postcode', 'plaats', 'email', 'telefoon', 'adres', 'woonplaats'];

  const handleChange = (form: FormData, id: string, editedField?: string) => {
    setFormData(form);
    setJobId(id);
    
    // If customer fields were edited, clear selectedClient to force WeFact re-creation
    if (editedField && customerFields.includes(editedField) && selectedClient) {
      setSelectedClient(null);
    }
  };

  const handleCreated = (newJobId: string) => {
    // Redirect to print page immediately after save
    router.push(`/print/${newJobId}`);
  };

  // Handle APK submit
  const submitApk = async () => {
    const customer_name = apkForm.customerName.trim() || getClientDisplayName(selectedClient!);
    const customer_email = apkForm.customerEmail?.trim() || selectedClient?.EmailAddress || "";
    const customer_phone = apkForm.customerPhone?.trim() || selectedClient?.PhoneNumber || selectedClient?.Telephone || "";
    const klantnummer = apkForm.klantnummer?.trim() || selectedClient?.DebtorCode || "";
    const device_brand = (apkForm.brand || "").trim();
    const device_model = (apkForm.model === "Anders..." ? (apkForm.customModel || "").trim() : (apkForm.model || "").trim());

    if (!customer_name || !device_brand || !device_model) {
      toast.error("Vul merk en model in.");
      return;
    }

    try {
      const res = await fetch("/api/apk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          customer_name, 
          customer_email,
          customer_phone,
          klantnummer,
          device_brand, 
          device_model 
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Kon APK job niet aanmaken.");
      }
      setApkJob(data.job);
      // Redirect to print page
      router.push(`/apk/${data.job.id}/print`);
    } catch (err: any) {
      toast.error(err?.message || "Er ging iets mis bij het aanmaken van APK.");
    }
  };

  // Handle client selection from WeFact (legacy)
  const handleClientSelect = (debtor: WeFactDebtor) => {
    setSelectedClient(debtor);
    // Pre-fill APK form with all customer details
    setApkForm(prev => ({
      ...prev,
      customerName: getClientDisplayName(debtor),
      customerEmail: debtor.EmailAddress || "",
      customerPhone: debtor.PhoneNumber || debtor.Telephone || "",
      klantnummer: debtor.DebtorCode || "",
    }));
    console.log("✅ Client selected:", debtor);
  };

  // Handle unified customer selection (from both WeFact and internal system)
  const handleUnifiedCustomerSelect = (customer: UnifiedCustomer) => {
    // Convert UnifiedCustomer to WeFactDebtor format for compatibility
    const nameParts = customer.name.split(" ");
    const firstName = nameParts[0] || "";
    const surname = nameParts.slice(1).join(" ") || "";
    
    const debtor: WeFactDebtor = {
      Identifier: customer.wefactId || customer.id,
      DebtorCode: customer.klantnummer || "",
      CompanyName: customer.company || "",
      FirstName: firstName,
      Surname: surname,
      Initials: firstName.charAt(0) || "",
      EmailAddress: customer.email || "",
      PhoneNumber: customer.phone || "",
      Address: customer.address || "",
      City: customer.city || "",
      _source: customer.source, // Track origin
    };
    
    setSelectedClient(debtor);
    setApkForm(prev => ({
      ...prev,
      customerName: customer.name,
      customerEmail: customer.email || "",
      customerPhone: customer.phone || "",
      klantnummer: customer.klantnummer || "",
    }));
    console.log("✅ Unified customer selected:", customer, "→", debtor);
  };

  // Clear selection and go back
  const handleClientChange = () => {
    setSelectedClient(null);
    setManualMode(false);
    setSelectedAction(null);
  };

  // Go back to action selection
  const handleBackToActions = () => {
    setSelectedAction(null);
  };

  // Get display name for client (debtor.show response)
  const getClientDisplayName = (client: WeFactDebtor) => {
    if (!client) return "";
    // Hardcoded fix: always show 'Romina' for KL1002
    if (client.DebtorCode === 'KL1002') return 'Romina';
    if (client.CompanyName && client.CompanyName.trim()) {
      return client.CompanyName;
    }
    // Fallback to personal name
    const initials = client.Initials || "";
    const surname = client.Surname || "";
    const firstName = client.FirstName || "";
    
    if (initials && surname) {
      return `${initials} ${surname}`.trim();
    }
    if (firstName && surname) {
      return `${firstName} ${surname}`.trim();
    }
    return surname || initials || "Onbekende naam";
  };

  // Get initial form data from WeFact client (debtor.show response)
  const getInitialFormData = (): Partial<FormData> | undefined => {
    if (!selectedClient && !manualMode) return undefined;
    
    if (selectedClient) {
      const displayName = getClientDisplayName(selectedClient);
      
      // Build address: ZipCode + City
      const addressParts = [];
      if (selectedClient.ZipCode) addressParts.push(selectedClient.ZipCode);
      if (selectedClient.City) addressParts.push(selectedClient.City);
      const woonplaats = addressParts.join(" ");
      
      return {
        bedrijf: selectedClient.CompanyName || "",
        voornaam: selectedClient.FirstName || selectedClient.Initials || "",
        achternaam: selectedClient.Surname || selectedClient.SurName || "",
        klant: displayName,
        kvk: (selectedClient as any).CompanyNumber || "",
        btw: (selectedClient as any).TaxNumber || "",
        geslacht: (selectedClient as any).Sex || "m",
        straat: selectedClient.Address || "",
        postcode: selectedClient.ZipCode || "",
        plaats: selectedClient.City || "",
        email: selectedClient.EmailAddress || "",
        telefoon: selectedClient.PhoneNumber || selectedClient.Telephone || "",
        klantnummer: selectedClient.DebtorCode || "",
        adres: selectedClient.Address || "",
        woonplaats: woonplaats || "",
      };
    }
    
    return undefined;
  };

  // 🧑 Alleen klant opslaan in WeFact (zonder reparatie)
  const handleSaveClientOnly = async () => {
    console.log("👤 Alleen klant opslaan clicked!");
    setSubmitting(true);
    
    try {
      const repairFormData = repairFormRef.current?.getFormData() || formData;
      
      if (!repairFormData || (!repairFormData.klant && !repairFormData.achternaam && !repairFormData.bedrijf)) {
        toast.error("Vul minimaal een naam of bedrijfsnaam in");
        setSubmitting(false);
        return;
      }
      
      // Build WeFact payload
      const wefactPayload = {
        clientData: {
          CompanyName: repairFormData.bedrijf || "",
          CompanyNumber: repairFormData.kvk || "",
          TaxNumber: repairFormData.btw || "",
          Sex: repairFormData.geslacht || "m",
          Initials: repairFormData.voornaam || "",
          SurName: repairFormData.achternaam || repairFormData.klant || "",
          Address: repairFormData.straat || repairFormData.adres || "",
          ZipCode: repairFormData.postcode || "",
          City: repairFormData.plaats || repairFormData.woonplaats || "",
          Country: "NL",
          EmailAddress: repairFormData.email || "",
          PhoneNumber: repairFormData.telefoon || "",
        }
      };
      
      console.log("📤 Smart-add client to WeFact:", wefactPayload);
      
      // Use smart-add to check for duplicates first
      const result = await smartWefactAdd(wefactPayload);
      
      if (result.needsReview && result.matches) {
        // Show duplicate dialog
        setDuplicateMatches(result.matches);
        setPendingWefactPayload(wefactPayload);
        setDuplicateContext("save-client");
        setShowDuplicateDialog(true);
        setSubmitting(false);
        return;
      }
      
      if (result.success && result.debtor) {
        setSelectedClient(result.debtor);
        toast.success(`✅ Klant opgeslagen: ${result.debtor.DebtorCode}`, { duration: 4000 });
      } else {
        toast.info("👤 Klant kon niet worden aangemaakt. Mogelijk bestaat deze al.", { duration: 5000 });
      }
      
    } catch (error: any) {
      console.error("❌ Fout bij opslaan klant:", error);
      
      if (error.message?.includes("NO_API_KEY") || error.message?.includes("niet ingesteld")) {
        toast.error("⚙️ WeFact is nog niet ingesteld. Ga naar Instellingen → Integraties.", { duration: 8000 });
      } else {
        toast.error(error.message || "Er ging iets mis bij het opslaan van de klant", { duration: 5000 });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    console.log("🖱️ Inboeken button clicked!");
    setSubmitting(true);
    
    try {
      // Get current form data from RepairForm via ref
      const repairFormData = repairFormRef.current?.getFormData() || formData;
      
      if (!repairFormData || !repairFormData.klant) {
        toast.error("Vul eerst klantgegevens in");
        setSubmitting(false);
        return;
      }
      
      let finalKlantnummer = repairFormData.klantnummer;
      
      // 🔗 Determine if we need to create a new WeFact debtor
      // - sendToWefact is OFF → skip WeFact entirely
      // - No selectedClient → create new
      // - selectedClient from TEST data (DebtorCode starts with "TEST") → create new  
      // - selectedClient without valid Identifier → create new
      const needsWefactCreation = sendToWefact && !manualMode && (!selectedClient ||  selectedClient.DebtorCode?.startsWith("TEST") || !selectedClient.Identifier || selectedClient.Identifier === "999");
      
      if (needsWefactCreation) {
        console.log("🚀 Nieuwe klant aanmaken in WeFact (smart-add)...");
        
        try {
          const wefactPayload = {
            clientData: {
              CompanyName: repairFormData.bedrijf || "",
              CompanyNumber: repairFormData.kvk || "",
              TaxNumber: repairFormData.btw || "",
              Sex: repairFormData.geslacht || "m",
              Initials: repairFormData.voornaam || "",
              SurName: repairFormData.achternaam || repairFormData.klant || "",
              Address: repairFormData.straat || repairFormData.adres || "",
              ZipCode: repairFormData.postcode || "",
              City: repairFormData.plaats || repairFormData.woonplaats || "",
              Country: "NL",
              EmailAddress: repairFormData.email || "",
              PhoneNumber: repairFormData.telefoon || "",
            }
          };
          
          const result = await smartWefactAdd(wefactPayload);
          
          if (result.needsReview && result.matches) {
            // Duplicates found - show dialog and pause submission
            setDuplicateMatches(result.matches);
            setPendingWefactPayload(wefactPayload);
            setDuplicateContext("submit");
            setShowDuplicateDialog(true);
            setSubmitting(false);
            return; // Will continue via continueSubmitWithDebtor after user picks
          }
          
          if (result.success && result.debtor?.DebtorCode) {
            finalKlantnummer = result.debtor.DebtorCode;
            setSelectedClient(result.debtor);
            toast.success(`✅ Klant aangemaakt: ${finalKlantnummer}`, { duration: 4000 });
          } else {
            toast.info("👤 Klant kon niet worden aangemaakt - reparatie wordt lokaal opgeslagen", { duration: 4000 });
          }
          
        } catch (wefactError: any) {
          console.error("❌ WeFact Fout:", wefactError);
          toast.error(wefactError.message || "WeFact fout", { duration: 5000 });
          
          const userChoice = confirm(
            `${wefactError.message || 'Er ging iets mis met WeFact'}\n\n` +
            `Wil je de reparatie toch lokaal opslaan zonder WeFact-koppeling?`
          );
          
          if (!userChoice) {
            setSubmitting(false);
            return;
          }
          
          toast.warning("Reparatie opgeslagen zonder WeFact-koppeling");
        }
      } else {
        if(manualMode || !sendToWefact) {
          console.log("⚠️ Manual mode or WeFact disabled - skipping WeFact creation");
        } else {
          // Bestaande klant uit WeFact zoekbalk - gebruik hun DebtorCode
          console.log("✅ Bestaande WeFact klant geselecteerd, geen creation nodig");
          const selectedDebtorCode = selectedClient?.DebtorCode || "";
          console.log("   DebtorCode:", selectedDebtorCode);
          finalKlantnummer = selectedDebtorCode || repairFormData.klantnummer;
        }
      }
      
      // Submit the repair form with final klantnummer
      await repairFormRef.current?.submit({
        klantnummer: finalKlantnummer,
        send_to_wefact: sendToWefact,
      } as Partial<FormData>);
      
    } catch (error: any) {
      toast.error(error.message || "Fout bij inboeken");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Duplicate Detection Dialog */}
      {showDuplicateDialog && duplicateMatches.length > 0 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">⚠️ Mogelijke duplicaten gevonden</h3>
              <p className="text-sm text-gray-600 mt-1">
                Er {duplicateMatches.length === 1 ? "is" : "zijn"} {duplicateMatches.length} bestaande klant{duplicateMatches.length !== 1 ? "en" : ""} gevonden die mogelijk dezelfde persoon {duplicateMatches.length === 1 ? "is" : "zijn"}.
              </p>
            </div>
            <div className="overflow-y-auto max-h-[50vh] p-4 space-y-3">
              {duplicateMatches.map((match: any, idx: number) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {match.CompanyName || `${match.Initials || ""} ${match.SurName || ""}`.trim() || "Onbekend"}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">#{match.DebtorCode}</div>
                      {match.EmailAddress && (
                        <div className="text-sm text-gray-600 mt-1">✉️ {match.EmailAddress}</div>
                      )}
                      {match.PhoneNumber && (
                        <div className="text-sm text-gray-600">📞 {match.PhoneNumber}</div>
                      )}
                      {match.Address && (
                        <div className="text-sm text-gray-600">📍 {match.Address}{match.City ? `, ${match.City}` : ""}</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Match: {match.matchReason}
                      </span>
                      <button
                        onClick={() => handlePickExistingDebtor(match)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        Koppelen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-between gap-3">
              <button
                onClick={() => {
                  setShowDuplicateDialog(false);
                  setDuplicateMatches([]);
                  setPendingWefactPayload(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleForceCreate}
                className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
              >
                Toch nieuwe klant aanmaken
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Only label printen */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #label-print, #label-print * { visibility: visible; }
          #label-print { position:absolute; left:0; top:0; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation Bar */}
        <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2 sm:py-3 flex flex-wrap gap-2 justify-between items-center sticky top-0 z-30 shadow-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-gray-100 text-sm font-bold bg-white shadow-sm"
          >
            ← Terug
          </Link>
          <div className="flex gap-2">
            <button
              onClick={fillTestData}
              className="border px-2.5 py-1.5 rounded-lg bg-purple-50 border-purple-300 shadow-sm text-sm font-bold hover:bg-purple-100 text-purple-700 transition-colors"
              title="Vul test data in voor sneller testen"
            >
              🧪 Test
            </button>
            <Link href="/dashboard" className="border px-2.5 py-1.5 rounded-lg bg-white shadow-sm text-sm font-bold hover:bg-gray-50">📊 Dashboard</Link>
            <Link href="/uitboeken" className="border px-2.5 py-1.5 rounded-lg bg-white shadow-sm text-sm font-bold hover:bg-gray-50 hidden sm:inline-flex">📤 Uitboeken</Link>
          </div>
        </div>

        {/* Header */}
        <div className="px-3 sm:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Progress indicator */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-sm">
              <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${
                !selectedClient && !manualMode ? "bg-blue-600 text-white" : "bg-green-500 text-white"
              }`}>1</span>
              <span className="text-gray-400 text-xs">→</span>
              <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${
                (selectedClient || manualMode) && !selectedAction ? "bg-blue-600 text-white" : 
                selectedAction ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
              }`}>2</span>
              <span className="text-gray-400 text-xs">→</span>
              <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${
                selectedAction ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
              }`}>3</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">📥 Inname Centrum</h1>
              <p className="text-gray-600 text-xs sm:text-sm mt-0.5 sm:mt-1">
                {!selectedClient && !manualMode && "Stap 1: Selecteer klant"}
                {(selectedClient || manualMode) && !selectedAction && "Stap 2: Wat komt de klant doen?"}
                {selectedAction && `Stap 3: ${actionOptions.find(a => a.key === selectedAction)?.label}`}
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-3 sm:px-8 py-4 sm:py-6">
          {/* STEP 1: Client Selection */}
          {!selectedClient && !manualMode ? (
            <div className="max-w-4xl mx-auto py-4 sm:py-8">
              <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    👤 Selecteer Klant
                  </h2>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Zoek klant (naam, e-mail of telefoon) in WeFact én ons systeem
                  </p>
                </div>

                {/* Unified Customer Search (WeFact + Internal) */}
                <div className="mb-6">
                  <CustomerSearch 
                    onSelect={handleUnifiedCustomerSelect}
                    placeholder="🔍 Zoek klant (naam, e-mail, telefoon)..."
                  />
                </div>

                {/* Manual Skip Option */}
                <div className="text-center pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setManualMode(true)}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium underline"
                  >
                    Overslaan / Handmatig invullen →
                  </button>
                </div>
              </div>
            </div>

          ) : !selectedAction ? (
            /* STEP 2: Action Selection */
            <div className="max-w-5xl mx-auto py-4 sm:py-8">
              {/* Client Summary Bar */}
              {selectedClient && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        {selectedClient.CompanyName ? (
                          <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        ) : (
                          <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-gray-600">Geselecteerde klant</p>
                        <p className="text-base sm:text-xl font-bold text-gray-900 truncate">{getClientDisplayName(selectedClient)}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex-shrink-0">
                        ✓ WeFact
                      </span>
                    </div>
                    <button
                      onClick={handleClientChange}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium self-start"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Andere klant
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Mode Indicator */}
              {manualMode && !selectedClient && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-700 font-medium">⚠️ Handmatige modus - klant wordt later ingevoerd</span>
                    <button
                      onClick={() => setManualMode(false)}
                      className="flex items-center gap-2 px-3 py-1 text-sm text-yellow-700 hover:text-yellow-900 font-medium"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Terug
                    </button>
                  </div>
                </div>
              )}

              {/* Action Selection */}
              <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 text-center mb-4 sm:mb-8">
                  Wat komt de klant doen?
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                  {actionOptions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.key}
                        onClick={() => setSelectedAction(action.key)}
                        className={`p-3 sm:p-6 rounded-xl border-2 border-gray-200 hover:border-transparent hover:shadow-lg transition-all group bg-gradient-to-br hover:${action.color}`}
                      >
                        <div className="text-2xl sm:text-4xl mb-2 sm:mb-3">{action.emoji}</div>
                        <h3 className="font-bold text-sm sm:text-lg mb-0.5 sm:mb-1">{action.label}</h3>
                        <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">{action.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

          ) : (
            /* STEP 3: The actual form based on selected action */
            <>
              {/* Back button and client summary */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
                <button
                  onClick={handleBackToActions}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Terug
                </button>
                
                {selectedClient && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-sm text-gray-900 truncate max-w-[150px] sm:max-w-none">{getClientDisplayName(selectedClient)}</span>
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded-full">WeFact</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg">
                  <span className="text-lg sm:text-2xl">{actionOptions.find(a => a.key === selectedAction)?.emoji}</span>
                  <span className="font-bold text-sm sm:text-base text-gray-900">{actionOptions.find(a => a.key === selectedAction)?.label}</span>
                </div>
              </div>

              {/* REPARATIE FORM */}
              {selectedAction === "reparatie" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
                  <div className="lg:col-span-2">
                    <RepairForm
                      ref={repairFormRef}
                      id="repair-form"
                      onFormChange={handleChange}
                      onCreated={handleCreated}
                      submitting={submitting}
                      initialData={getInitialFormData()}
                      manualMode={manualMode}
                    />
                  </div>
                  <div className="lg:col-span-1 lg:sticky lg:top-20 h-fit space-y-4">
                    <div id="label-print" className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-2 border-gray-200">
                      <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-gray-800">📄 Label Preview</h2>
                      {jobId && (
                        <div className="flex justify-end mb-2">
                          <span className="text-xs font-mono text-gray-400">
                            Job ID: <span className="font-bold text-gray-700">{jobId}</span>
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-center min-h-[300px]">
                        {formData && jobId ? (
                          <LabelPreview
                            repair={{
                              jobId: jobId,
                              voornaam: formData.voornaam,
                              klant: formData.klant,
                              merk: formData.merk,
                              model: formData.model,
                              serial_number: formData.serial_number,
                              device_password: formData.device_password,
                              omschrijving: formData.omschrijving,
                              email: formData.email,
                              telefoon: formData.telefoon,
                              klantnummer: formData.klantnummer,
                              adres: formData.adres,
                              woonplaats: formData.woonplaats,
                              prijsafspraak: formData.prijsafspraak,
                              kosten: formData.kosten,
                              onderdeel_besteld: formData.onderdeel_besteld,
                              onderdeel_naam: formData.onderdeel_naam,
                              onderdeel_leverancier: formData.onderdeel_leverancier,
                              datum_in: formData.datum_in,
                              device_type: formData.device_type,
                              accessories: formData.accessories || [],
                            }}
                          />
                        ) : (
                          <p className="text-gray-400 italic">Vul het formulier in om een label te zien</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {/* WeFact Toggle */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700">📤 Naar WeFact sturen</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSendToWefact(!sendToWefact)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            sendToWefact ? "bg-green-500" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              sendToWefact ? "translate-x-6" : ""
                            }`}
                          />
                        </button>
                      </div>
                      
                      <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || !formData?.klant || !formData?.merk}
                        className="w-full py-3 sm:py-4 text-base sm:text-xl font-bold bg-green-600 hover:bg-green-700 h-auto disabled:bg-gray-300"
                      >
                        {submitting ? "⏳ Bezig met opslaan..." : "💾 Opslaan & Label Printen"}
                      </Button>
                      
                    </div>
                  </div>
                </div>
              )}

              {/* APK FORM */}
              {selectedAction === "apk" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <APKForm 
                      formData={apkForm} 
                      setFormData={setApkForm} 
                      onSubmit={submitApk} 
                    />
                  </div>
                  <div className="lg:col-span-1 lg:sticky lg:top-20 h-fit">
                    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
                      <h2 className="text-lg font-bold mb-4 text-gray-800">📄 Label Preview</h2>
                      <div className="flex items-center justify-center min-h-[300px]">
                        <LabelPreview
                          repair={{
                            type: "apk",
                            job_id: "",
                            customer_name: apkForm.customerName || getClientDisplayName(selectedClient!),
                            device_brand: apkForm.brand,
                            device_model: apkForm.model === "Anders..." ? (apkForm.customModel || "") : apkForm.model,
                            accessories: apkForm.accessories || [],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DONATIE FORM */}
              {selectedAction === "donatie" && (
                <div className="max-w-4xl">
                  <RefurbishForm />
                </div>
              )}

              {/* DEMONTEREN FORM */}
              {selectedAction === "demonteren" && (
                <div className="max-w-4xl">
                  <DismantleForm />
                </div>
              )}

              {/* KOPEN - inline voorraad browser */}
              {selectedAction === "kopen" && (
                <div className="max-w-5xl">
                  <StockBrowser />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Wrapper with Suspense for useSearchParams
export default function InboekenPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <InboekenPageContent />
    </Suspense>
  );
}
