"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Users,
  Mail,
  Calendar,
  Shield,
  User,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
} from "lucide-react";
import InviteUserModal from "@/components/InviteUserModal";
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

interface TeamManagementSectionProps {
  profiles: Profile[];
  currentUserId: string;
  currentUserRole: "admin" | "medewerker";
}

export default function TeamManagementSection({
  profiles,
  currentUserId,
  currentUserRole,
}: TeamManagementSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "medewerker">("medewerker");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    toast.success("Gebruiker succesvol aangemaakt!");
    router.refresh();
  };

  const startEdit = (profile: Profile) => {
    setEditingUserId(profile.id);
    setEditName(profile.full_name || "");
    setEditEmail(profile.email || "");
    setEditRole(profile.role);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
  };

  const handleSaveEdit = async (profileId: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: profileId,
          full_name: editName,
          email: editEmail,
          role: editRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij opslaan");
      toast.success("Profiel bijgewerkt");
      setEditingUserId(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Kon profiel niet opslaan");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Weet je zeker dat je deze gebruiker wilt verwijderen?")) {
      return;
    }

    setDeletingUserId(userId);

    try {
      const response = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast.success("Gebruiker verwijderd");
        router.refresh();
      } else {
        toast.error("Fout bij het verwijderen van gebruiker");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Fout bij het verwijderen van gebruiker");
    } finally {
      setDeletingUserId(null);
    }
  };

  const canEditUser = (targetUser: Profile) => {
    if (currentUserRole !== "admin") return false;
    if (targetUser.id === currentUserId) return false;
    return true;
  };

  const canDeleteUser = (targetUser: Profile) => {
    if (currentUserRole !== "admin") return false;
    if (targetUser.role === "admin") return false;
    if (targetUser.id === currentUserId) return false;
    return true;
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Team Beheer</h2>
            <p className="text-gray-600 mt-1">
              {profiles.length} teamlid{profiles.length !== 1 ? "en" : ""}
            </p>
          </div>

          {/* Invite Button */}
          {currentUserRole === "admin" && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <UserPlus className="w-4 h-4" />
              Uitnodigen
            </button>
          )}
        </div>

        {/* Team Members List */}
        <div className="space-y-3">
          {profiles.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-lg">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Geen teamleden gevonden</p>
            </div>
          ) : (
            profiles.map((profile) => {
              const isEditing = editingUserId === profile.id;
              const isSelf = profile.id === currentUserId;

              return (
                <div
                  key={profile.id}
                  className={`p-4 bg-white border rounded-lg transition-colors ${isSelf ? "border-blue-200" : "border-gray-200 hover:border-gray-300"}`}
                >
                  {isEditing ? (
                    /* --- Edit Mode --- */
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {(editName || profile.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-0.5">Naam</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Volledige naam"
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-0.5">E-mail</label>
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="E-mailadres"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Role selector */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Rol</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditRole("medewerker")}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              editRole === "medewerker"
                                ? "bg-blue-100 text-blue-800 border-blue-300"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            Medewerker
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditRole("admin")}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              editRole === "admin"
                                ? "bg-purple-100 text-purple-800 border-purple-300"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            Admin
                          </button>
                        </div>
                      </div>

                      {/* Save / Cancel */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(profile.id)}
                          disabled={saving}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                        >
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Opslaan
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <X className="w-3 h-3" /> Annuleren
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* --- View Mode --- */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${isSelf ? "bg-gradient-to-br from-blue-500 to-purple-600" : "bg-gradient-to-br from-blue-500 to-purple-600"}`}>
                          {(profile.full_name || profile.email || "?").charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-medium text-gray-900">
                              {profile.full_name || "Naamloos"}
                            </p>
                            <RoleBadge role={profile.role} size="xs" />
                            {isSelf && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">JIJ</span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {profile.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(profile.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {canEditUser(profile) && (
                          <button
                            onClick={() => startEdit(profile)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Bewerken"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDeleteUser(profile) && (
                          <button
                            onClick={() => handleDeleteUser(profile.id)}
                            disabled={deletingUserId === profile.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Gebruiker verwijderen"
                          >
                            {deletingUserId === profile.id ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Invite Modal */}
      <InviteUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
