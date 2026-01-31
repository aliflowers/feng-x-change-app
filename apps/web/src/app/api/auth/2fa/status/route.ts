import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';

export async function GET() {
 try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
   return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Obtener el estado 2FA del perfil del usuario
  const { data: profile, error } = await supabase
   .from('profiles')
   .select('two_factor_method, two_factor_verified, two_factor_secret')
   .eq('id', user.id)
   .single();

  if (error) {
   console.error('Error fetching 2FA status:', error);
   return NextResponse.json({ error: 'Error al obtener estado 2FA' }, { status: 500 });
  }

  // hasSecret indica si tiene configuración guardada (aunque esté deshabilitada)
  const hasSecret = !!profile?.two_factor_secret;
  const actualMethod = profile?.two_factor_method || 'none';

  // Solo reportar como activo si está verificado
  const method = profile?.two_factor_verified ? actualMethod : 'none';

  return NextResponse.json({
   method,
   actualMethod, // El método configurado (aunque esté deshabilitado)
   verified: profile?.two_factor_verified || false,
   hasSecret, // Si tiene secreto configurado
  });
 } catch (error) {
  console.error('Error in 2FA status endpoint:', error);
  return NextResponse.json({ error: 'Error interno' }, { status: 500 });
 }
}
