"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  MemoryStick,
  HardDrive,
  Wifi,
  Battery,
  Monitor,
  Keyboard,
  Cable,
  Cpu,
  Box,
  HelpCircle,
  Gamepad2,
} from "lucide-react";

type Part = {
  id: string;
  category: string;
  brand: string;
  model: string;
  specs: string;
  note?: string;
  status: string;
  created_at: string;
  used_by_client?: string;
  used_in_device?: string;
  used_date?: string;
};

interface UsedPartsTableProps {
  parts: Part[];
}

// Icon mapping for part categories
const PART_ICONS: Record<string, React.ReactNode> = {
  RAM: <MemoryStick size={20} className="text-blue-600" />,
  SSD: <HardDrive size={20} className="text-purple-600" />,
  HDD: <HardDrive size={20} className="text-purple-600" />,
  WiFi: <Wifi size={20} className="text-green-600" />,
  Battery: <Battery size={20} className="text-yellow-600" />,
  Screen: <Monitor size={20} className="text-cyan-600" />,
  Keyboard: <Keyboard size={20} className="text-indigo-600" />,
  Adapter: <Cable size={20} className="text-gray-600" />,
  CPU: <Cpu size={20} className="text-red-600" />,
  GPU: <Gamepad2 size={20} className="text-pink-600" />,
  Motherboard: <Cpu size={20} className="text-red-500" />,
  Overig: <Box size={20} className="text-gray-500" />,
};

export default function UsedPartsTable({ parts }: UsedPartsTableProps) {
  const router = useRouter();

  const getPartId = (id: string) => {
    return id;
  };


  const getCategoryIcon = (category: string) => {
    return PART_ICONS[category] || <HelpCircle size={20} className="text-gray-400" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Gebruikt":
        return (
          <span className="inline-block bg-yellow-100 text-yellow-800 font-semibold text-xs px-3 py-1 rounded-full">
            Gebruikt
          </span>
        );
      default:
        return (
          <span className="inline-block bg-gray-100 text-gray-800 font-semibold text-xs px-3 py-1 rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-300 bg-gray-50">
            <th className="text-left py-3 px-4 font-bold text-gray-700">
              ID
            </th>
            <th className="text-left py-3 px-4 font-bold text-gray-700">
              Categorie
            </th>
            <th className="text-left py-3 px-4 font-bold text-gray-700">
              Specs
            </th>
            <th className="text-left py-3 px-4 font-bold text-gray-700">
              Klant
            </th>
            <th className="text-left py-3 px-4 font-bold text-gray-700">
              Apparaat
            </th>
            <th className="text-left py-3 px-4 font-bold text-gray-700">
              Gebruiksdatum
            </th>
            <th className="text-left py-3 px-4 font-bold text-gray-700">
              Status
            </th>
            <th className="text-center py-3 px-4 font-bold text-gray-700">
              Acties
            </th>
          </tr>
        </thead>
        <tbody>
          {parts.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="py-8 px-4 text-center text-gray-500"
              >
                Geen gebruikte onderdelen gevonden.
              </td>
            </tr>
          ) : (
            parts.map((part) => (
              <tr
                key={part.id}
                className="border-b border-gray-200 hover:bg-yellow-50 transition-colors"
              >
                {/* ID Column - Badge Style */}
                <td className="py-4 px-4">
                  <span className="inline-block bg-blue-100 text-blue-800 font-mono font-bold text-xs px-3 py-1 rounded-full">
                    {getPartId(part.id)}
                  </span>
                </td>

                {/* Category Column - With Icon */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(part.category)}
                    <span className="font-semibold text-gray-900">
                      {part.category || "—"}
                    </span>
                  </div>
                </td>

                {/* Specs Column */}
                <td className="py-4 px-4 text-gray-700">
                  {part.specs || "—"}
                </td>

                {/* Klant (Used By Client) Column */}
                <td className="py-4 px-4">
                  <div className="text-gray-900 font-semibold">
                    {part.used_by_client || "Onbekend"}
                  </div>
                </td>

                {/* Apparaat (Used In Device) Column */}
                <td className="py-4 px-4 text-gray-700">
                  <div className="text-gray-900">
                    {part.used_in_device || "—"}
                  </div>
                </td>

                {/* Gebruiksdatum (Used Date) Column */}
                <td className="py-4 px-4 text-gray-700 text-sm">
                  {formatDate(part.used_date)}
                </td>

                {/* Status Column - Badge */}
                <td className="py-4 px-4">
                  {getStatusBadge(part.status)}
                </td>

                {/* Acties Column - View Only */}
                <td className="py-4 px-4 text-center">
                  <button
                    onClick={() => router.push(`/parts/${part.id}`)}
                    className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
                    title="Details weergeven"
                  >
                    <Eye className="h-4 w-4 text-gray-600" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
