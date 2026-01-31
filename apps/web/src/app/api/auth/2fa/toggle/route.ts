/**
 * API Endpoint: /api/auth/2fa/toggle
 * 
 * POST: Habilitar o deshabilitar 2FA sin borrar la configuración
 * - Solo cambia two_factor_verified (true/false)
 * - Mantiene el secreto TOTP y códigos de respaldo
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';

export async function POST(request: NextRequest) {
 try {
  const supabase = await createClient();

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
   return NextResponse.json(
    { error: 'No autorizado' },
    { status: 401 }
   );
  }

  // Obtener el estado deseado del body
  const body = await request.json();
  const enabled = body.enabled === true;

  // Obtener configuración actual del usuario
  const { data: profile, error: profileError } = await supabase
   .from('profiles')
   .select('two_factor_method, two_factor_secret, two_factor_verified')
   .eq('id', user.id)
   .single();

  if (profileError || !profile) {
   return NextResponse.json(
    { error: 'Error al obtener perfil' },
    { status: 500 }
   );
  }

  // Si se quiere habilitar pero no hay configuración previa
  if (enabled && (!profile.two_factor_secret || profile.two_factor_method === 'none')) {
   return NextResponse.json(
    { error: 'Debes configurar 2FA primero antes de habilitarlo' },
    { status: 400 }
   );
  }

  // Actualizar solo el estado de verificación
  const { error: updateError } = await supabase
   .from('profiles')
   .update({
    two_factor_verified: enabled,
   })
   .eq('id', user.id);

  if (updateError) {
   return NextResponse.json(
    { error: 'Error al actualizar estado 2FA' },
    { status: 500 }
   );
  }

  // Registrar en audit_logs
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  await supabase.from('audit_logs').insert({
   user_id: user.id,
   action: enabled ? 'ENABLE_2FA' : 'DISABLE_2FA',
   resource_type: 'security',
   resource_id: user.id,
   old_value: { verified: profile.two_factor_verified },
   new_value: { verified: enabled },
   ip_address: clientIP,
  });

  return NextResponse.json({
   success: true,
   enabled: enabled,
   message: enabled ? '2FA habilitado' : '2FA deshabilitado',
  });

 } catch (error) {
  console.error('[2FA Toggle] Unexpected error:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
