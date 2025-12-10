// src/features/auth/AuthContext.jsx
"use client";

// Ensure Firebase app is initialized before using auth/firestore APIs
import "@/lib/firebase";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // minimal user { uid, email, displayName, role }
  const [role, setRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    // If a previous flow saved a `currentUser` to localStorage (e.g. hardcoded
    // login that doesn't use Firebase Auth), restore it so the app doesn't
    // immediately redirect to /login while Firebase initializes.
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem("currentUser");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.uid) {
            console.debug(
              "AuthContext: restored user from localStorage",
              parsed
            );
            setUser(parsed);
            setRole(parsed.role || null);
            setIsAuthenticated(true);
            setLoading(false);
          }
        }
      } catch (e) {
        console.warn("AuthContext: failed to parse stored user", e);
      }
    }

    console.debug("AuthContext: subscribing to onAuthStateChanged");

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.debug("AuthContext.onAuthStateChanged fired", {
        uid: fbUser?.uid,
        email: fbUser?.email,
      });
      setLoading(true);
      if (!fbUser) {
        console.debug("AuthContext: user is signed out");
        setUser(null);
        setRole(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // Fetch Firestore user doc to get role + other metadata
      try {
        const db = getFirestore();
        const docRef = doc(db, "users", fbUser.uid);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();
          const normalized = {
            uid: data.uid || fbUser.uid,
            email: data.email || fbUser.email,
            displayName: data.displayName || fbUser.displayName || "",
            photoURL: data.photoURL || fbUser.photoURL || "",
            role: data.role || "USER",
          };
          setUser(normalized);
          setRole(normalized.role);
          setIsAuthenticated(true);
          // persist to localStorage if you want
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              "currentUser",
              JSON.stringify(normalized)
            );
          }
        } else {
          // if no user doc exists (edge case), create one with default USER role
          const userDoc = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || "",
            photoURL: fbUser.photoURL || "",
            role: "USER",
            createdAt: serverTimestamp(),
            lastSeenAt: serverTimestamp(),
          };
          await setDoc(doc(db, "users", fbUser.uid), userDoc);
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || "",
            photoURL: fbUser.photoURL || "",
            role: "USER",
          });
          setRole("USER");
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error("AuthContext: failed to fetch user doc", err);
        setUser({ uid: fbUser.uid, email: fbUser.email });
        setRole(null);
        setIsAuthenticated(true);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const saveUserToStorage = (u) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("currentUser", JSON.stringify(u));
    }
  };

  const logout = async () => {
    try {
      const auth = getAuth();
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Firebase sign out error:", error);
    }
    // clear local storage
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("currentUser");
    }
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);
    // Force redirect to login page
    if (typeof window !== "undefined") {
      import("next/navigation").then(({ useRouter }) => {
        // Use setTimeout to ensure state is updated before redirect
        setTimeout(() => {
          window.location.href = "/login";
        }, 100);
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        loading,
        // some files expect `initializing` name — provide alias to avoid racey redirects
        initializing: loading,
        saveUserToStorage,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}



