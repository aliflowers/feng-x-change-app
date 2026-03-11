'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Mail, ArrowRight, Shield, Zap, Globe } from 'lucide-react';

interface BusinessConfig {
 business_name: string;
 logo_url: string;
}

export default function ForgotPasswordPage() {
 const [email, setEmail] = useState('');
 const [error, setError] = useState<string | null>(null);
 const [message, setMessage] = useState<string | null>(null);
 const [loading, setLoading] = useState(false);
 const [businessConfig, setBusinessConfig] = useState<BusinessConfig>({
  business_name: 'Fengxchange',
  logo_url: '',
 });

 useEffect(() => {
  const loadBusinessConfig = async () => {
   try {
    const response = await fetch('/api/public/business');
    if (response.ok) {
     const data = await response.json();
     if (data.info) {
      setBusinessConfig({
       business_name: data.info.business_name || 'Fengxchange',
       logo_url: data.info.logo_url || '',
      });
     }
    }
   } catch (error) {
    console.error('Error loading business config:', error);
   }
  };
  loadBusinessConfig();
 }, []);

 const handleReset = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setMessage(null);
  setLoading(true);

  try {
   const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
   });

   if (resetError) {
    setError(resetError.message);
   } else {
    setMessage('Si el correo existe, recibirás un enlace para reestablecer tu contraseña.');
    setEmail('');
   }
  } catch (err) {
   console.error(err);
   setError('Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo más tarde.');
  } finally {
   setLoading(false);
  }
 };

 return (
  <main className="min-h-screen flex">
   {/* Panel Izquierdo - Branding */}
   <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#05294F] via-[#07478F] to-[#0a5cb8] relative overflow-hidden">
    {/* Decoraciones de fondo */}
    <div className="absolute inset-0 opacity-10">
     <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
     <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-400 rounded-full blur-3xl"></div>
    </div>

    {/* Contenido */}
    <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
     {/* Logo */}
     <Link href="/" className="mb-12 no-underline">
      {businessConfig.logo_url ? (
       <img
        src={businessConfig.logo_url}
        alt={businessConfig.business_name}
        className="h-16 w-auto object-contain"
       />
      ) : (
       <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
        <span className="text-white font-bold text-2xl">{businessConfig.business_name.charAt(0)}</span>
       </div>
      )}
     </Link>

     {/* Título principal */}
     <h1 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
      Recupera el acceso a tu plataforma de
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400"> cambio de divisas</span>
     </h1>

     <p className="text-white/70 text-lg mb-12 max-w-md">
      Ingresa tu correo electrónico asociado a tu cuenta para restaurar tu contraseña y volver a usar nuestros servicios.
     </p>

     {/* Features */}
     <div className="space-y-4">
      {[
       { icon: Shield, text: 'Recuperación 100% segura' },
       { icon: Zap, text: 'Rápido y sencillo' },
       { icon: Globe, text: 'Acceso en todo momento' },
      ].map((feature, i) => (
       <div key={i} className="flex items-center gap-4 text-white/80">
        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
         <feature.icon size={20} className="text-amber-400" />
        </div>
        <span>{feature.text}</span>
       </div>
      ))}
     </div>
    </div>
   </div>

   {/* Panel Derecho - Formulario */}
   <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-gradient-to-br from-slate-50 to-blue-50">
    <div className="w-full max-w-md">
     {/* Logo móvil */}
     <div className="lg:hidden text-center mb-8">
      <Link href="/" className="inline-block no-underline">
       {businessConfig.logo_url ? (
        <img
         src={businessConfig.logo_url}
         alt={businessConfig.business_name}
         className="h-14 w-auto object-contain"
        />
       ) : (
        <div className="w-14 h-14 bg-gradient-to-br from-[#05294F] to-[#07478F] rounded-xl flex items-center justify-center mx-auto">
         <span className="text-white font-bold text-xl">{businessConfig.business_name.charAt(0)}</span>
        </div>
       )}
      </Link>
     </div>

     {/* Título del formulario */}
     <div className="text-center lg:text-left mb-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
       Recuperar Contraseña
      </h2>
      <p className="text-gray-500">
       Ingresa el correo electrónico asociado a tu cuenta.
      </p>
     </div>

     {/* Card de formulario */}
     <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
      <form onSubmit={handleReset} className="space-y-5">
       {/* Messages */}
       {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-3">
         <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-red-500">!</span>
         </div>
         {error}
        </div>
       )}

       {message && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-3">
         <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-green-600">✓</span>
         </div>
         {message}
        </div>
       )}

       {/* Email */}
       <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
         Correo electrónico
        </label>
        <div className="relative">
         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <Mail size={20} />
         </div>
         <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 pl-12 text-gray-900 focus:ring-2 focus:ring-[#05294F] focus:border-transparent transition-all"
          placeholder="tu@email.com"
          required
         />
        </div>
       </div>

       {/* Submit */}
       <button
        type="submit"
        disabled={loading || !!message}
        className="w-full bg-gradient-to-r from-[#05294F] to-[#07478F] hover:from-[#063a6b] hover:to-[#0862b0] text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
       >
        {loading ? (
         <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Enviando correo...
         </span>
        ) : (
         <>
          Recuperar Contraseña
         </>
        )}
       </button>
      </form>
     </div>

     {/* Volver */}
     <div className="mt-8 text-center">
      <Link href="/login" className="inline-flex items-center gap-2 text-gray-500 text-sm hover:text-gray-700 transition-colors no-underline">
       <ArrowRight size={16} className="rotate-180" />
       Volver al inicio de sesión
      </Link>
     </div>
    </div>
   </div>
  </main>
 );
}
