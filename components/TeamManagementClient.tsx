"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Users, Mail, Calendar, Shield, User } from "lucide-react";
import InviteUserModal from "@/components/InviteUserModal";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { formatDate } from "@/lib/utils";

interface Profile {
  id: string;
  email: string;
  role: "admin" | "medewerker";
  created_at: string;
  full_name?: string;
}

interface TeamManagementClientProps {
  profiles: Profile[];
}

export default function TeamManagementClient({
  profiles,
}: TeamManagementClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
    router.refresh(); // Refresh to show new user
  };

  return (
    <>
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Gebruiker succesvol aangemaakt!
        </div>
      )}

      {/* Team Beheer Card */}
      <div className="bg-white rounded-lg shadow">
        {/* Card Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Team Beheer
                </h2>
                <p className="text-sm text-gray-600">
                  {profiles.length} teamlid{profiles.length !== 1 ? "en" : ""}
                </p>
              </div>
            </div>

            {/* Invite Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <UserPlus className="w-4 h-4" />
              Nieuwe Medewerker Uitnodigen
            </button>
          </div>
        </div>

        {/* Team Members List */}
        <div className="divide-y divide-gray-200">
          {profiles.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Geen teamleden gevonden</p>
            </div>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  {/* User Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {profile.email?.charAt(0).toUpperCase() || "?"}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">
                          {profile.full_name || "Naamloos"}
                        </p>
                        <RoleBadge role={profile.role} size="xs" />
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {profile.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Lid sinds {formatDate(profile.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Placeholder */}
                  <div className="flex items-center gap-2">
                    {/* Future: Edit/Remove buttons */}
                  </div>
                </div>
              </div>
            ))
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
