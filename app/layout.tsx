import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'Investment Calculator — Compound Interest & Portfolio Tracker',
  description:
    'Free compound interest calculator and investment portfolio tracker. See exactly how your money grows over time with our interactive investment returns calculator.',
  metadataBase: new URL('https://investment-calculator-three-pi.vercel.app'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Investment Calculator — Compound Interest & Portfolio Tracker',
    description:
      'Free compound interest calculator. Visualize your investment growth and track your portfolio.',
    url: 'https://investment-calculator-three-pi.vercel.app',
    siteName: 'InvestCalc',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Investment Calculator — Compound Interest & Portfolio Tracker',
    description:
      'Free compound interest calculator and portfolio tracker. See how your money grows.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>{children}</body>
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2607428575036247"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
    </html>
  );
}
