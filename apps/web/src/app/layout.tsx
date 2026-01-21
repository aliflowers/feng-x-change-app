import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import { CodeInspectorWrapper } from '@/components/CodeInspectorWrapper';

// Configuración de la fuente Montserrat
const montserrat = Montserrat({
 subsets: ['latin'],
 display: 'swap',
 variable: '--font-montserrat',
 weight: ['400', '500', '600', '700', '800', '900'],
});

// Metadata SEO
export const metadata: Metadata = {
 title: {
  default: 'Fengxchange - Cambio de Divisas Rápido y Seguro',
  template: '%s | Fengxchange',
 },
 description:
  'Plataforma Fintech líder en cambio de divisas. Envía dinero de forma rápida, segura y con las mejores tasas. USD, VES, COP, PEN.',
 keywords: [
  'cambio de divisas',
  'envío de dinero',
  'remesas',
  'USD',
  'VES',
  'bolívares',
  'dólares',
  'transferencias',
  'fintech',
  'fengxchange',
 ],
 authors: [{ name: 'Fengxchange' }],
 creator: 'Fengxchange',
 metadataBase: new URL('https://fengxchange.com'),
 openGraph: {
  type: 'website',
  locale: 'es_ES',
  url: 'https://fengxchange.com',
  siteName: 'Fengxchange',
  title: 'Fengxchange - Cambio de Divisas Rápido y Seguro',
  description:
   'Plataforma Fintech líder en cambio de divisas. Envía dinero de forma rápida, segura y con las mejores tasas.',
  images: [
   {
    url: '/og-image.png',
    width: 1200,
    height: 630,
    alt: 'Fengxchange - Cambio de Divisas',
   },
  ],
 },
 twitter: {
  card: 'summary_large_image',
  title: 'Fengxchange - Cambio de Divisas',
  description: 'Envía dinero de forma rápida, segura y con las mejores tasas.',
  images: ['/og-image.png'],
 },
 robots: {
  index: true,
  follow: true,
  googleBot: {
   index: true,
   follow: true,
   'max-video-preview': -1,
   'max-image-preview': 'large',
   'max-snippet': -1,
  },
 },
 manifest: '/manifest.json',
 icons: {
  icon: '/favicon.ico',
  apple: '/apple-touch-icon.png',
 },
};

// Viewport para PWA
export const viewport: Viewport = {
 themeColor: '#AB2820',
 width: 'device-width',
 initialScale: 1,
 maximumScale: 5,
 userScalable: true,
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
  <html lang="es" className={montserrat.variable}>
   <body className="min-h-screen bg-white font-sans antialiased">
    <CodeInspectorWrapper>
     {children}
    </CodeInspectorWrapper>
   </body>
  </html>
 );
}
