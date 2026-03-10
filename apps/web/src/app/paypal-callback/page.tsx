'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

function PaypalCallbackContent() {
 const searchParams = useSearchParams();
 const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
 const [message, setMessage] = useState('Verificando tu cuenta PayPal...');
 const processedCode = useRef<string | null>(null);

 // Helper: send result through ALL available channels
 const sendResult = (result: Record<string, unknown>) => {
  const json = JSON.stringify(result);
  // Channel 1: localStorage
  try { localStorage.setItem('paypal_identity_result', json); } catch { /* ignore */ }
  // Channel 2: postMessage to opener
  try { window.opener?.postMessage({ type: 'paypal-identity', ...result }, '*'); } catch { /* ignore */ }
  // Channel 3: cookie (most reliable cross-window)
  try { document.cookie = `paypal_result=${encodeURIComponent(json)}; path=/; max-age=60; SameSite=Lax`; } catch { /* ignore */ }
 };

 useEffect(() => {
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state') || '';

  if (error) {
   setStatus('error');
   setMessage('Verificación cancelada o denegada.');
   sendResult({ success: false, error });
   setTimeout(() => window.close(), 1500);
   return;
  }

  if (!code) {
   setStatus('error');
   setMessage('No se recibió el código de autorización.');
   return;
  }

  const verifyIdentity = async () => {
   if (processedCode.current === code) return;
   processedCode.current = code;

   try {
    // Extract userId from state parameter: format is "pp_timestamp_userId"
    const stateParts = state.split('_');
    const userId = stateParts.length >= 3 ? stateParts.slice(2).join('_') : '';

    if (!userId) {
     setStatus('error');
     setMessage('No se pudo obtener tu identidad. Inicia sesión e intenta de nuevo.');
     sendResult({ success: false, error: 'no_user_id' });
     setTimeout(() => window.close(), 3000);
     return;
    }

    const response = await fetch('/api/paypal/identity/userinfo', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ code, userId }),
    });

    if (!response.ok) throw new Error('Verification failed');

    const data = await response.json();

    // SECURITY: Block verification if names don't match
    if (data.nameMatch === false) {
     setStatus('error');
     setMessage(
      `El nombre de tu cuenta PayPal (${data.name}) no coincide con el registrado en la plataforma (${data.profileName}). Debes usar una cuenta PayPal a tu nombre.`
     );
     localStorage.removeItem('paypal_verify_userId');
     sendResult({ success: false, error: 'name_mismatch', data });
     setTimeout(() => window.close(), 4000);
     return;
    }

    // Names match — success!
    setStatus('success');
    setMessage('¡Verificación exitosa!');
    localStorage.removeItem('paypal_verify_userId');
    sendResult({ success: true, data });
    setTimeout(() => window.close(), 1500);
   } catch (err) {
    console.error('PayPal callback error:', err);
    setStatus('error');
    setMessage('Error al verificar la identidad. Intenta de nuevo.');
    sendResult({ success: false, error: 'verification_failed' });
    setTimeout(() => window.close(), 2000);
   }
  };

  verifyIdentity();
 }, [searchParams]);

 return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
   <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm mx-4">
    {status === 'loading' && (
     <>
      <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
      <p className="text-gray-600 font-medium">{message}</p>
     </>
    )}
    {status === 'success' && (
     <>
      <CheckCircle2 className="text-green-500 mx-auto mb-4" size={48} />
      <p className="text-green-700 font-semibold">{message}</p>
      <p className="text-sm text-gray-500 mt-2">Esta ventana se cerrará automáticamente...</p>
     </>
    )}
    {status === 'error' && (
     <>
      <XCircle className="text-red-500 mx-auto mb-4" size={48} />
      <p className="text-red-700 font-semibold text-sm">{message}</p>
      <p className="text-sm text-gray-500 mt-2">Esta ventana se cerrará automáticamente...</p>
     </>
    )}
   </div>
  </div>
 );
}

export default function PaypalCallbackPage() {
 return (
  <Suspense fallback={
   <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <Loader2 className="animate-spin text-blue-600" size={48} />
   </div>
  }>
   <PaypalCallbackContent />
  </Suspense>
 );
}
