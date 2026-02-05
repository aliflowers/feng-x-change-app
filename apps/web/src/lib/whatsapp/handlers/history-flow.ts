/**
 * Handlers para el flujo de "Mis Operaciones" (Historial)
 * 
 * Permite al cliente consultar el historial de sus transacciones
 * filtradas por estado y período de tiempo.
 */

import { createClient } from '@supabase/supabase-js';
import type { ChatSession } from '@/types/chat';
import { transitionTo, updateSession } from '../session-manager';
import {
  sendListMessage,
  sendTextMessage,
  sendButtonMessage
} from '../message-builder';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Mapeo de banderas para monedas
const currencyFlags: Record<string, string> = {
  USD: '🇺🇸',
  VES: '🇻🇪',
  COP: '🇨🇴',
  CLP: '🇨🇱',
  PEN: '🇵🇪',
  EUR: '🇪🇺',
  ARS: '🇦🇷',
};

// IDs para estados del historial
export const HISTORY_STATUS_OPTIONS = {
  ALL: 'history_status_all',
  IN_PROCESS: 'history_status_in_process',
  VERIFIED: 'history_status_verified',
  COMPLETED: 'history_status_completed',
  REJECTED: 'history_status_rejected',
};

// IDs para períodos del historial
export const HISTORY_PERIOD_OPTIONS = {
  LAST_24H: 'history_period_24h',
  LAST_48H: 'history_period_48h',
  LAST_72H: 'history_period_72h',
  THIS_WEEK: 'history_period_week',
  THIS_MONTH: 'history_period_month',
};

// ============================================================================
// HANDLER: SELECCIONAR ESTADO
// ============================================================================

/**
 * Muestra el menú de filtro por estado de operaciones
 */
export async function handleHistorySelectStatus(
  session: ChatSession,
  phoneNumber: string
): Promise<void> {
  const sections = [
    {
      title: 'Filtrar por estado',
      rows: [
        { id: HISTORY_STATUS_OPTIONS.ALL, title: '📋 Todas', description: 'Ver todas las operaciones' },
        { id: HISTORY_STATUS_OPTIONS.IN_PROCESS, title: '⏳ En proceso', description: 'Operaciones pendientes' },
        { id: HISTORY_STATUS_OPTIONS.VERIFIED, title: '✅ Verificadas', description: 'Operaciones verificadas' },
        { id: HISTORY_STATUS_OPTIONS.COMPLETED, title: '🎉 Completadas', description: 'Operaciones finalizadas' },
        { id: HISTORY_STATUS_OPTIONS.REJECTED, title: '❌ Rechazadas', description: 'Operaciones rechazadas' },
      ],
    },
    {
      title: 'Navegación',
      rows: [
        { id: 'nav_main_menu', title: '🏠 Menú principal', description: 'Volver al inicio' },
      ],
    },
  ];

  await sendListMessage(phoneNumber, {
    body: '📊 *Mis Operaciones*\n\nSelecciona el tipo de operaciones que deseas consultar:',
    buttonText: 'Ver opciones',
    sections,
  });

  await transitionTo(session.id, 'HISTORY_SELECT_STATUS');
}

/**
 * Procesa la selección de estado y muestra menú de períodos
 */
export async function handleHistoryStatusSelection(
  session: ChatSession,
  phoneNumber: string,
  statusId: string
): Promise<void> {
  // Guardar estado seleccionado en metadata
  await updateSession(session.id, { metadata: { selected_history_status: statusId } });

  const sections = [
    {
      title: 'Seleccionar período',
      rows: [
        { id: HISTORY_PERIOD_OPTIONS.LAST_24H, title: '🕐 Últimas 24 horas' },
        { id: HISTORY_PERIOD_OPTIONS.LAST_48H, title: '🕑 Últimas 48 horas' },
        { id: HISTORY_PERIOD_OPTIONS.LAST_72H, title: '🕒 Últimas 72 horas' },
        { id: HISTORY_PERIOD_OPTIONS.THIS_WEEK, title: '📅 Esta semana' },
        { id: HISTORY_PERIOD_OPTIONS.THIS_MONTH, title: '🗓️ Este mes' },
      ],
    },
    {
      title: 'Navegación',
      rows: [
        { id: 'nav_main_menu', title: '🏠 Menú principal', description: 'Volver al inicio' },
      ],
    },
  ];

  await sendListMessage(phoneNumber, {
    body: '📅 *Selecciona el período*\n\nElige el rango de tiempo a consultar:\n\n_Para períodos anteriores visita:_\nhttps://fengxchange.com/app/historial',
    buttonText: 'Ver períodos',
    sections,
  });

  await transitionTo(session.id, 'HISTORY_SELECT_PERIOD');
}

// ============================================================================
// HANDLER: SELECCIONAR PERÍODO Y MOSTRAR RESULTADOS
// ============================================================================

/**
 * Procesa la selección de período y muestra los resultados
 */
