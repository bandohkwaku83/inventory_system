import type { Metadata, Viewport } from 'next';
import { Lato } from 'next/font/google';
import './globals.css';
import ThemeRegistry from './components/ThemeRegistry';
import LoaderProvider from './components/LoaderProvider';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { UsersProvider } from './context/UsersContext';
import { AppProviders } from './components/AppProviders';

const lato = Lato({
  weight: ['300', '400', '700'],
  subsets: ['latin'],
  variable: '--font-lato',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Onyx Build & Partners Limited',
  description: 'Inventory management for Onyx Build & Partners Limited',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${lato.variable} font-sans antialiased`}>
        <ThemeRegistry>
          <AuthProvider>
            <LoaderProvider>
              <SettingsProvider>
                <UsersProvider>
                  <AppProviders>{children}</AppProviders>
                </UsersProvider>
              </SettingsProvider>
            </LoaderProvider>
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
