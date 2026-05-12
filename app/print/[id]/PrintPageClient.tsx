"use client";

import { useEffect, useState } from "react";
import { getBrandColor } from "@/lib/config";
import Barcode from "react-barcode";
import { QRCodeCanvas } from "qrcode.react";

interface PrintPageClientProps {
  repair: {
    job_id?: string;
    jobid?: string;
    customer_name?: string;
    klant?: string;
    created_at?: string;
    datum_in?: string;
    problem_description?: string;
    omschrijving?: string;
    device_brand?: string;
    merk?: string;
    device_model?: string;
    model?: string;
    customer_number?: string;
    klantnummer?: string;
    onderdeel_naam?: string;
    onderdeel_leverancier?: string;
    [key: string]: any;
  };
}

export default function PrintPageClient({ repair }: PrintPageClientProps) {
  // Brand color hydration (SSR-safe default, hydrate on client)
  const merk = repair.device_brand || repair.merk || "";
  const defaultBrandColor = getBrandColor(merk);
  const [hydratedBrandColor, setHydratedBrandColor] = useState(defaultBrandColor);

  useEffect(() => {
    try {
      const custom = window?.localStorage?.getItem("brandColors");
      if (custom) {
        const parsed = JSON.parse(custom);
        if (parsed[merk]) {
          setHydratedBrandColor((prev) => ({ ...prev, hex: parsed[merk] }));
        }
      }
    } catch {}
  }, [merk]);

  // 🔍 DEBUG: Log raw repair data to see exact database structure
  console.log("🖨️ RAW REPAIR DATA:", repair);
  console.log("🔍 Available keys:", Object.keys(repair));
  console.log("🔍 customer_name:", repair.customer_name);
  console.log("🔍 device_brand:", repair.device_brand);
  console.log("🔍 problem_description:", repair.problem_description);

  // ✅ Data Normalization: Map SQL columns to usable variables
  const data = {
    jobId: repair.job_id || repair.jobid || "—",
    customerName: (repair.first_name || repair.last_name) ? `${repair.first_name || ""} ${repair.last_name || ""}`.trim() : (repair.customer_name || repair.klant || "—"),
    device: `${repair.device_brand || repair.merk || "—"} ${repair.device_model || repair.model || ""}`.trim(),
    serialNumber: repair.serial_number || "—",
    complaint: repair.problem_description || repair.omschrijving || "—",
    date: (repair.created_at || repair.datum_in)
      ? new Date(repair.created_at || repair.datum_in!).toLocaleDateString("nl-NL")
      : "—",
    customerNumber: repair.customer_number || repair.klantnummer || null,
    partName: repair.onderdeel_naam || null,
    partSupplier: repair.onderdeel_leverancier || null,
  };

  console.log("✅ NORMALIZED DATA:", data);

  // Auto-print when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{`
        @page {
          size: 62mm 100mm;
          margin: 0;
        }

        html, body {
          margin: 0;
          padding: 0;
        }

        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-label {
            box-shadow: none !important;
          }
        }

        @media screen {
          .print-label {
            border: 1px dashed #ccc;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
        }
      `}</style>

      {/* Main Label Container - 62mm x 100mm */}
      <div
        className="print-label"
        style={{
          width: "62mm",
          height: "100mm",
          padding: "0.5rem",
          backgroundColor: "white",
          color: "black",
          fontFamily: "Arial, sans-serif",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          margin: "0 auto",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* Brand Color Bar (links) */}
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "4px",
          background: hydratedBrandColor.hex,
          borderTopLeftRadius: "2px",
          borderBottomLeftRadius: "2px",
          zIndex: 2,
        }} />
        {/* ========== HEADER SECTION: Flex Row with Info + QR ========== */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "0.75rem",
            flex: "0 0 auto",
          }}
        >
          {/* Left Column: 70% - Customer & Job Info */}
          <div style={{ flex: "0 0 70%", lineHeight: "1.2" }}>
            <div style={{ fontSize: "11px" }}>
              <span style={{ fontWeight: "bold" }}>Klant:</span> {data.customerName}
            </div>
            <div style={{ fontSize: "11px" }}>
              <span style={{ fontWeight: "bold" }}>Job:</span> {data.jobId}
            </div>
            {data.customerNumber && (
              <div style={{ fontSize: "11px" }}>
                <span style={{ fontWeight: "bold" }}>Klantnr:</span> {data.customerNumber}
              </div>
            )}
            <div style={{ fontSize: "10px", color: "#555" }}>
              <span style={{ fontWeight: "bold" }}>Device:</span> {data.device}
            </div>
            {data.serialNumber !== "—" && (
              <div style={{ fontSize: "10px", color: "#555" }}>
                <span style={{ fontWeight: "bold" }}>SN:</span> {data.serialNumber}
              </div>
            )}
          </div>

          {/* Right Column: 30% - QR Code */}
          <div
            style={{
              flex: "0 0 30%",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            <div style={{ width: "48px", height: "48px" }}>
              <QRCodeCanvas
                value={data.jobId}
                size={48}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
        </div>

        {/* ========== DETAILS SECTION ========== */}
        <div
          style={{
            flex: "0 0 auto",
            marginBottom: "0.75rem",
            lineHeight: "1.3",
            fontSize: "10px",
          }}
        >
          <div style={{ marginBottom: "2px" }}>
            <span style={{ fontWeight: "bold" }}>Datum:</span> {data.date}
          </div>

          {data.complaint !== "—" && (
            <div style={{ marginBottom: "2px", maxHeight: "24px", overflow: "hidden" }}>
              <span style={{ fontWeight: "bold" }}>Klacht:</span> {data.complaint}
            </div>
          )}

          {data.partName && (
            <div style={{ marginBottom: "2px" }}>
              <span style={{ fontWeight: "bold" }}>Onderdeel:</span> {data.partName}
            </div>
          )}

          {data.partSupplier && (
            <div>
              <span style={{ fontWeight: "bold" }}>Leverancier:</span> {data.partSupplier}
            </div>
          )}
        </div>

        {/* ACCESSOIRES BLOCK */}
        {Array.isArray(repair.accessories) && repair.accessories.length > 0 && (
          <div style={{
            background: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: '4px',
            padding: '4px 8px',
            marginBottom: '4px',
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '10px', color: '#b8860b', marginBottom: '2px' }}>🎒 Meegenomen:</div>
            {repair.accessories.map((acc, idx) => (
              <div key={idx} style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{acc.emoji || '📎'}</span>
                <span style={{ fontWeight: 'bold' }}>{acc.quantity}x</span>
                <span>{acc.label}</span>
                {acc.notes && <span style={{ color: '#888', fontSize: '9px' }}>({acc.notes})</span>}
              </div>
            ))}
          </div>
        )}

        {/* ========== FOOTER SECTION: Barcode ========== */}
        <div
          style={{
            flex: "1",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            marginTop: "auto",
          }}
        >
          <div style={{ width: "100%", textAlign: "center" }}>
            <Barcode
              value={data.jobId}
              width={1.2}
              height={50}
              displayValue={false}
              margin={0}
            />
          </div>
        </div>
      </div>
    </>
  );
}
