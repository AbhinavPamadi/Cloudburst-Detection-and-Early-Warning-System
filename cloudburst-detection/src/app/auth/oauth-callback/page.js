"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import { getOrCreateOAuthUser } from "@/features/auth/authService";
import { useAuth } from "@/features/auth/AuthContext";

export default function OAuthCallback() {
  const router = useRouter();
  const { saveUserToStorage } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const session = await getSession();
        if (!session || !session.user || !session.user.email) {
          throw new Error("No session found from provider");
        }

        const user = await getOrCreateOAuthUser({
          email: session.user.email,
          displayName: session.user.name || "",
        });

        // persist locally
        saveUserToStorage(user);

        // navigate home
        router.replace("/home");
      } catch (err) {
        console.error("OAuth callback error", err);
        setError(err?.message || "OAuth callback failed");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router, saveUserToStorage]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Signing in...
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  return null;
}
