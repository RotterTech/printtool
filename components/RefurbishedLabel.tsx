'use client';

import Image from 'next/image';

export interface RefurbishedData {
  brand: string;      // e.g. "HP"
  model: string;      // e.g. "Elitebook 840 G3"
  cpu: string;        // e.g. "Intel Core i5-7300U"
  ram: string;        // e.g. "8GB DDR4"
  ssd: string;        // e.g. "256GB SSD"
  screen: string;     // e.g. "14 inch Full HD"
  graphics: string;   // e.g. "Intel HD Graphics"
  ports: string[];    // Array e.g. ["USB-C", "HDMI", "VGA"]
  os: string;         // e.g. "Windows 11 Pro"
  price: string;      // e.g. "150,-"
  origin?: string;    // e.g. "donatie", "inkoop", "interne_refurb"
}

interface RefurbishedLabelProps {
  data: RefurbishedData;
  origin?: string;
}

export default function RefurbishedLabel({ data, origin }: RefurbishedLabelProps) {
  const portsText = data.ports.join(' / ');
  
  // Format origin for display
  const formatOrigin = (originKey?: string): string => {
    if (!originKey) return '';
    const originMap: Record<string, string> = {
      'donatie': 'Donatie',
      'inkoop': 'Inkoop',
      'interne_refurb': 'Interne Refurb',
    };
    return originMap[originKey] || originKey;
  };

  return (
    <div id="label-print-area" className="w-[62mm] min-h-[50mm] bg-white text-black p-2 flex flex-col relative font-sans border border-gray-300 shadow-sm overflow-hidden">
            {/* Print Styles - Critical fix for blank page issue */}
        <style type="text/css" media="print">{`
           @page {
            size: 62mm auto;
            margin: 0;
            margin-left: 3mm;
            padding: 0;
          }
          
          /* 1. Hide the whole page */
          body {
            visibility: hidden;
            margin: 0;
            padding: 0;
          }
          
          /* 2. Target the label specifically using the ID */
          #label-print-area {
            visibility: visible !important;
            position: fixed;
            left: 0 !important;
            top: 0;
            width: 62mm !important;
            height: auto;
            margin: 0 !important;
            padding: 6px 0 18px 0 !important;
            z-index: 9999;
            background: white;
            box-sizing: border-box;
            transform: none !important;
          }
          
          /* 3. Make sure all children inside are also visible */
          #label-print-area * {
            visibility: visible !important;
          }
          
          /* 4. Prevent scaling issues at 300x600 dpi */
          html, body {
            width: 62mm;
            height: auto;
            overflow: visible;
          }
        `}</style>

      {/* Logo - Top Right */}
      <div className="absolute top-2 right-2 w-20 h-8">
        <Image
          src="/logo.png"
          alt="DDKM Logo"
          width={80}
          height={32}
          priority
          className="w-full h-full object-contain"
        />
      </div>

      {/* Header: Brand + Model */}
      <div className="mb-2 pr-10">
        <h1 className="text-[0.9rem] font-bold leading-tight">
          {data.brand}
        </h1>
        <h2 className="text-[0.9rem] font-semibold leading-tight text-gray-700">
          {data.model}
        </h2>
      </div>

      {/* Body: Specs Grid */}
      <div className="flex-1 mb-2 text-[0.9rem] leading-tight grid grid-cols-[72px_1fr] gap-y-1 gap-x-1">
        <div className="font-bold uppercase text-[0.9rem]">CPU:</div>
        <div className="text-[0.9rem] font-medium">{data.cpu}</div>

        <div className="font-bold uppercase text-[0.9rem]">RAM:</div>
        <div className="text-[0.9rem] font-medium">{data.ram}</div>

        <div className="font-bold uppercase text-[0.9rem]">SSD:</div>
        <div className="text-[0.9rem] font-medium">{data.ssd}</div>

        <div className="font-bold uppercase text-[0.9rem]">GPU:</div>
        <div className="text-[0.9rem] font-medium">{data.graphics}</div>

        <div className="font-bold uppercase text-[0.9rem]">LCD:</div>
        <div className="text-[0.9rem] font-medium">{data.screen}</div>

        <div className="font-bold uppercase text-[0.9rem]">OS:</div>
        <div className="text-[0.9rem] font-medium">{data.os}</div>

        <div className="font-bold uppercase text-[0.9rem]">Poorten:</div>
        <div className="text-[0.9rem] font-medium">{portsText}</div>

        {origin && (
          <>
            <div className="font-bold uppercase text-[0.9rem]">Bron:</div>
            <div className="text-[0.9rem] font-medium">{formatOrigin(origin)}</div>
          </>
        )}
      </div>

      {/* Footer: Warranty + Price */}
      <div className="border-t border-gray-300 pt-1 mb-1 flex justify-between items-baseline">
        <div className="text-[0.9rem] font-semibold text-gray-800">
          1 Jaar Garantie
        </div>
        <div className="text-right">
          <div className="text-base font-bold text-black">
            € {data.price}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-[0.9rem] text-gray-700 text-center leading-tight font-medium">
        incl. 30 min. software overzetten
      </div>
    </div>
  );
}
