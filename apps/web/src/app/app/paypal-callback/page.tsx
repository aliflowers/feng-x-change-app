'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Suspense } from 'react';

function PaypalCallbackContent() {
 const searchParams = useSearchParams();
 const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
 const [message, setMessage] = useState('Verificando tu cuenta PayPal...');

 useEffect(() => {
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
   setStatus('error');
   setMessage('Verificación cancelada o denegada.');
   setTimeout(() => {
    window.opener?.postMessage({ type: 'paypal-identity', success: false, error }, '*');
    window.close();
   }, 1500);
   return;
  }

  if (!code) {
   setStatus('error');
   setMessage('No se recibió el código de autorización.');
   return;
  }

  // Exchange code for user info via our API
  const verifyIdentity = async () => {
   try {
    // Get userId from localStorage (set by the opener)
    const userId = localStorage.getItem('paypal_verify_userId') || '';

    const response = await fetch('/api/paypal/identity/userinfo', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ code, userId }),
    });

    if (!response.ok) throw new Error('Verification failed');

    const data = await response.json();

    setStatus('success');
    setMessage('¡Verificación exitosa!');

    // Clean up
    localStorage.removeItem('paypal_verify_userId');

    // Send result back to opener
    setTimeout(() => {
     window.opener?.postMessage({
      type: 'paypal-identity',
      success: true,
      data,
     }, '*');
     window.close();
    }, 1000);
   } catch (err) {
    console.error('PayPal callback error:', err);
    setStatus('error');
    setMessage('Error al verificar la identidad. Intenta de nuevo.');
    setTimeout(() => {
     window.opener?.postMessage({ type: 'paypal-identity', success: false, error: 'verification_failed' }, '*');
     window.close();
    }, 2000);
   }
  };

  verifyIdentity();
 }, [searchParams]);

 return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
   <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm mx-4">
    {status === 'loading' && (
     <>
      <Loader2 className="animate-spin text-blue-600 mx-auto mb-4\" size={48} />
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
      <p className="text-red-700 font-semibold">{message}</p>
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
