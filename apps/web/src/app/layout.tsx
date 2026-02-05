import type { Metadata } from 'next';
import { Titillium_Web } from 'next/font/google';
import './globals.css';

const titillium = Titillium_Web({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Mobility Platform',
  description: 'Rent cars, book experiences, or hire a driver.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={titillium.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
