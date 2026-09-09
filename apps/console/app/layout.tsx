import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'ConduitX — The Decentralized Agent Data Vending Machine',
  description:
    'AI agents buy blockchain data one query at a time, pay over x402 on Hedera, and publish cryptographic receipts to HCS. The missing market layer for agentic data procurement.',
  icons: {
    icon: '/favicon.ico'
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}>
      <body className="min-h-screen bg-[#07080c] text-[#f0f4f8] font-sans selection:bg-purple-500 selection:text-white flex flex-col">
        {children}
      </body>
    </html>
  );
}
