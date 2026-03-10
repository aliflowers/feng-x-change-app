import type { NextConfig } from 'next';
import { codeInspectorPlugin } from 'code-inspector-plugin';

// Desactivar Code Inspector al usar túneles (ngrok) o acceso externo
const isCodeInspectorEnabled = !process.env.DISABLE_CODE_INSPECTOR;

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

 // Configuración de Code Inspector para Turbopack y Webpack
 // Se desactiva con DISABLE_CODE_INSPECTOR=true (ej. al usar ngrok)
 ...(isCodeInspectorEnabled
  ? {
   turbopack: {
    rules: codeInspectorPlugin({
     bundler: 'turbopack',
     showSwitch: true,
     openIn: 'reuse',
    }) as any,
   },
  }
  : {}),

 webpack: (config, { dev, isServer }) => {
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
