'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

/**
 * Wrap any page that should be protected behind authentication / RBAC.
 *
 * Example:
 * <ProtectedPage allowedRoles={[Roles.ADMIN]}>
 *   <AdminPageContent />
 * </ProtectedPage>
 */
export default function ProtectedPage({
  children,
  allowedRoles,
  fallbackRoute, // optional explicit redirect path
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, initializing, role } = useAuth();

  useEffect(() => {
    if (initializing) return;

    if (!isAuthenticated) {
      const search = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${search}`);
      return;
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      // Role not allowed → send to a sensible default depending on role
      if (fallbackRoute) {
        router.replace(fallbackRoute);
        return;
      }

      if (role === 'USER') {
        router.replace('/contacts');
      } else if (role === 'NODE_REGISTRAR') {
        router.replace('/register');
      } else {
        router.replace('/');
      }
    }
  }, [allowedRoles, fallbackRoute, initializing, isAuthenticated, pathname, role, router]);

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">Checking permissions…</p>
        </div>
      </div>
    );
  }

  // While redirecting, avoid flashing content the user shouldn't see
  if (!isAuthenticated) return null;
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) return null;

  return children;
}




