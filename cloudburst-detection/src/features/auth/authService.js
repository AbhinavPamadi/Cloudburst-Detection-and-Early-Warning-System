// src/features/auth/authService.js
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";

export const Roles = {
  ADMIN: "ADMIN",
  NODE_REGISTRAR: "NODE_REGISTRAR",
  USER: "USER",
};

const RESERVED_ADMIN_EMAIL = "admin@gmail.com";
const RESERVED_NODE_EMAIL = "node@gmail.com";

/**
 * Creates Firebase Auth user and writes a Firestore user doc.
 * Client is only allowed to create USER role (enforced here and in Firestore rules).
 */
export async function registerUser({ email, password, displayName = "" }) {
  const auth = getAuth();
  const db = getFirestore();

  try {
    // Prevent registering the reserved hardcoded accounts
    if (email === RESERVED_ADMIN_EMAIL || email === RESERVED_NODE_EMAIL) {
      throw new Error("This email is reserved and cannot be registered here.");
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    // Update displayName if provided (non-blocking)
    if (displayName) {
      try {
        await updateProfile(user, { displayName });
      } catch (e) {
        console.warn("Profile update failed", e);
      }
    }

    // Firestore user doc with role forced to USER
    const userDoc = {
      uid: user.uid,
      email: email,
      displayName: displayName || user.displayName || "",
      role: Roles.USER,
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    };

    await setDoc(doc(db, "users", user.uid), userDoc);

    // Return a normalized object (no serverTimestamp objects)
    return {
      uid: user.uid,
      email: userDoc.email,
      displayName: userDoc.displayName,
      role: userDoc.role,
    };
  } catch (err) {
    // friendly error mapping
    const code = err?.code || "";
    if (code.includes("auth/email-already-in-use"))
      throw new Error("Email already in use");
    if (code.includes("auth/invalid-email"))
      throw new Error("Invalid email address");
    if (code.includes("auth/weak-password"))
      throw new Error("Password too weak (min 6 chars)");
    throw new Error(err?.message || "Registration failed");
  }
}

/**
 * Login with email/password. Handles hardcoded admin/node accounts by creating
 * a Firebase Auth session so onAuthStateChanged will fire and persist the login.
 */
export async function login({ email, password }) {
  if (!email || !password) throw new Error("Email and password are required");

  const auth = getAuth();
  const db = getFirestore();

  try {
    // First, try to sign in with Firebase Auth
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = cred.user;
    const docRef = doc(db, "users", fbUser.uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        uid: fbUser.uid,
        email: data.email || fbUser.email,
        displayName: data.displayName || fbUser.displayName || "",
        role: data.role || Roles.USER,
      };
    }

    // If user doc missing, create default USER doc
    const userDoc = {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName || "",
      role: Roles.USER,
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    };
    await setDoc(doc(db, "users", fbUser.uid), userDoc);
    return {
      uid: fbUser.uid,
      email: userDoc.email,
      displayName: userDoc.displayName,
      role: userDoc.role,
    };
  } catch (err) {
    const code = err?.code || "";
    if (
      code.includes("auth/user-not-found") ||
      code.includes("auth/wrong-password")
    )
      throw new Error("Invalid email or password");
    throw new Error(err?.message || "Login failed");
  }
}

/**
 * Ensure a user exists in Firestore for OAuth sign-ins (NextAuth / Google).
 * Looks up by email; if not found, creates a new `users` document with role USER.
 * Accepts optional photoURL from Firebase Auth user.
 */
export async function getOrCreateOAuthUser({
  email,
  displayName = "",
  photoURL = "",
}) {
  if (!email) throw new Error("Email is required for OAuth user creation");

  const db = getFirestore();
  try {
    const usersCol = collection(db, "users");
    const q = query(usersCol, where("email", "==", email));
    const snaps = await getDocs(q);

    if (!snaps.empty) {
      const docSnap = snaps.docs[0];
      const data = docSnap.data();

      // Update photoURL if provided and not already stored
      if (photoURL && !data.photoURL) {
        await updateDoc(doc(db, "users", docSnap.id), {
          photoURL: photoURL,
          updatedAt: serverTimestamp(),
        });
      }

      return {
        id: docSnap.id,
        email: data.email,
        displayName: data.displayName || displayName || "",
        photoURL: photoURL || data.photoURL || "",
        role:
          data.role ||
          (email === RESERVED_ADMIN_EMAIL
            ? Roles.ADMIN
            : email === RESERVED_NODE_EMAIL
            ? Roles.NODE_REGISTRAR
            : Roles.USER),
      };
    }

    const assignedRole =
      email === RESERVED_ADMIN_EMAIL
        ? Roles.ADMIN
        : email === RESERVED_NODE_EMAIL
        ? Roles.NODE_REGISTRAR
        : Roles.USER;

    const newUser = {
      email,
      displayName: displayName || "",
      photoURL: photoURL || "",
      role: assignedRole,
      authProvider: "google",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(usersCol, newUser);

    return {
      id: ref.id,
      email: newUser.email,
      displayName: newUser.displayName,
      photoURL: newUser.photoURL,
      role: newUser.role,
    };
  } catch (err) {
    console.error("getOrCreateOAuthUser error", err);
    throw new Error(err?.message || "Failed to create OAuth user");
  }
}
