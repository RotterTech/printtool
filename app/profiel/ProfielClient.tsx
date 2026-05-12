"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, Shield, Mail, Calendar, Save, Loader2, Pencil, Check, X,
} from "lucide-react";
import { toast } from "sonner";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { formatDate } from "@/lib/utils";

interface Profile {
  id: string;
  email: string;
  role: "admin" | "medewerker";
  created_at: string;
  full_name?: string;
}

interface ProfielClientProps {
  currentProfile: Profile;
}

export default function ProfielClient({ currentProfile }: ProfielClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentProfile.full_name || "");
  const [email, setEmail] = useState(currentProfile.email || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: currentProfile.id,
          full_name: name,
          email,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij opslaan");

      toast.success("Profiel bijgewerkt");
      setEditing(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Kon profiel niet opslaan");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(currentProfile.full_name || "");
    setEmail(currentProfile.email || "");
    setEditing(false);
  };

  const initials = (currentProfile.full_name || currentProfile.email || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mijn Profiel</h1>
        <p className="text-sm text-gray-500">Bekijk en bewerk je accountgegevens</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-blue-200 ring-1 ring-blue-100 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-purple-500" />
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600">
              {initials}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-3">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Naam</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Volledige naam"
                      autoFocus
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="E-mailadres"
                    />
                  </div>

                  {/* Role (read-only) */}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <RoleBadge role={currentProfile.role} size="xs" />
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(currentProfile.created_at)}</span>
                  </div>

                  {/* Save / Cancel */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                    >
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Opslaan
                    </button>
                    <button
                      onClick={handleCancel}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <X className="w-3 h-3" /> Annuleren
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-gray-900 truncate">
                      {currentProfile.full_name || "Naamloos"}
                    </span>
                    <RoleBadge role={currentProfile.role} size="xs" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {currentProfile.email}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(currentProfile.created_at)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Edit button */}
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                title="Bewerken"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
