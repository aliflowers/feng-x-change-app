/**
 * Handlers para el flujo de "Mis Datos" (Perfil)
 * 
 * Permite al cliente consultar sus datos personales registrados
 * en la plataforma.
 */

import { createClient } from '@supabase/supabase-js';
import type { ChatSession } from '@/types/chat';
import { transitionTo } from '../session-manager';
import { sendButtonMessage, sendTextMessage } from '../message-builder';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// HANDLER: MOSTRAR PERFIL
// ============================================================================

/**
 * Muestra los datos personales del cliente
 */
export async function handleProfileShow(
  session: ChatSession,
  phoneNumber: string,
  userId: string
): Promise<void> {
  // Obtener datos del perfil
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      first_name,
      last_name,
      email,
      phone_number,
      whatsapp_number,
      nationality,
      country,
      document_type,
      document_number
    `)
    .eq('id', userId)
    .single();

  if (error || !profile) {
    console.error('[ProfileFlow] Error fetching profile:', error);
    await sendTextMessage(
      phoneNumber,
      '❌ Error al obtener tus datos. Por favor intenta nuevamente.'
    );
    return;
  }

  // Construir mensaje con datos del perfil
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'No registrado';
  const email = profile.email || 'No registrado';
  const phone = profile.phone_number || profile.whatsapp_number || 'No registrado';
  const nationality = profile.nationality || 'No especificada';
  const country = profile.country || 'No especificado';
  const document = formatDocument(profile.document_type, profile.document_number);

  const message =
    `👤 *Mis Datos Personales*\n\n` +
    `📝 *Nombre:* ${fullName}\n` +
    `📧 *Email:* ${email}\n` +
    `📱 *Teléfono:* ${phone}\n` +
    `🌍 *Nacionalidad:* ${nationality}\n` +
    `📍 *País de Residencia:* ${country}\n` +
    `🪪 *Documento:* ${document}\n\n` +
    `_Para editar tus datos visita:_\n` +
    `https://fengxchange.com/app/perfil`;

  await sendButtonMessage(phoneNumber, {
    body: message,
    buttons: [
      { id: 'nav_main_menu', title: '🏠 Menú principal' },
    ],
  });

  await transitionTo(session.id, 'PROFILE_SHOW');
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Formatea el tipo y número de documento
 */
function formatDocument(type?: string | null, number?: string | null): string {
  if (!type && !number) return 'No registrado';
  if (!type) return number || 'No registrado';
  if (!number) return type;

  const typeLabels: Record<string, string> = {
    'V': 'V',
    'E': 'E',
    'J': 'J',
    'G': 'G',
    'P': 'Pasaporte',
    'CI': 'CI',
    'DNI': 'DNI',
    'RUT': 'RUT',
    'CC': 'CC',
    'CE': 'CE',
  };

  const label = typeLabels[type] || type;
  return `${label}-${number}`;
}
