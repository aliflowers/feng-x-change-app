/**
 * Handlers para el flujo de consulta de beneficiarios
 */

import { createServerClient } from '@/lib/supabase/server';
import type { ChatSession } from '@/types/chat';
import { NAVIGATION_ACTIONS } from '@/types/chat';
import { transitionTo } from '../session-manager';
import {
  sendListMessage,
  sendTextMessage,
  sendButtonMessage
} from '../message-builder';

// ============================================================================
// MAPEO DE MONEDAS A BANDERAS
// ============================================================================

const currencyFlags: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  VES: '🇻🇪',
  COP: '🇨🇴',
  CLP: '🇨🇱',
  PEN: '🇵🇪',
  PAB: '🇵🇦',
};

// ============================================================================
// HANDLER: MOSTRAR LISTA DE BENEFICIARIOS
// ============================================================================

/**
 * Muestra la lista de beneficiarios del usuario
 */
export async function handleBeneficiariesList(
  session: ChatSession,
  phoneNumber: string
): Promise<void> {
  if (!session.user_id) {
    await sendTextMessage(phoneNumber, '❌ No se encontró tu usuario. Por favor, regístrate primero.');
    return;
  }

  const supabase = createServerClient();

  // Obtener beneficiarios del usuario con información del banco
  const { data: beneficiaries, error } = await supabase
    .from('user_bank_accounts')
    .select(`
      id,
      account_holder,
      bank_name,
      account_number,
      alias,
      document_number,
      account_type,
      is_active,
      bank_platform_id,
      banks_platforms:bank_platform_id(
        currency_id,
        currencies:currency_id(code)
      )
    `)
    .eq('user_id', session.user_id)
    .eq('is_active', true)
    .order('account_holder');

  if (error) {
    console.error('[Beneficiaries] Error fetching:', error);
    await sendTextMessage(phoneNumber, '❌ Error al obtener tus beneficiarios.');
    return;
  }

  if (!beneficiaries || beneficiaries.length === 0) {
    await sendButtonMessage(phoneNumber, {
      header: '👥 Mis Beneficiarios',
      body: 'No tienes beneficiarios registrados todavía.\n\nPuedes agregar beneficiarios desde la app web o cuando realices un envío.',
      buttons: [
        { id: 'menu_send', title: '💸 Hacer un envío' },
        { id: NAVIGATION_ACTIONS.MAIN_MENU, title: '🏠 Menú principal' },
      ],
    });
    await transitionTo(session.id, 'BENEFICIARIES_EMPTY');
    return;
  }

  // Construir lista de beneficiarios
  const rows = beneficiaries.slice(0, 10).map((b: any) => {
    // Obtener código de moneda si está disponible
    const currencyCode = b.banks_platforms?.currencies?.code || '';
    const flag = currencyFlags[currencyCode] || '';

    // Enmascarar número de cuenta (mostrar últimos 4 dígitos)
    const maskedAccount = b.account_number
      ? `****${b.account_number.slice(-4)}`
      : '';

    return {
      id: `beneficiary_${b.id}`,
      title: b.alias || b.account_holder || 'Sin nombre',
      description: `${flag} ${b.bank_name || 'Banco'} ${maskedAccount}`.trim(),
    };
  });

  // Agregar navegación
  rows.push({
    id: NAVIGATION_ACTIONS.MAIN_MENU,
    title: '🏠 Menú principal',
    description: 'Volver al inicio',
  });

  await sendListMessage(phoneNumber, {
    header: '👥 Mis Beneficiarios',
    body: `Tienes ${beneficiaries.length} beneficiario${beneficiaries.length > 1 ? 's' : ''} registrado${beneficiaries.length > 1 ? 's' : ''}.\n\nSelecciona uno para ver sus detalles:`,
    buttonText: 'Ver beneficiarios',
    sections: [{
      title: 'Beneficiarios',
      rows,
    }],
  });

  await transitionTo(session.id, 'BENEFICIARIES_LIST');
}

// ============================================================================
// HANDLER: MOSTRAR DETALLE DE BENEFICIARIO
// ============================================================================

/**
 * Muestra los detalles de un beneficiario específico
 */
export async function handleBeneficiaryDetail(
  session: ChatSession,
  phoneNumber: string,
  beneficiaryId: string
): Promise<void> {
  if (!session.user_id) {
    await sendTextMessage(phoneNumber, '❌ No se encontró tu usuario.');
    return;
  }

  const supabase = createServerClient();

  // Obtener detalle del beneficiario
  const { data: beneficiary, error } = await supabase
    .from('user_bank_accounts')
    .select(`
      id,
      account_holder,
      bank_name,
      account_number,
      alias,
      document_number,
      document_type,
      account_type,
      email,
      banks_platforms:bank_platform_id(
        currency_id,
        currencies:currency_id(code, name)
      )
    `)
    .eq('id', beneficiaryId)
    .eq('user_id', session.user_id)
    .single();

  if (error || !beneficiary) {
    await sendTextMessage(phoneNumber, '❌ Beneficiario no encontrado.');
    return;
  }

  // Obtener moneda
  const currencyCode = (beneficiary as any).banks_platforms?.currencies?.code || 'N/A';
  const currencyName = (beneficiary as any).banks_platforms?.currencies?.name || '';
  const flag = currencyFlags[currencyCode] || '';

  // Formatear documento
  const docInfo = beneficiary.document_type && beneficiary.document_number
    ? `${beneficiary.document_type}: ${beneficiary.document_number}`
    : beneficiary.document_number || 'No especificado';

  // Construir mensaje de detalle
  const detailText = `👤 *${beneficiary.alias || beneficiary.account_holder}*

📋 *Datos del beneficiario:*
• Titular: ${beneficiary.account_holder || 'No especificado'}
• Documento: ${docInfo}
${beneficiary.email ? `• Email: ${beneficiary.email}` : ''}

🏦 *Datos bancarios:*
• Banco: ${beneficiary.bank_name || 'No especificado'}
• Cuenta: ${beneficiary.account_number || 'No especificado'}
${beneficiary.account_type ? `• Tipo: ${beneficiary.account_type}` : ''}
• Moneda: ${flag} ${currencyName} (${currencyCode})`;

  await sendButtonMessage(phoneNumber, {
    header: '👤 Detalle de Beneficiario',
    body: detailText,
    buttons: [
      { id: `send_to_${beneficiaryId}`, title: '💸 Enviar a este' },
      { id: 'beneficiaries_back', title: '👥 Ver todos' },
      { id: NAVIGATION_ACTIONS.MAIN_MENU, title: '🏠 Menú' },
    ],
  });

  await transitionTo(session.id, 'BENEFICIARIES_DETAIL', {
    selected_beneficiary_id: beneficiaryId,
    selected_beneficiary_name: beneficiary.alias || beneficiary.account_holder,
  });
}
