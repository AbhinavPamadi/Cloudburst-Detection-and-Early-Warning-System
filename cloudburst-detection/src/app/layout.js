// src/app/layout.js
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { AuthProvider } from '@/features/auth/AuthContext';
import AppShell from '@/components/AppShell';

export const metadata = {
  title: 'Cloudburst Detection System | SIH 2025',
  description: 'Early Warning System for Flash Flood Prevention',
};

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}