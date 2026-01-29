import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';
import { z } from 'zod';

// Schema de validación para parámetros del sistema
const systemConfigSchema = z.object({
 timer_minutes: z.number().int().min(5).max(60).optional(),
 penalty_delay_count: z.number().int().min(1).max(10).optional(),
 penalty_amount_usd: z.number().min(0).max(100).optional(),
 commission_split_percent: z.number().min(0).max(100).optional(),
});

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

// GET: Obtener configuración del sistema
export async function GET() {
 try {
  const supabase = await createClient();
  const { authorized, error } = await verifySuperAdmin(supabase);

  if (!authorized) {
   return NextResponse.json({ error }, { status: 403 });
  }

  const { data, error: fetchError } = await supabase
   .from('system_config')
   .select('key, value, description, updated_at')
   .order('id');

  if (fetchError) {
   console.error('Error fetching system config:', fetchError);
   return NextResponse.json(
    { error: 'Error al obtener configuración' },
    { status: 500 }
   );
  }

  // Convertir array de key-value a objeto
  const config = data?.reduce((acc: Record<string, { value: unknown; description: string; updated_at: string }>, item: { key: string; value: unknown; description: string; updated_at: string }) => {
   acc[item.key] = {
    value: item.value,
    description: item.description,
    updated_at: item.updated_at,
   };
   return acc;
  }, {} as Record<string, { value: unknown; description: string; updated_at: string }>);

  return NextResponse.json({ config });
 } catch (error) {
  console.error('Error en GET /api/config/system:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}

// PUT: Actualizar configuración del sistema
export async function PUT(request: NextRequest) {
 try {
  const supabase = await createClient();
  const { authorized, error, userId } = await verifySuperAdmin(supabase);

  if (!authorized) {
   return NextResponse.json({ error }, { status: 403 });
  }

  const body = await request.json();

  // Validar datos de entrada
  const validationResult = systemConfigSchema.safeParse(body);

  if (!validationResult.success) {
   return NextResponse.json(
    {
     error: 'Datos inválidos',
     details: validationResult.error.flatten().fieldErrors
    },
    { status: 400 }
   );
  }

  const validatedData = validationResult.data;
  const updates: PromiseLike<unknown>[] = [];

  // Actualizar cada campo que fue enviado
  for (const [key, value] of Object.entries(validatedData)) {
   if (value !== undefined) {
    const updatePromise = supabase
     .from('system_config')
     .update({
      value: JSON.stringify(value),
      updated_at: new Date().toISOString(),
      updated_by: userId,
     })
     .eq('key', key)
     .then(() => { });
    updates.push(updatePromise);
   }
  }

  await Promise.all(updates);

  return NextResponse.json({
   success: true,
   message: 'Configuración actualizada correctamente'
  });
 } catch (error) {
  console.error('Error en PUT /api/config/system:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
