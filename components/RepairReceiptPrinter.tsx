"use client";

import { useState, useRef, useEffect } from "react";
import { Printer, X, ChevronDown } from "lucide-react";
import InnameBon from "@/components/receipts/InnameBon";
import AfhaalBon from "@/components/receipts/AfhaalBon";
import OfferteBon from "@/components/receipts/OfferteBon";
import WerkBon from "@/components/receipts/WerkBon";
import GarantieKaart from "@/components/receipts/GarantieKaart";
import { toast } from "sonner";

type ReceiptType = "innamebon" | "afhaalbon" | "offertebon" | "werkbon" | "garantiekaart";

const RECEIPT_OPTIONS: { id: ReceiptType; label: string; emoji: string }[] = [
  { id: "innamebon", label: "Innamebon", emoji: "🧾" },
  { id: "afhaalbon", label: "Afhaalbon", emoji: "📋" },
  { id: "offertebon", label: "Offerte", emoji: "💰" },
  { id: "werkbon", label: "Werkbon", emoji: "🔧" },
  { id: "garantiekaart", label: "Garantiekaart", emoji: "🛡️" },
];

export default function RepairReceiptPrinter({ repair }: { repair: any }) {
  const [activeReceipt, setActiveReceipt] = useState<ReceiptType | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrint = (type: ReceiptType) => {
    setActiveReceipt(type);
    setMenuOpen(false);
    setTimeout(() => window.print(), 300);
  };

  const handleSendEmail = async () => {
    const email = repair.customer_email || repair.email;
    if (!email) {
      toast.error("Geen e-mailadres beschikbaar");
      return;
    }
    try {
      const res = await fetch("/api/receipts/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairId: repair.id,
          receiptType: activeReceipt || "innamebon",
        }),
      });
      if (res.ok) {
        toast.success(`Bon verstuurd naar ${email}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Versturen mislukt");
      }
    } catch {
      toast.error("Kon e-mail niet versturen");
    }
  };

  return (
    <>
      {/* Print receipt styles */}
      <style jsx global>{`
        @media print {
          .receipt-print-area { display: block !important; position: fixed; top: 0; left: 0; width: 80mm; z-index: 9999; background: white; }
          .no-print, .print\\:hidden { display: none !important; }
        }
      `}</style>

      {/* Dropdown Button */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition w-full justify-center"
        >
          <Printer className="w-4 h-4" />
          🧾 Print Bon
          <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>

        {menuOpen && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white border rounded-lg shadow-xl z-50 overflow-hidden">
            {RECEIPT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handlePrint(opt.id)}
                className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition text-sm font-medium border-b last:border-b-0"
              >
                <span className="text-lg">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
            {(repair.customer_email || repair.email) && (
              <button
                onClick={handleSendEmail}
                className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-blue-50 transition text-sm font-medium text-blue-700 border-t"
              >
                <span className="text-lg">📧</span>
                Verstuur bon per e-mail
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hidden receipt for printing */}
      {activeReceipt && (
        <div className="hidden receipt-print-area">
          {activeReceipt === "innamebon" && <InnameBon repair={repair} />}
          {activeReceipt === "afhaalbon" && <AfhaalBon repair={repair} />}
          {activeReceipt === "offertebon" && <OfferteBon repair={repair} />}
          {activeReceipt === "werkbon" && <WerkBon repair={repair} />}
          {activeReceipt === "garantiekaart" && <GarantieKaart repair={repair} />}
        </div>
      )}

      {/* Close button when receipt is active (shown on screen after print) */}
      {activeReceipt && (
        <button
          onClick={() => setActiveReceipt(null)}
          className="fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded-full shadow-lg z-50 print:hidden hover:bg-red-600"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
