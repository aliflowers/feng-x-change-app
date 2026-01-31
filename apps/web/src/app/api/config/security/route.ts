import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';

// Interfaz para la configuración de seguridad
interface SecurityConfig {
 rate_limiting: {
  enabled: boolean;
  requests_per_minute: number;
 };
 two_factor_auth: {
  enabled: boolean;
  required_for_internal_users: boolean;
 };
 audit_retention_days: number;
 failed_login_alerts: {
  enabled: boolean;
  threshold: number;
  notify_email: string;
 };
}

// Verificar que el usuario es SUPER_ADMIN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function verifySuperAdmin(supabase: any) {
 const { data: { user }, error: authError } = await supabase.auth.getUser();

 if (authError || !user) {
  return { authorized: false, error: 'No autenticado', userId: null };
 }

 const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();

 if (profileError || !profile || profile.role !== 'SUPER_ADMIN') {
  return { authorized: false, error: 'Acceso denegado. Solo SUPER_ADMIN.', userId: user.id };
 }

 return { authorized: true, error: null, userId: user.id };
}

/**
 * GET /api/config/security
 * Obtiene la configuración de seguridad actual
 */
export async function GET() {
 try {
  const supabase = await createClient();
  const { authorized, error } = await verifySuperAdmin(supabase);

  if (!authorized) {
   return NextResponse.json({ error }, { status: 403 });
  }

  // Obtener configuración
  const { data: configRows, error: fetchError } = await supabase
   .from('security_config')
   .select('key, value');

  if (fetchError) {
   console.error('Error fetching security config:', fetchError);
   return NextResponse.json(
    { error: 'Error al obtener la configuración' },
    { status: 500 }
   );
  }

  // Convertir filas a objeto
  const config: Partial<SecurityConfig> = {};
  for (const row of configRows || []) {
   (config as Record<string, unknown>)[row.key] = row.value;
  }

  return NextResponse.json(config);
 } catch (error) {
  console.error('Error in GET /api/config/security:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}

/**
 * PUT /api/config/security
 * Actualiza la configuración de seguridad
 */
export async function PUT(request: NextRequest) {
 try {
  const supabase = await createClient();
  const { authorized, error, userId } = await verifySuperAdmin(supabase);

  if (!authorized) {
   return NextResponse.json({ error }, { status: 403 });
  }

  // Parsear body
  const body = await request.json();

  // Validaciones básicas
  const validKeys = ['rate_limiting', 'two_factor_auth', 'audit_retention_days', 'failed_login_alerts'];
  const updates: Array<{ key: string; value: unknown }> = [];

  for (const key of validKeys) {
   if (body[key] !== undefined) {
    // Validaciones específicas
    if (key === 'rate_limiting') {
     if (typeof body[key].enabled !== 'boolean') {
      return NextResponse.json(
       { error: 'rate_limiting.enabled debe ser boolean' },
       { status: 400 }
      );
     }
     if (body[key].requests_per_minute < 10 || body[key].requests_per_minute > 1000) {
      return NextResponse.json(
       { error: 'requests_per_minute debe estar entre 10 y 1000' },
       { status: 400 }
      );
     }
    }

    if (key === 'audit_retention_days') {
     if (body[key] < 7 || body[key] > 365) {
      return NextResponse.json(
       { error: 'audit_retention_days debe estar entre 7 y 365' },
       { status: 400 }
      );
     }
    }

    if (key === 'failed_login_alerts') {
     if (body[key].threshold < 3 || body[key].threshold > 20) {
      return NextResponse.json(
       { error: 'threshold debe estar entre 3 y 20' },
       { status: 400 }
      );
     }
    }

    updates.push({ key, value: body[key] });
   }
  }

  // Actualizar o insertar cada key (upsert)
  for (const update of updates) {
   const { error: updateError } = await supabase
    .from('security_config')
    .upsert({
     key: update.key,
     value: update.value,
     updated_at: new Date().toISOString(),
     updated_by: userId,
    }, { onConflict: 'key' });

   if (updateError) {
    console.error(`Error updating ${update.key}:`, updateError);
    return NextResponse.json(
     { error: `Error al actualizar ${update.key}` },
     { status: 500 }
    );
   }
  }

  // Registrar en audit_logs
  await supabase.from('audit_logs').insert({
   user_id: userId,
   action: 'UPDATE_SECURITY_CONFIG',
   resource_type: 'security_config',
   resource_id: 'global',
   new_value: body,
  });

  return NextResponse.json({
   success: true,
   message: 'Configuración de seguridad actualizada correctamente'
  });
 } catch (error) {
  console.error('Error in PUT /api/config/security:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
