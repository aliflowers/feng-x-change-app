'use server';

/**
 * API Route: /api/admin/users
 * 
 * Gestión de usuarios internos del sistema (ADMIN, CAJERO, SUPERVISOR)
 * Solo accesible por SUPER_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendTextMessage } from '@/lib/whatsapp';

// Roles internos que puede gestionar el SUPER_ADMIN
const INTERNAL_ROLES = ['ADMIN', 'CAJERO', 'SUPERVISOR'] as const;
type InternalRole = typeof INTERNAL_ROLES[number];

interface CreateUserRequest {
 first_name: string;
 last_name: string;
 email: string;
 password?: string;
 role: InternalRole;
 whatsapp_number: string;
}

// UpdateUserRequest está definido en [id]/route.ts

// Verificar que el solicitante sea SUPER_ADMIN
async function verifySuperAdmin(): Promise<{ valid: boolean; userId?: string }> {
 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();

 if (!user) {
  return { valid: false };
 }

 const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();

 if (!profile || profile.role !== 'SUPER_ADMIN') {
  return { valid: false };
 }

 return { valid: true, userId: user.id };
}

// Generar contraseña aleatoria
function generatePassword(length: number = 12): string {
 const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
 let password = '';
 for (let i = 0; i < length; i++) {
  password += chars.charAt(Math.floor(Math.random() * chars.length));
 }
 return password;
}

// GET - Listar usuarios internos
export async function GET(request: NextRequest) {
 try {
  const { valid } = await verifySuperAdmin();
  if (!valid) {
   return NextResponse.json(
    { error: 'No autorizado' },
    { status: 403 }
   );
  }

  const supabase = await createClient();

  // Obtener parámetros de filtro
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const search = searchParams.get('search');

  // Construir query
  let query = supabase
   .from('profiles')
   .select('id, first_name, last_name, email, role, whatsapp_number, is_active, created_at')
   .in('role', ['SUPER_ADMIN', ...INTERNAL_ROLES])
   .order('created_at', { ascending: false });

  // Filtrar por rol si se especifica
  if (role && INTERNAL_ROLES.includes(role as InternalRole)) {
   query = query.eq('role', role);
  }

  // Búsqueda por nombre o email
  if (search) {
   query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: users, error } = await query;

  if (error) {
   console.error('[AdminUsers] Error fetching users:', error);
   return NextResponse.json(
    { error: 'Error al obtener usuarios' },
    { status: 500 }
   );
  }

  return NextResponse.json({ users });

 } catch (error) {
  console.error('[AdminUsers] Exception:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}

// POST - Crear usuario interno
export async function POST(request: NextRequest) {
 try {
  const { valid } = await verifySuperAdmin();
  if (!valid) {
   return NextResponse.json(
    { error: 'No autorizado' },
    { status: 403 }
   );
  }

  const body: CreateUserRequest = await request.json();
  const { first_name, last_name, email, password, role, whatsapp_number } = body;

  // Validaciones
  if (!first_name || !last_name || !email || !role || !whatsapp_number) {
   return NextResponse.json(
    { error: 'Todos los campos son obligatorios' },
    { status: 400 }
   );
  }

  if (!INTERNAL_ROLES.includes(role)) {
   return NextResponse.json(
    { error: 'Rol inválido' },
    { status: 400 }
   );
  }

  // Validar formato de WhatsApp (debe empezar con código de país)
  const cleanedPhone = whatsapp_number.replace(/\D/g, '');
  if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
   return NextResponse.json(
    { error: 'Número de WhatsApp inválido' },
    { status: 400 }
   );
  }

  // Generar contraseña si no se proporciona
  const userPassword = password || generatePassword();

  // Crear usuario en Supabase Auth usando Admin API
  // Pasamos TODOS los datos en user_metadata para que el trigger handle_new_user
  // cree el perfil correctamente con el rol y datos del usuario interno
  const supabaseAdmin = createAdminClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.SUPABASE_SECRET_KEY!,
   { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
   email,
   password: userPassword,
   email_confirm: true,
   user_metadata: {
    first_name,
    last_name,
    role, // El trigger usará este rol en lugar de CLIENT
    whatsapp_number: cleanedPhone,
    is_active: 'true',
    must_change_password: 'true',
   },
  });

  if (authError) {
   console.error('[AdminUsers] Auth error:', authError);
   if (authError.message.includes('already registered')) {
    return NextResponse.json(
     { error: 'El email ya está registrado' },
     { status: 400 }
    );
   }
   return NextResponse.json(
    { error: 'Error al crear usuario en Auth' },
    { status: 500 }
   );
  }

  // El trigger handle_new_user ya creó el perfil con todos los datos correctos
  // No necesitamos hacer nada más con el perfil

  // Enviar credenciales por WhatsApp
  const roleLabels: Record<string, string> = {
   ADMIN: 'Administrador',
   CAJERO: 'Cajero',
   SUPERVISOR: 'Supervisor',
  };

  const welcomeMessage =
   `🎉 *¡Bienvenido a FengXchange!*\n\n` +
   `Hola ${first_name},\n\n` +
   `Se ha creado tu cuenta como *${roleLabels[role]}* en el sistema.\n\n` +
   `📧 *Usuario:* ${email}\n` +
   `🔐 *Contraseña temporal:* ${userPassword}\n\n` +
   `⚠️ *IMPORTANTE:* Deberás cambiar tu contraseña en el primer inicio de sesión.\n\n` +
   `🔗 *Acceso al panel:* ${process.env.NEXT_PUBLIC_APP_URL || 'https://fengxchange.com'}/backoffice\n\n` +
   `¡Éxito en tu trabajo!`;

  try {
   await sendTextMessage(cleanedPhone, welcomeMessage);
  } catch (whatsappError) {
   console.error('[AdminUsers] WhatsApp error:', whatsappError);
   // No es crítico, el usuario se creó correctamente
  }

  return NextResponse.json({
   success: true,
   user: {
    id: authUser.user.id,
    first_name,
    last_name,
    email,
    role,
    whatsapp_number: cleanedPhone,
   },
   generatedPassword: password ? undefined : userPassword, // Solo devolver si fue generada automáticamente
   credentialsSent: true,
  });

 } catch (error) {
  console.error('[AdminUsers] Exception:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
