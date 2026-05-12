"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/SupabaseAuthProvider";
import { COMPANY, TRIAL } from "@/lib/config";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Trial config from central config
  const TRIAL_DAYS = TRIAL.durationDays;
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);

  // Show form after a short delay even if authLoading is still true
  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowForm(true);
    }, 500);
    return () => clearTimeout(timeout);
  }, []);

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

    // Validate terms accepted
    if (!acceptedTerms) {
      setError("Je moet akkoord gaan met de voorwaarden");
      setLoading(false);
      return;
    }

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
      // Calculate trial end date
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            company_name: companyName,
            trial_started: new Date().toISOString(),
            trial_ends: trialEnd.toISOString(),
            is_trial: true,
            plan: "trial",
          }
        }
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Create company in database
      if (data?.user) {
        try {
          const companyRes = await fetch("/api/admin/create-company", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: data.user.id,
              companyName: companyName,
              email: email,
            }),
          });
          
          if (!companyRes.ok) {
            console.error("Failed to create company, but user created");
          } else {
            console.log("✅ Company created successfully");
          }
        } catch (companyErr) {
          console.error("Error creating company:", companyErr);
        }
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

  if (authLoading && !showForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Laden...</div>
      </div>
    );
  }

  // If user is logged in, don't show form (will redirect soon)
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Je bent al ingelogd, doorsturen...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 p-4">
      <div className="w-full max-w-lg">
        {/* Trial Banner */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-2xl px-6 py-4 text-center shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl">🎉</span>
            <h2 className="text-xl font-bold">Probeer {TRIAL_DAYS} dagen GRATIS!</h2>
            <span className="text-2xl">🎉</span>
          </div>
          <p className="text-green-100 text-sm">
            Geen creditcard nodig • Direct toegang • Annuleer wanneer je wilt
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-b-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold mb-1 text-center text-gray-900">
            Start je gratis proefperiode
          </h1>
          <p className="text-gray-500 text-center mb-6 text-sm">
            Krijg volledige toegang tot alle functies
          </p>

          {/* Features List */}
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-3 text-sm">✨ Wat je krijgt:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {TRIAL.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-blue-800">
                  <span className="text-green-500">✓</span> {feature}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Company Name */}
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                🏢 Bedrijfsnaam
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Jouw Reparatiebedrijf"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                📧 E-mailadres *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="jouw@email.nl"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                🔒 Wachtwoord *
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Minimaal 6 tekens"
                minLength={6}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                🔒 Bevestig wachtwoord *
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Herhaal je wachtwoord"
                minLength={6}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                Ik ga akkoord met de proefperiode voorwaarden. Na {TRIAL_DAYS} dagen wordt mijn account{" "}
                <span className="font-semibold text-orange-600">automatisch verwijderd</span>{" "}
                tenzij ik een betaald abonnement neem.
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                ❌ {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                ✅ {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Account aanmaken...
                </span>
              ) : (
                <>🚀 Start {TRIAL_DAYS} dagen gratis proefperiode</>
              )}
            </button>

            {/* Trial Info */}
            <div className="text-center text-xs text-gray-500 mt-2">
              <p>Je proefperiode eindigt op <strong>{trialEndDate.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}</strong></p>
            </div>
          </form>

          <div className="mt-6 text-center border-t pt-6">
            <p className="text-gray-600 text-sm">
              Heb je al een account?{" "}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                → Inloggen
              </Link>
            </p>
          </div>
        </div>

        {/* Trust Badge */}
        <div className="text-center mt-4 text-blue-200 text-sm">
          <p> Veilig & Beveiligd • 🇳🇱 Nederlands • 💬 Persoonlijke Support</p>
        </div>
      </div>
    </div>
  );
}

