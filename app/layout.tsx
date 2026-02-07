import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import ThemeRegistry from "./components/ThemeRegistry";
import LoaderProvider from "./components/LoaderProvider";
import { AuthProvider } from "./context/AuthContext";
import { ProductsProvider } from "./context/ProductsContext";

const lato = Lato({
  weight: ['300', '400', '700'],
  subsets: ["latin"],
  variable: "--font-lato",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Inventory System",
  description: "Inventory management for shops and supermarkets",
};

export const viewport: Viewport = {
  width: "device-width",
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
      <body
        className={`${lato.variable} font-sans antialiased`}
      >
        <ThemeRegistry>
          <AuthProvider>
            <ProductsProvider>
              <LoaderProvider>{children}</LoaderProvider>
            </ProductsProvider>
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
