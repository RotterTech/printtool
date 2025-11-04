"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/SupabaseAuthProvider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Login successful - verify session is available
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && session.user) {
        setSuccess("Succesvol ingelogd! Je wordt doorgestuurd...");
        setLoading(false);
        
        // Immediately redirect to home page
        router.push("/");
      } else {
        // Session not immediately available, wait a moment and retry
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession && retrySession.user) {
            setSuccess("Succesvol ingelogd! Je wordt doorgestuurd...");
            setLoading(false);
            router.push("/");
          } else {
            setError("Inloggen geslaagd, maar sessie kon niet worden opgehaald. Probeer de pagina te vernieuwen.");
            setLoading(false);
          }
        }, 500);
      }
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
          Inloggen
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Log in op je account om verder te gaan
        </p>

        <form onSubmit={handleLogin} className="space-y-6">
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
              placeholder="••••••••"
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
            {loading ? "Bezig met inloggen..." : "Inloggen"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Nog geen account?{" "}
            <Link 
              href="/signup" 
              className="text-[#1b796d] hover:text-[#16645b] font-medium"
            >
              → Maak er een aan
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
