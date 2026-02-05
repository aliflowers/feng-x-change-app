'use server';

/**
 * API Route: /api/admin/users/[id]
 * 
 * Operaciones sobre un usuario específico (actualizar, desactivar, resetear contraseña)
 * Solo accesible por SUPER_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendTextMessage } from '@/lib/whatsapp';

const INTERNAL_ROLES = ['ADMIN', 'CAJERO', 'SUPERVISOR'] as const;
type InternalRole = typeof INTERNAL_ROLES[number];

interface UpdateUserRequest {
 first_name?: string;
 last_name?: string;
 role?: InternalRole;
 whatsapp_number?: string;
 is_active?: boolean;
}

// Verificar que el solicitante sea SUPER_ADMIN
async function verifySuperAdmin(): Promise<{ valid: boolean; userId?: string; supabase?: Awaited<ReturnType<typeof createClient>> }> {
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

 return { valid: true, userId: user.id, supabase };
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

// PUT - Actualizar usuario
export async function PUT(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
  const { id } = await params;

  const { valid, userId: adminId, supabase } = await verifySuperAdmin();
  if (!valid || !supabase) {
   return NextResponse.json(
    { error: 'No autorizado' },
    { status: 403 }
   );
  }

  // Verificar que el usuario existe y no es SUPER_ADMIN (no se puede editar)
  const { data: targetUser } = await supabase
   .from('profiles')
   .select('id, role, email')
   .eq('id', id)
   .single();

  if (!targetUser) {
   return NextResponse.json(
    { error: 'Usuario no encontrado' },
    { status: 404 }
   );
  }

  // No permitir editar SUPER_ADMIN (excepto a sí mismo para datos básicos)
  if (targetUser.role === 'SUPER_ADMIN' && targetUser.id !== adminId) {
   return NextResponse.json(
    { error: 'No se puede modificar a otro Super Administrador' },
    { status: 403 }
   );
  }

  const body: UpdateUserRequest = await request.json();
  const { first_name, last_name, role, whatsapp_number, is_active } = body;

  // Validar rol si se está cambiando
  if (role && !INTERNAL_ROLES.includes(role)) {
   return NextResponse.json(
    { error: 'Rol inválido' },
    { status: 400 }
   );
  }

  // No permitir cambiar el rol de SUPER_ADMIN
  if (targetUser.role === 'SUPER_ADMIN' && role) {
   return NextResponse.json(
    { error: 'No se puede cambiar el rol de Super Administrador' },
    { status: 403 }
   );
  }

  // Construir objeto de actualización
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (first_name !== undefined) updateData.first_name = first_name;
  if (last_name !== undefined) updateData.last_name = last_name;
  if (role !== undefined) updateData.role = role;
  if (is_active !== undefined) updateData.is_active = is_active;

  if (whatsapp_number !== undefined) {
   const cleanedPhone = whatsapp_number.replace(/\D/g, '');
   if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
    return NextResponse.json(
     { error: 'Número de WhatsApp inválido' },
     { status: 400 }
    );
   }
   updateData.whatsapp_number = cleanedPhone;
  }

  if (Object.keys(updateData).length === 0) {
   return NextResponse.json(
    { error: 'No hay datos para actualizar' },
    { status: 400 }
   );
  }

  updateData.updated_at = new Date().toISOString();

  // Usar cliente admin para bypass RLS (el cliente de cookies puede no permitir editar 'role')
  const supabaseAdmin = createAdminClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.SUPABASE_SECRET_KEY!,
   { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await supabaseAdmin
   .from('profiles')
   .update(updateData)
   .eq('id', id);

  if (error) {
   console.error('[AdminUsers] Update error:', error);
   return NextResponse.json(
    { error: 'Error al actualizar usuario' },
    { status: 500 }
   );
  }

  return NextResponse.json({
   success: true,
   message: 'Usuario actualizado correctamente',
  });

 } catch (error) {
  console.error('[AdminUsers] Exception:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}

// DELETE - Desactivar o eliminar usuario permanentemente
export async function DELETE(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
  const { id } = await params;
  const url = new URL(request.url);
  const isPermanent = url.searchParams.get('permanent') === 'true';

  const { valid, userId: adminId, supabase } = await verifySuperAdmin();
  if (!valid || !supabase) {
   return NextResponse.json(
    { error: 'No autorizado' },
    { status: 403 }
   );
  }

  // Verificar que el usuario existe
  const { data: targetUser } = await supabase
   .from('profiles')
   .select('id, role, first_name, last_name')
   .eq('id', id)
   .single();

  if (!targetUser) {
   return NextResponse.json(
    { error: 'Usuario no encontrado' },
    { status: 404 }
   );
  }

  // No permitir desactivar/eliminar SUPER_ADMIN
  if (targetUser.role === 'SUPER_ADMIN') {
   return NextResponse.json(
    { error: 'No se puede modificar a un Super Administrador' },
    { status: 403 }
   );
  }

  // No permitir desactivarse/eliminarse a sí mismo
  if (targetUser.id === adminId) {
   return NextResponse.json(
    { error: 'No puedes realizar esta acción sobre ti mismo' },
    { status: 400 }
   );
  }

  // Usar cliente admin para bypass RLS
  const supabaseAdmin = createAdminClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.SUPABASE_SECRET_KEY!,
   { auth: { autoRefreshToken: false, persistSession: false } }
  );

  if (isPermanent) {
   // ELIMINACIÓN PERMANENTE
   // 1. Eliminar el perfil de la BD
   const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', id);

   if (profileError) {
    console.error('[AdminUsers] Delete profile error:', profileError);
    return NextResponse.json(
     { error: 'Error al eliminar perfil de usuario' },
     { status: 500 }
    );
   }

   // 2. Eliminar de Supabase Auth
   const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

   if (authError) {
    console.error('[AdminUsers] Delete auth error:', authError);
    // El perfil ya fue eliminado, log del error pero continuar
   }

   return NextResponse.json({
    success: true,
    message: `Usuario ${targetUser.first_name} ${targetUser.last_name} eliminado permanentemente`,
   });
  } else {
   // SOFT DELETE: marcar como inactivo
   const { error } = await supabaseAdmin
    .from('profiles')
    .update({
     is_active: false,
     updated_at: new Date().toISOString(),
    })
    .eq('id', id);

   if (error) {
    console.error('[AdminUsers] Deactivate error:', error);
    return NextResponse.json(
     { error: 'Error al desactivar usuario' },
     { status: 500 }
    );
   }

   return NextResponse.json({
    success: true,
    message: 'Usuario desactivado correctamente',
   });
  }

 } catch (error) {
  console.error('[AdminUsers] Exception:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}

// POST - Resetear contraseña
export async function POST(
 _request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
  const { id } = await params;

  const { valid, supabase } = await verifySuperAdmin();
  if (!valid || !supabase) {
   return NextResponse.json(
    { error: 'No autorizado' },
    { status: 403 }
   );
  }

  // Verificar que el usuario existe
  const { data: targetUser } = await supabase
   .from('profiles')
   .select('id, first_name, email, whatsapp_number, role')
   .eq('id', id)
   .single();

  if (!targetUser) {
   return NextResponse.json(
    { error: 'Usuario no encontrado' },
    { status: 404 }
   );
  }

  // No permitir resetear contraseña de SUPER_ADMIN (excepto por él mismo)
  if (targetUser.role === 'SUPER_ADMIN') {
   return NextResponse.json(
    { error: 'No se puede resetear la contraseña de un Super Administrador desde aquí' },
    { status: 403 }
   );
  }

  // Generar nueva contraseña
  const newPassword = generatePassword();

  // Actualizar contraseña en Supabase Auth
  const supabaseAdmin = createAdminClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.SUPABASE_SECRET_KEY!,
   { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
   id,
   { password: newPassword }
  );

  if (authError) {
   console.error('[AdminUsers] Reset password auth error:', authError);
   return NextResponse.json(
    { error: 'Error al resetear contraseña' },
    { status: 500 }
   );
  }

  // Marcar que debe cambiar contraseña
  await supabase
   .from('profiles')
   .update({
    must_change_password: true,
    updated_at: new Date().toISOString(),
   })
   .eq('id', id);

  // Enviar nueva contraseña por WhatsApp si tiene número
  if (targetUser.whatsapp_number) {
   const resetMessage =
    `🔐 *Contraseña Restablecida*\n\n` +
    `Hola ${targetUser.first_name},\n\n` +
    `Tu contraseña ha sido restablecida.\n\n` +
    `🔑 *Nueva contraseña:* ${newPassword}\n\n` +
    `⚠️ Por seguridad, deberás cambiar esta contraseña en tu próximo inicio de sesión.\n\n` +
    `🔗 Accede aquí: ${process.env.NEXT_PUBLIC_APP_URL || 'https://fengxchange.com'}/backoffice`;

   try {
    await sendTextMessage(targetUser.whatsapp_number, resetMessage);
   } catch (whatsappError) {
    console.error('[AdminUsers] WhatsApp error:', whatsappError);
    // No es crítico
   }
  }

  return NextResponse.json({
   success: true,
   message: 'Contraseña reseteada y enviada por WhatsApp',
   newPassword, // También devolver para mostrar en UI por si falla WhatsApp
  });

 } catch (error) {
  console.error('[AdminUsers] Exception:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
