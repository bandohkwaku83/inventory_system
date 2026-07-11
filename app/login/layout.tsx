import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className={`${inter.className} antialiased`}>{children}</div>;
}
