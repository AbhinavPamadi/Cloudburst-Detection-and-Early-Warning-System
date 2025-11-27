'use client';

// Simple role enum for clarity
export const Roles = {
  ADMIN: 'ADMIN',
  NODE_REGISTRAR: 'NODE_REGISTRAR',
  USER: 'USER',
};

const STORAGE_KEY = 'cloudburst_auth_user';

// Very lightweight event system so multiple hooks can react to auth changes
let currentUser = null;
const listeners = new Set();

function notify() {
  for (const cb of listeners) {
    try {
      cb(currentUser);
    } catch {
      // ignore
    }
  }
}

export function loadUserFromStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.role) return null;
    currentUser = parsed;
    return currentUser;
  } catch {
    return null;
  }
}

export function saveUserToStorage(user) {
  if (typeof window === 'undefined') return;
  currentUser = user;
  if (user) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  notify();
}

export function getCurrentUser() {
  if (currentUser) return currentUser;
  return loadUserFromStorage();
}

export function subscribeAuth(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Mock login – in real app, replace with API call
export async function login({ email, password, role }) {
  // Very basic validation; password is ignored in mock
  if (!email || !role) {
    throw new Error('Email and role are required');
  }

  if (!Object.values(Roles).includes(role)) {
    throw new Error('Invalid role');
  }

  const user = {
    id: email,
    email,
    role,
    name: email.split('@')[0] || 'User',
  };

  saveUserToStorage(user);
  return user;
}

export async function logout() {
  saveUserToStorage(null);
}