export async function handleHistoryPeriodSelection(
  session: ChatSession,
  phoneNumber: string,
  periodId: string,
  userId: string
): Promise<void> {
  const metadata = session.metadata || {};
  const statusId = metadata.selected_history_status || HISTORY_STATUS_OPTIONS.ALL;

  // Calcular fecha según período
  const now = new Date();
  let fromDate: Date;
  let periodLabel: string;

  switch (periodId) {
    case HISTORY_PERIOD_OPTIONS.LAST_24H:
      fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      periodLabel = 'Últimas 24 horas';
      break;
    case HISTORY_PERIOD_OPTIONS.LAST_48H:
      fromDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      periodLabel = 'Últimas 48 horas';
      break;
    case HISTORY_PERIOD_OPTIONS.LAST_72H:
      fromDate = new Date(now.getTime() - 72 * 60 * 60 * 1000);
      periodLabel = 'Últimas 72 horas';
      break;
    case HISTORY_PERIOD_OPTIONS.THIS_WEEK:
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - now.getDay()); // Inicio de semana
      fromDate.setHours(0, 0, 0, 0);
      periodLabel = 'Esta semana';
      break;
    case HISTORY_PERIOD_OPTIONS.THIS_MONTH:
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      periodLabel = 'Este mes';
      break;
    default:
      fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      periodLabel = 'Últimas 24 horas';
  }

  // Construir query según estado
  let statusFilter: string[] = [];
  let statusLabel: string;

  switch (statusId) {
    case HISTORY_STATUS_OPTIONS.IN_PROCESS:
      statusFilter = ['POOL', 'VERIFIED', 'TAKEN'];
      statusLabel = 'En proceso';
      break;
    case HISTORY_STATUS_OPTIONS.VERIFIED:
      statusFilter = ['VERIFIED'];
      statusLabel = 'Verificadas';
      break;
    case HISTORY_STATUS_OPTIONS.COMPLETED:
      statusFilter = ['COMPLETED'];
      statusLabel = 'Completadas';
      break;
    case HISTORY_STATUS_OPTIONS.REJECTED:
      statusFilter = ['REJECTED'];
      statusLabel = 'Rechazadas';
      break;
    default:
      statusFilter = [];
      statusLabel = 'Todas';
  }

  // Consultar transacciones
  let query = supabase
    .from('transactions')
    .select(`
      id,
      transaction_number,
      amount_sent,
      amount_received,
      status,
      created_at,
      from_currency:currencies!transactions_from_currency_id_fkey(code, symbol),
      to_currency:currencies!transactions_to_currency_id_fkey(code, symbol),
      user_bank_account:user_bank_accounts(account_holder)
    `)
    .eq('user_id', userId)
    .gte('created_at', fromDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  if (statusFilter.length > 0) {
    query = query.in('status', statusFilter);
  }

  const { data: transactions, error } = await query;

  if (error) {
    console.error('[HistoryFlow] Error fetching transactions:', error);
    await sendTextMessage(phoneNumber, '❌ Error al consultar tus operaciones. Intenta nuevamente.');
    return;
  }

  // Formatear resultados
  if (!transactions || transactions.length === 0) {
    await sendButtonMessage(phoneNumber, {
      body: `📭 *No hay operaciones*\n\nNo encontramos operaciones con los filtros:\n• Estado: ${statusLabel}\n• Período: ${periodLabel}\n\n🔗 Para ver todo tu historial:\nhttps://fengxchange.com/app/historial`,
      buttons: [
        { id: 'history_back', title: '🔙 Cambiar filtros' },
        { id: 'nav_main_menu', title: '🏠 Menú principal' },
      ],
    });
    await transitionTo(session.id, 'HISTORY_SHOW_RESULTS');
    return;
  }

  // Construir mensaje con operaciones
  let message = `📋 *Tus operaciones* (${statusLabel} - ${periodLabel})\n\n`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactions.forEach((tx: any, index: number) => {
    const fromCurrency = tx.from_currency;
    const toCurrency = tx.to_currency;
    const fromFlag = currencyFlags[fromCurrency?.code] || '';
    const toFlag = currencyFlags[toCurrency?.code] || '';

    const statusEmoji = getStatusEmoji(tx.status);
    const statusText = getStatusText(tx.status);

    const date = new Date(tx.created_at);
    const dateStr = date.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    message += `${index + 1}️⃣ *${tx.transaction_number}*\n`;
    message += `   💵 ${fromFlag} ${fromCurrency?.symbol}${tx.amount_sent.toLocaleString('es-VE')} → ${toFlag} ${toCurrency?.symbol}${tx.amount_received.toLocaleString('es-VE')}\n`;
    message += `   👤 ${tx.user_bank_account?.account_holder || 'Sin beneficiario'}\n`;
    message += `   📅 ${dateStr}\n`;
    message += `   ${statusEmoji} ${statusText}\n\n`;
  });

  message += `_Para historial completo:_\nhttps://fengxchange.com/app/historial`;

  await sendButtonMessage(phoneNumber, {
    body: message,
    buttons: [
      { id: 'history_back', title: '🔙 Cambiar filtros' },
      { id: 'nav_main_menu', title: '🏠 Menú principal' },
    ],
  });

  await transitionTo(session.id, 'HISTORY_SHOW_RESULTS');
}

// ============================================================================
// UTILIDADES
// ============================================================================

function getStatusEmoji(status: string): string {
  const emojis: Record<string, string> = {
    POOL: '⏳',
    VERIFIED: '✅',
    TAKEN: '🔄',
    COMPLETED: '🎉',
    REJECTED: '❌',
  };
  return emojis[status] || '❓';
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    POOL: 'En cola',
    VERIFIED: 'Verificada',
    TAKEN: 'En proceso',
    COMPLETED: 'Completada',
    REJECTED: 'Rechazada',
  };
  return texts[status] || status;
}
