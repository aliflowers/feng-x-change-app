import type { NextConfig } from 'next';
import { codeInspectorPlugin } from 'code-inspector-plugin';

// Desactivar Code Inspector al usar túneles (ngrok) o acceso externo
const isCodeInspectorEnabled = process.env.DISABLE_CODE_INSPECTOR !== 'true';
const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
 // Habilitar modo estricto de React
 reactStrictMode: true,

 // Configuración de imágenes
 images: {
  remotePatterns: [
   {
    protocol: 'https',
    hostname: 'kltdktiqliipphcbtjfp.supabase.co',
    pathname: '/storage/v1/object/public/**',
   },
  ],
 },

 // Turbopack config (siempre presente para Next.js 16)
 // Code Inspector solo en desarrollo
 ...(isCodeInspectorEnabled && !isProduction
  ? {
   turbopack: {
    rules: codeInspectorPlugin({
     bundler: 'turbopack',
     showSwitch: true,
     openIn: 'reuse',
    }) as any,
   },
  }
  : { turbopack: {} }),

 // Webpack solo en desarrollo (Code Inspector plugin)
 ...(!isProduction
  ? {
   webpack: (config: any, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
    if (dev && !isServer && isCodeInspectorEnabled) {
     config.plugins.push(
      codeInspectorPlugin({
       bundler: 'webpack',
       exclude: [/node_modules/, /.next/],
       showSwitch: true,
       openIn: 'reuse',
       printServer: true,
      })
     );
    }
    return config;
   },
  }
  : {}),

 // Transpilación del paquete compartido
 transpilePackages: ['@fengxchange/shared'],

 // Headers de seguridad
 async headers() {
  return [
   {
    source: '/(.*)',
    headers: [
     {
      key: 'X-Frame-Options',
      value: 'DENY',
     },
     {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
     },
     {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
     },
    ],
   },
  ];
 },
};

export default nextConfig;
