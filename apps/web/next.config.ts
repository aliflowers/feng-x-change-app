import type { NextConfig } from 'next';
import { codeInspectorPlugin } from 'code-inspector-plugin';

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
 turbopack: {
  rules: codeInspectorPlugin({
   bundler: 'turbopack',
   showSwitch: true,
   openIn: 'reuse',
  }) as any,
 },

 webpack: (config, { dev, isServer }) => {
  if (dev && !isServer) {
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
