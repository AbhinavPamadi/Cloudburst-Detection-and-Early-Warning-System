'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Roles } from '@/features/auth/authService';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(Roles.USER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirect = searchParams?.get('redirect') || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login({ email, password, role });
      // Decide landing route based on role if no redirect specified
      if (redirect) {
        router.replace(redirect);
      } else if (user.role === Roles.ADMIN) {
        router.replace('/dashboard');
      } else if (user.role === Roles.NODE_REGISTRAR) {
        router.replace('/register');
      } else {
        router.replace('/contacts');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
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
            Choose a role to preview RBAC behaviour (mock authentication).
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Login form">
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
                className="input-field pl-9"
                placeholder="admin@example.com"
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
                className="input-field pl-9"
                placeholder="Any password (mock)"
                autoComplete="current-password"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input-field"
            >
              <option value={Roles.ADMIN}>Admin</option>
              <option value={Roles.NODE_REGISTRAR}>Node Registrar</option>
              <option value={Roles.USER}>Regular User</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Role controls which pages and actions are visible in the sidebar and dashboard.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          <p className="font-semibold mb-1">Demo roles:</p>
          <ul className="space-y-0.5">
            <li>• <span className="font-medium">Admin</span>: full access except node registration.</li>
            <li>• <span className="font-medium">Node Registrar</span>: exclusive access to Register Node.</li>
            <li>• <span className="font-medium">Regular User</span>: Contacts, Weather, and About pages only.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


