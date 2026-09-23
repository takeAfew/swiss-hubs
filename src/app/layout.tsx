import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Swiss Hubs | Innovation Lead Intelligence',
  description: 'Public intelligence platform tracking founders and early talent from top Swiss hubs (EPFL, ETH Zürich, University of St.Gallen).',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50/50 text-gray-900 antialiased selection:bg-red-500 selection:text-white">
        <main className="max-w-[1700px] mx-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
