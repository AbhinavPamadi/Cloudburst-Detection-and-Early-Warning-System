"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import { login as localLogin, Roles } from "@/features/auth/authService";

export default function OAuthCallback() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const session = await getSession();
        if (!session || !session.user?.email) {
          throw new Error("No session found");
        }

        // Create a local app user based on Google session
        await localLogin({
          email: session.user.email,
          password: "google-oauth",
          role: Roles.USER,
        });

        // Redirect to home page after OAuth login
        router.replace("/");
      } catch (err) {
        setError(err?.message || "OAuth callback failed");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

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
