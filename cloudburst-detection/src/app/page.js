"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Lock, Mail, User } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import {
  login as doLogin,
  getOrCreateOAuthUser,
} from "@/features/auth/authService";
import { auth, GoogleAuthProvider, signInWithPopup } from "@/lib/firebase";

function GoogleIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M21.35 11.1H12v2.8h5.35c-.23 1.38-1.24 2.55-2.65 3.23v2.68h4.28C20.95 18.3 22 15.95 22 13c0-.7-.07-1.38-.2-2.05z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.97-.9 6.63-2.45l-4.28-2.68c-1.19.8-2.72 1.28-4.35 1.28-3.34 0-6.17-2.25-7.18-5.28H.98v2.86C2.65 19.9 7.9 22 12 22z"
        fill="#34A853"
      />
      <path
        d="M4.82 13.87A7.998 7.998 0 0 1 4.5 12c0-.62.08-1.22.22-1.8V7.34H.98A11.99 11.99 0 0 0 0 12c0 1.92.44 3.73 1.22 5.33l3.6-3.46z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.5c1.47 0 2.8.5 3.84 1.48l2.88-2.88C16.95 2.9 14.7 2 12 2 7.9 2 2.65 4.1.98 7.34l3.74 2.86C5.83 8.75 8.66 6.5 12 6.5z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { saveUserToStorage } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirect = searchParams?.get("redirect") || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Use authService login which handles hardcoded admin/node and Firebase auth users
      const user = await doLogin({ email, password });
      // persist locally
      saveUserToStorage(user);
      // After login, redirect to home page or specified redirect
      if (redirect) {
        router.replace(redirect);
      } else {
        router.replace("/home");
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white/90 dark:bg-gray-900/90 shadow-xl border border-gray-200/80 dark:border-gray-800/80 p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
            <User className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Sign in to Cloudburst
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Sign in with Google or use email + password.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            <AlertCircle
              className="mt-0.5 h-4 w-4 flex-shrink-0"
              aria-hidden="true"
            />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          aria-label="Login form"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-9 text-gray-700 dark:text-gray-200 "
                placeholder="Username"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-9 text-gray-700 dark:text-gray-200"
                placeholder="***********"
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Removed role selector — roles determined by credentials */}

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                setError("");
                try {
                  const provider = new GoogleAuthProvider();
                  const result = await signInWithPopup(auth, provider);
                  const fbUser = result.user;
                  const user = await getOrCreateOAuthUser({
                    email: fbUser.email,
                    displayName: fbUser.displayName || "",
                    photoURL: fbUser.photoURL || "",
                  });
                  saveUserToStorage(user);
                  router.replace("/home");
                } catch (err) {
                  console.error("Google sign-in failed", err);
                  setError(err?.message || "Google sign-in failed");
                } finally {
                  setLoading(false);
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
            >
              <GoogleIcon className="h-4 w-4" />
              Sign in with Google
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <a
              href="/signup"
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
