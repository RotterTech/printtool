"use client";

import Barcode from "react-barcode";
import { QRCodeCanvas } from "qrcode.react";

type LabelPreviewProps = {
  jobId: string;
  klant: string;
  merk?: string;
  model?: string;
  datum: string;
  email?: string;
  telefoon?: string;
  klantnummer?: string;
  className?: string;
};

export function LabelPreview({
  jobId,
  klant,
  merk,
  model,
  datum,
  email,
  telefoon,
  klantnummer,
  className = "",
}: LabelPreviewProps) {
  return (
    <div className={`border border-gray-300 rounded-md w-[280px] h-[160px] p-3 text-sm leading-relaxed relative bg-white ${className}`}>
      <QRCodeCanvas
        value={jobId}
        size={40}
        className="absolute top-2 right-2"
      />

      <p>
        <strong>Klant:</strong> {klant || "—"}
      </p>
      <p>
        <strong>Job:</strong> {jobId}
      </p>
      {klantnummer && (
        <p>
          <strong>Klantnr:</strong> {klantnummer}
        </p>
      )}
      <p>
        {merk && `${merk} ${model || ""}`.trim()}
      </p>
      <p>
        <strong>Datum:</strong>{" "}
        {new Date(datum).toLocaleString("nl-NL")}
      </p>

      {/* Contact (kleinere font) */}
      <div className="text-[10px] mt-1 leading-tight">
        {email && <p>E: {email}</p>}
        {telefoon && <p>T: {telefoon}</p>}
      </div>

      {/* Barcode onderaan */}
      <Barcode
        value={jobId}
        width={1.2}
        height={40}
        displayValue={false}
        className="absolute bottom-2 left-1/2 -translate-x-1/2"
      />
    </div>
  );
}

type PartLabelPreviewProps = {
  text: string;
  jobId?: string;
  className?: string;
};

export function PartLabelPreview({
  text,
  jobId,
  className = "",
}: PartLabelPreviewProps) {
  return (
    <div className={`border border-gray-300 rounded-md w-[280px] h-[120px] p-3 text-sm leading-relaxed relative flex flex-col items-center justify-center bg-white ${className}`}>
      <p className="text-center font-medium text-base">{text}</p>
      {jobId && (
        <>
          <div className="mt-2">
            <QRCodeCanvas value={jobId} size={30} />
          </div>
          <div className="mt-1">
            <Barcode
              value={jobId}
              width={1}
              height={30}
              displayValue={false}
            />
          </div>
        </>
      )}
    </div>
  );
}

