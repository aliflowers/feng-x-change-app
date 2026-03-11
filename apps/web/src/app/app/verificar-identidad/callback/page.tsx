'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

type VerificationStatus = 'loading' | 'success' | 'declined' | 'pending';

export default function VerificationCallbackPage() {
 const router = useRouter();
 const [status, setStatus] = useState<VerificationStatus>('loading');
 const [isCheckingManual, setIsCheckingManual] = useState(false);
 const isSyncingRef = useRef(false);

 const checkStatus = useCallback(async (forceSync: boolean = false) => {
  // Si ya hay un sync en progreso, no hacer otra petición
  if (isSyncingRef.current && !forceSync) return false;

  if (forceSync) isSyncingRef.current = true;

  try {
   const response = await fetch(`/api/kyc/status${forceSync ? '?sync=true' : ''}`);
   const data = await response.json();

   console.log('[KYC Callback] Respuesta:', data);

   if (data.is_verified) {
    setStatus('success');
    setTimeout(() => router.push('/app'), 3000);
    return true; // Stop polling
   } else if (data.last_verification?.status === 'declined') {
    setStatus('declined');
    return true; // Stop polling
   }

   return false; // Continue polling
  } catch (error) {
   console.error('Error checking status:', error);
   return false;
  } finally {
   if (forceSync) {
    isSyncingRef.current = false;
    setIsCheckingManual(false);
   }
  }
 }, [router]);

 useEffect(() => {
  let attempts = 0;
  const maxAttempts = 20; // 1 minuto aprox (20 * 3s)

  // Verificar inmediatamente
  checkStatus();

  // Polling interval
  const interval = setInterval(async () => {
   attempts++;
   const shouldStop = await checkStatus();

   if (shouldStop || attempts >= maxAttempts) {
    clearInterval(interval);
    if (attempts >= maxAttempts) {
     setStatus('pending'); // Fallback a pending si timeout
    }
   }
  }, 3000);

  return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const handleManualSync = useCallback(async () => {
  setIsCheckingManual(true);
  setStatus('loading');
  const result = await checkStatus(true);
  // Si no se resolvió tras el sync, volver a pending
  if (!result) {
   setStatus('pending');
  }
 }, [checkStatus]);

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
        onClick={handleManualSync}
        disabled={isCheckingManual}
        className="inline-flex items-center gap-2 bg-[#05294F] hover:bg-[#063a6b] text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
       >
        {isCheckingManual ? 'Sincronizando con Didit...' : 'Verificar estado'}
       </button>
      </>
     )}
    </div>
   </div>
  </div>
 );
}
