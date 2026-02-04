/**
 * Handlers para el flujo de consulta de tasas
 */

import { createServerClient } from '@/lib/supabase/server';
import type { ChatSession } from '@/types/chat';
import { NAVIGATION_ACTIONS } from '@/types/chat';
import { transitionTo } from '../session-manager';
import {
  sendCurrencySelector,
  sendListMessage,
  sendButtonMessage,
  sendTextMessage
} from '../message-builder';

// ============================================================================
// HANDLER: SELECCIONAR MONEDA ORIGEN
// ============================================================================

/**
 * Muestra selector de moneda para consultar tasas
 */
export async function handleRatesSelectCurrency(
  session: ChatSession,
  phoneNumber: string
): Promise<void> {
  await sendCurrencySelector(phoneNumber, {
    header: '💱 Consultar Tasas',
    body: 'Selecciona la moneda que deseas consultar:',
    includeBackButton: true,
  });

  await transitionTo(session.id, 'RATES_SELECT_CURRENCY');
}

/**
 * Procesa selección de moneda y muestra pares disponibles
 */
export async function handleRatesCurrencySelected(
  session: ChatSession,
  phoneNumber: string,
  currencyCode: string
): Promise<void> {
  const supabase = createServerClient();

  // Obtener pares activos desde la base de datos
  const { data: rates } = await supabase
    .from('exchange_rates')
    .select(`
      id,
      rate,
      from_currency:currencies!exchange_rates_from_currency_id_fkey(code, name),
      to_currency:currencies!exchange_rates_to_currency_id_fkey(code, name)
    `)
    .eq('is_active', true);

  // Filtrar por moneda origen seleccionada
  const matchingPairs = (rates || []).filter((r: any) =>
    r.from_currency?.code === currencyCode
  );

  if (matchingPairs.length === 0) {
    await sendTextMessage(
      phoneNumber,
      `No hay tasas activas desde ${currencyCode} en este momento.`
    );
    await handleRatesSelectCurrency(session, phoneNumber);
    return;
  }

  // Mapeo de monedas a banderas
  const currencyFlags: Record<string, string> = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    VES: '🇻🇪',
    COP: '🇨🇴',
    CLP: '🇨🇱',
    PEN: '🇵🇪',
    PAB: '🇵🇦',
    USDT: '💲',
    ZINLI: '💳',
    PAYPAL: '💳',
  };

  // Construir opciones de lista
  const options = matchingPairs.map((r: any) => {
    const fromFlag = currencyFlags[r.from_currency.code] || '';
    const toFlag = currencyFlags[r.to_currency.code] || '';
    return {
      id: `rate_${r.from_currency.code}_${r.to_currency.code}`,
      title: `${fromFlag} ${r.from_currency.code} a ${toFlag} ${r.to_currency.code}`,
      description: r.to_currency.name,
    };
  });

  // Agregar opción de navegación
  options.push({
    id: NAVIGATION_ACTIONS.MAIN_MENU,
    title: '🏠 Menú principal',
    description: 'Volver al inicio',
  });

  await sendListMessage(phoneNumber, {
    header: `Tasas desde ${currencyCode}`,
    body: 'Selecciona el par de cambio:',
    buttonText: 'Ver tasas',
    sections: [{
      title: 'Pares disponibles',
      rows: options,
    }],
  });

  // Guardar moneda seleccionada y transicionar
  await transitionTo(session.id, 'RATES_SELECT_PAIR', {
    selected_currency_from: currencyCode,
  });
}

// ============================================================================
// HANDLER: MOSTRAR TASA
// ============================================================================

/**
 * Muestra la tasa seleccionada con opciones de acción
 */
export async function handleRatesShowRate(
  session: ChatSession,
  phoneNumber: string,
  fromCurrency: string,
  toCurrency: string
): Promise<void> {
  const supabase = createServerClient();

  // Obtener la tasa específica
  const { data: currencies } = await supabase
    .from('currencies')
    .select('id, code')
    .in('code', [fromCurrency, toCurrency]);

  const fromCurrencyId = currencies?.find(c => c.code === fromCurrency)?.id;
  const toCurrencyId = currencies?.find(c => c.code === toCurrency)?.id;

  if (!fromCurrencyId || !toCurrencyId) {
    await sendTextMessage(phoneNumber, 'Error: Moneda no encontrada.');
    return;
  }

  const { data: rate } = await supabase
    .from('exchange_rates')
    .select('rate, updated_at')
    .eq('from_currency_id', fromCurrencyId)
    .eq('to_currency_id', toCurrencyId)
    .eq('is_active', true)
    .single();

  if (!rate) {
    await sendTextMessage(phoneNumber, 'Esta tasa no está disponible actualmente.');
    return;
  }

  // Calcular tiempo desde última actualización
  const updatedAt = new Date(rate.updated_at);
  const now = new Date();
  const diffMinutes = Math.round((now.getTime() - updatedAt.getTime()) / 60000);
  const timeAgo = diffMinutes < 60
    ? `${diffMinutes} minutos`
    : `${Math.round(diffMinutes / 60)} horas`;

  // Enviar mensaje con la tasa
  await sendButtonMessage(phoneNumber, {
    header: '💱 Tasa de Cambio',
    body: `*${fromCurrency} → ${toCurrency}*\n\n1 ${fromCurrency} = *${rate.rate.toLocaleString()}* ${toCurrency}\n\n📅 Actualizado hace ${timeAgo}`,
    buttons: [
      { id: 'start_send_with_rate', title: '💸 Enviar con esta tasa' },
      { id: 'rate_another', title: '🔄 Otra tasa' },
      { id: NAVIGATION_ACTIONS.MAIN_MENU, title: '🏠 Menú' },
    ],
  });

  // Guardar datos y transicionar
  await transitionTo(session.id, 'RATES_SHOW', {
    selected_currency_from: fromCurrency,
    selected_currency_to: toCurrency,
    calculated_rate: rate.rate,
  });
}
