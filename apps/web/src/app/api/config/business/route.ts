import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';
import { z } from 'zod';

// Schema de validación para información del negocio
const businessInfoSchema = z.object({
 business_name: z.string().min(1).max(100).optional(),
 logo_url: z.string().url().optional().or(z.literal('')),
 contact_email: z.string().email().optional().or(z.literal('')),
 contact_phone: z.string().max(20).optional(),
 contact_whatsapp: z.string().max(20).optional(),
 address: z.string().max(500).optional(),
 business_hours: z.string().optional(), // JSON string
 terms_and_conditions: z.string().optional(),
 privacy_policy: z.string().optional(),
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

// GET: Obtener información del negocio
export async function GET() {
 try {
  const supabase = await createClient();
  const { authorized, error } = await verifySuperAdmin(supabase);

  if (!authorized) {
   return NextResponse.json({ error }, { status: 403 });
  }

  const { data, error: fetchError } = await supabase
   .from('business_info')
   .select('key, value, updated_at')
   .order('id');

  if (fetchError) {
   console.error('Error fetching business info:', fetchError);
   return NextResponse.json(
    { error: 'Error al obtener información del negocio' },
    { status: 500 }
   );
  }

  // Convertir array de key-value a objeto
  const info: Record<string, string> = {};
  data?.forEach((item: { key: string; value: string }) => {
   info[item.key] = item.value || '';
  });

  return NextResponse.json({ info });
 } catch (error) {
  console.error('Error en GET /api/config/business:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}

// PUT: Actualizar información del negocio
export async function PUT(request: NextRequest) {
 try {
  const supabase = await createClient();
  const { authorized, error, userId } = await verifySuperAdmin(supabase);

  if (!authorized) {
   return NextResponse.json({ error }, { status: 403 });
  }

  const body = await request.json();

  // Validar datos de entrada
  const validationResult = businessInfoSchema.safeParse(body);

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
     .from('business_info')
     .update({
      value: value,
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
   message: 'Información del negocio actualizada correctamente'
  });
 } catch (error) {
  console.error('Error en PUT /api/config/business:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
