'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

type VerificationStatus = 'loading' | 'success' | 'declined' | 'pending';

export default function VerificationCallbackPage() {
 const router = useRouter();
 const [status, setStatus] = useState<VerificationStatus>('loading');

 useEffect(() => {
  let attempts = 0;
  const maxAttempts = 20; // 1 minuto aprox (20 * 3s)

  const checkStatus = async () => {
   try {
    const response = await fetch('/api/kyc/status');
    const data = await response.json();

    if (data.is_verified) {
     setStatus('success');
     setTimeout(() => router.push('/app'), 3000);
     return true; // Stop polling
    } else if (data.last_verification?.status === 'declined') {
     setStatus('declined');
     return true; // Stop polling
    }

    // Si el query param dice Approved pero la BD aún no, seguimos intentando
    const searchParams = new URLSearchParams(window.location.search);
    const urlStatus = searchParams.get('status');
    if (urlStatus === 'Approved') {
     // Opcional: Podríamos mostrar un estado "Finalizando..."
    }

    return false; // Continue polling
   } catch (error) {
    console.error('Error checking status:', error);
    return false;
   }
  };

  // Verificar inmediatamente
  checkStatus();

  // Polling interval
  const interval = setInterval(async () => {
   attempts++;
   const shouldStop = await checkStatus();

   if (shouldStop || attempts >= maxAttempts) {
    clearInterval(interval);
    if (attempts >= maxAttempts && status === 'loading') {
     setStatus('pending'); // Fallback a pending si timeout
    }
   }
  }, 3000);

  return () => clearInterval(interval);
 }, [router, status]);

 return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
   <div className="w-full max-w-md">
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">

     {status === 'loading' && (
      <>
       <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Loader2 size={40} className="text-blue-600 animate-spin" />
       </div>
       <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Procesando verificación
       </h1>
       <p className="text-gray-500">
        Estamos verificando tu información...
       </p>
      </>
     )}

     {status === 'success' && (
      <>
       <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={40} className="text-green-600" />
       </div>
       <h1 className="text-2xl font-bold text-gray-900 mb-2">
        ¡Verificación exitosa!
       </h1>
       <p className="text-gray-500 mb-6">
        Tu identidad ha sido verificada correctamente.
        Serás redirigido automáticamente...
       </p>
       <button
        onClick={() => router.push('/app')}
        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-xl transition-colors"
       >
        Ir al inicio
        <ArrowRight size={18} />
       </button>
      </>
     )}

     {status === 'declined' && (
      <>
       <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <XCircle size={40} className="text-red-600" />
       </div>
       <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Verificación no aprobada
       </h1>
       <p className="text-gray-500 mb-6">
        Tu verificación no pudo ser completada.
        Por favor, intenta nuevamente asegurándote de:
       </p>
       <ul className="text-left text-sm text-gray-600 mb-6 space-y-2">
        <li>• Usar un documento válido y vigente</li>
        <li>• Tomar la foto con buena iluminación</li>
        <li>• Asegurar que tu rostro sea visible</li>
       </ul>
       <button
        onClick={() => router.push('/app/verificar-identidad')}
        className="inline-flex items-center gap-2 bg-[#05294F] hover:bg-[#063a6b] text-white font-medium px-6 py-3 rounded-xl transition-colors"
       >
        Intentar de nuevo
        <ArrowRight size={18} />
       </button>
      </>
     )}

     {status === 'pending' && (
      <>
       <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Loader2 size={40} className="text-amber-600 animate-spin" />
       </div>
       <h1 className="text-2xl font-bold text-gray-900 mb-2">
        En revisión
       </h1>
       <p className="text-gray-500 mb-6">
        Tu verificación está siendo procesada.
        Esto puede tomar unos minutos.
       </p>
       <button
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors"
       >
        Verificar estado
       </button>
      </>
     )}
    </div>
   </div>
  </div>
 );
}
