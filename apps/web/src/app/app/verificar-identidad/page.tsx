'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, FileCheck, Camera, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function VerificarIdentidadPage() {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const handleStartVerification = async () => {
  setLoading(true);
  setError(null);

  try {
   const response = await fetch('/api/kyc/start', {
    method: 'POST',
   });

   const data = await response.json();

   if (!response.ok) {
    throw new Error(data.error || 'Error al iniciar verificación');
   }

   // Si ya está verificado, ir al dashboard
   if (data.verified) {
    router.push('/app');
    return;
   }

   // Redirigir a Didit
   if (data.verification_url) {
    window.location.href = data.verification_url;
   }
  } catch (err) {
   console.error('Error:', err);
   setError(err instanceof Error ? err.message : 'Error al iniciar verificación');
   setLoading(false);
  }
 };

 return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
   <div className="w-full max-w-lg">
    {/* Card principal */}
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
     {/* Header con icono */}
     <div className="bg-gradient-to-r from-[#05294F] to-[#07478F] p-8 text-center">
      <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4">
       <Shield size={40} className="text-white" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">
       Verificación de Identidad
      </h1>
      <p className="text-white/80 text-sm">
       Por tu seguridad, necesitamos verificar tu identidad
      </p>
     </div>

     {/* Contenido */}
     <div className="p-6 sm:p-8">
      {/* Mensaje amable */}
      <div className="mb-6">
       <p className="text-gray-600 text-center leading-relaxed">
        Para proteger tu cuenta y cumplir con las regulaciones,
        es necesario completar un breve proceso de verificación
        antes de realizar operaciones.
       </p>
      </div>

      {/* Pasos del proceso */}
      <div className="space-y-4 mb-8">
       <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
        ¿Qué necesitarás?
       </h3>

       <div className="space-y-3">
        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
         <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileCheck size={20} className="text-blue-600" />
         </div>
         <div>
          <p className="font-medium text-gray-900">Documento de identidad</p>
          <p className="text-sm text-gray-500">Cédula, pasaporte o licencia vigente</p>
         </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl">
         <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Camera size={20} className="text-amber-600" />
         </div>
         <div>
          <p className="font-medium text-gray-900">Selfie en tiempo real</p>
          <p className="text-sm text-gray-500">Para confirmar que eres tú</p>
         </div>
        </div>
       </div>
      </div>

      {/* Tiempo estimado */}
      <div className="text-center text-sm text-gray-500 mb-6">
       <span className="inline-flex items-center gap-1">
        ⏱️ Tiempo estimado: <strong>2-3 minutos</strong>
       </span>
      </div>

      {/* Error */}
      {error && (
       <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
        <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
        <p className="text-red-600 text-sm">{error}</p>
       </div>
      )}

      {/* Botón de acción */}
      <button
       onClick={handleStartVerification}
       disabled={loading}
       className="w-full bg-gradient-to-r from-[#05294F] to-[#07478F] hover:from-[#063a6b] hover:to-[#0862b0] text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
       {loading ? (
        <>
         <Loader2 size={20} className="animate-spin" />
         Iniciando verificación...
        </>
       ) : (
        <>
         Continuar con la verificación
         <ArrowRight size={20} />
        </>
       )}
      </button>

      {/* Nota de seguridad */}
      <p className="mt-6 text-xs text-gray-400 text-center">
       🔒 Tu información es procesada de forma segura y confidencial
      </p>
     </div>
    </div>

    {/* Link de ayuda */}
    <div className="mt-6 text-center">
     <p className="text-sm text-gray-500">
      ¿Tienes problemas?{' '}
      <a href="mailto:soporte@fengxchange.com" className="text-[#05294F] font-medium hover:underline">
       Contáctanos
      </a>
     </p>
    </div>
   </div>
  </div>
 );
}
