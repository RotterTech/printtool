"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/SupabaseAuthProvider";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen");
      setLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Wachtwoord moet minimaal 6 tekens lang zijn");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Wait for auth state change event to ensure session is fully established
      return new Promise<void>((resolve) => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
              subscription.unsubscribe();
              
              // Double-check session is available
              const { data: { session: verifiedSession } } = await supabase.auth.getSession();
              
              if (verifiedSession) {
                setSuccess("Account succesvol aangemaakt! Je wordt automatisch ingelogd...");
                setLoading(false);
                
                // Small delay to ensure cookies are set, then redirect
                setTimeout(() => {
                  router.replace("/");
                  resolve();
                }, 100);
              } else {
                setError("Account aangemaakt, maar sessie kon niet worden geverifieerd.");
                setLoading(false);
                resolve();
              }
            } else if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
              // User might need email confirmation
              subscription.unsubscribe();
              setSuccess("Account succesvol aangemaakt! Controleer je email om je account te bevestigen.");
              setLoading(false);
              setTimeout(() => {
                router.replace("/login");
                resolve();
              }, 2000);
            }
          }
        );

        // Fallback timeout in case auth state change doesn't fire
        setTimeout(() => {
          subscription.unsubscribe();
          const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              setSuccess("Account succesvol aangemaakt! Je wordt automatisch ingelogd...");
              setLoading(false);
              router.replace("/");
            } else {
              // Some Supabase projects require email confirmation
              setSuccess("Account succesvol aangemaakt! Controleer je email om je account te bevestigen.");
              setLoading(false);
              setTimeout(() => {
                router.replace("/login");
              }, 2000);
            }
            resolve();
          };
          checkSession();
        }, 2000);
      });
    } catch (err) {
      setError("Er ging iets mis. Probeer het opnieuw.");
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-2 text-center text-gray-900">
          Account aanmaken
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Maak een nieuw account aan om te beginnen
        </p>

        <form onSubmit={handleSignup} className="space-y-6">
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              E-mailadres
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="jouw@email.nl"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#1b796d] focus:border-[#1b796d] outline-none transition-all"
            />
          </div>

          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Minimaal 6 tekens"
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#1b796d] focus:border-[#1b796d] outline-none transition-all"
            />
          </div>

          <div>
            <label 
              htmlFor="confirmPassword" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Bevestig wachtwoord
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Herhaal je wachtwoord"
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#1b796d] focus:border-[#1b796d] outline-none transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1b796d] hover:bg-[#16645b] text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Account aanmaken..." : "Account aanmaken"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Heb je al een account?{" "}
            <Link 
              href="/login" 
              className="text-[#1b796d] hover:text-[#16645b] font-medium"
            >
              → Inloggen
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

