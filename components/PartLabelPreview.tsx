"use client";

import Barcode from "react-barcode";
import { QRCodeCanvas } from "qrcode.react";

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
  const openPrintWindow = () => {
    if (jobId) {
      window.open(`/print/${jobId}`, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* PART LABEL PREVIEW */}
      <div
        className={`border-2 border-gray-300 rounded-md bg-white text-sm leading-relaxed flex flex-col justify-between p-4 ${className}`}
        style={{
          width: "62mm",
          minHeight: "40mm",
          overflow: "visible",
        }}
      >
        <div className="flex-1 space-y-2">
          {jobId && (
            <div className="relative mb-3">
              <QRCodeCanvas
                value={jobId}
                size={40}
                className="absolute top-0 right-0"
              />
            </div>
          )}

          <div>
            <p className="font-bold text-lg">📦 Onderdeel</p>
            <p className="text-base whitespace-normal break-words">{text}</p>
          </div>

          {jobId && (
            <div className="mt-4 pt-2 border-t border-gray-300">
              <p className="text-xs text-gray-600 text-center">Job: {jobId}</p>
            </div>
          )}
        </div>
      </div>

      {/* BARCODE SECTION */}
      {jobId && (
        <div className="bg-gray-100 p-3 rounded-md w-full max-w-xs">
          <div className="flex justify-center">
            <Barcode
              value={jobId}
              format="CODE128"
              width={1.5}
              height={50}
              displayValue={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
