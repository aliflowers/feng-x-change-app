'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
 checkClientSessionExpiration,
 updateClientLastActivity,
 clearClientSessionData
} from '@/lib/client-session-config';

/**
 * Componente cliente que monitorea la inactividad del usuario
 * en el área privada (/app).
 * 
 * Si detecta inactividad mayor al límite (15 mins), cierra la sesión
 * de Supabase y redirige al login.
 */
export default function ClientSessionManager() {
 const router = useRouter();
 // Usamos ref para evitar cierres (closures) obsoletos dentro de los event listeners
 const isCheckingData = useRef(false);

 // Actualiza la última actividad, usando debounce rústico para 
 // no saturar el localStorage (ej. en cada movimiento minúsculo del mouse)
 const handleActivity = useCallback(() => {
  // Si ya estamos cerrando sesión o verificando, ignoramos
  if (isCheckingData.current) return;
  updateClientLastActivity();
 }, []);

 // Función principal de chequeo de inactividad
 const verifySessionStatus = useCallback(async () => {
  // Evitar verificaciones simultáneas y race conditions
  if (isCheckingData.current) return;

  try {
   isCheckingData.current = true;
   const { expired, reason } = checkClientSessionExpiration();

   if (expired && reason === 'inactivity') {
    // La sesión expiró
    clearClientSessionData();

    // Cierre de sesión criptográfico (SDK Supabase)
    await supabase.auth.signOut();

    // Redirección forzada al login con parámetro que indica inactividad
    router.replace('/login?reason=inactivity');
   }
  } catch (error) {
   console.error('Error verificando la sesión del cliente:', error);
  } finally {
   isCheckingData.current = false;
  }
 }, [router]);

 // Hook para añadir los listeners de actividad del usuario
 useEffect(() => {
  // Lista de eventos que consideramos "actividad"
  const activityEvents = [
   'mousedown', 'keydown', 'scroll', 'touchstart', 'click'
  ];

  // Función wrapper para hacer throttling (optimización de performance)
  let throttleTimer: NodeJS.Timeout | null = null;
  const activityHandler = () => {
   if (throttleTimer) return;

   // Actualizamos actividad y bloqueamos nuevos updates por 5 segundos
   handleActivity();
   throttleTimer = setTimeout(() => {
    throttleTimer = null;
   }, 5000);
  };

  // Registrar eventos
  activityEvents.forEach(event => {
   window.addEventListener(event, activityHandler, { passive: true });
  });

  // Cleanup de listeners al desmontar
  return () => {
   activityEvents.forEach(event => {
    window.removeEventListener(event, activityHandler);
   });
   if (throttleTimer) clearTimeout(throttleTimer);
  };
 }, [handleActivity]);

 // Hook para verificar continuamente si la sesión expiró 
 // (Incluso si el usuario cambia de pestaña y vuelve horas después)
 useEffect(() => {
  // Verificamos de inmediato al montar
  verifySessionStatus();

  // Luego verificamos periódicamente cada minuto
  const intervalId = setInterval(() => {
   verifySessionStatus();
  }, 60000); // 1 minuto en ms

  // Además, verificar si la pestaña vuelve a tener el foco
  // Útil si el usuario dejó la pestaña en background y el interval se durmió
  const handleVisibilityChange = () => {
   if (document.visibilityState === 'visible') {
    verifySessionStatus();
   }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
   clearInterval(intervalId);
   document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
 }, [verifySessionStatus]);

 // Este componente solo gestiona lógica en background, renderiza null
 return null;
}
