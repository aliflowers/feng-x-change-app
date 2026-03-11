/**
 * SessionManager - Gestión de sesiones de chat
 * 
 * CRUD para la tabla chat_sessions en Supabase.
 * Maneja el estado de las conversaciones de WhatsApp.
 */

import { createServerClient } from '@/lib/supabase/server';
import type {
  ChatSession,
  ChatSessionUpdate,
  ConversationStep,
  SessionMetadata
} from '@/types/chat';

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Obtiene o crea una sesión para un número de teléfono.
 * Si el usuario está registrado, asocia la sesión con su perfil.
 */
export async function getOrCreateSession(phoneNumber: string): Promise<{
  session: ChatSession;
  isRegistered: boolean;
  userName?: string;
  userRole?: string;
}> {
  const supabase = createServerClient();

  // 1. Buscar sesión existente
  const { data: existingSession } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();

  // 2. Buscar si el usuario está registrado (por whatsapp_number o phone_number)
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const phoneWithPlus = `+${cleanPhone}`;

  // Buscar por whatsapp_number primero (es el más probable para WhatsApp)
  let profile = null;

  const { data: byWhatsApp } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role')
    .eq('whatsapp_number', cleanPhone)
    .single();

  if (byWhatsApp) {
    profile = byWhatsApp;
  } else {
    // Buscar por phone_number (con +)
    const { data: byPhone } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('phone_number', phoneWithPlus)
      .single();

    if (byPhone) {
      profile = byPhone;
    }
  }

  const isRegistered = !!profile;
  const userName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : undefined;
  const userRole = profile?.role;

  // 3. Si existe sesión, actualizarla y retornarla
  if (existingSession) {
    // Actualizar user_id si ahora está registrado
    if (isRegistered && !existingSession.user_id && profile) {
      await supabase
        .from('chat_sessions')
        .update({
          user_id: profile.id,
          last_message_at: new Date().toISOString()
        })
        .eq('id', existingSession.id);

      existingSession.user_id = profile.id;
    } else {
      // Solo actualizar last_message_at
      await supabase
        .from('chat_sessions')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', existingSession.id);
    }

    return {
      session: existingSession as ChatSession,
      isRegistered,
      userName,
      userRole,
    };
  }

  // 4. Crear nueva sesión
  const { data: newSession, error } = await supabase
    .from('chat_sessions')
    .insert({
      phone_number: phoneNumber,
      user_id: profile?.id || null,
      current_step: 'IDLE',
      metadata: {},
    })
    .select()
    .single();

  if (error || !newSession) {
    throw new Error(`Error creating session: ${error?.message}`);
  }

  return {
    session: newSession as ChatSession,
    isRegistered,
    userName,
    userRole,
  };
}

/**
 * Actualiza el estado de una sesión
 */
export async function updateSession(
  sessionId: string,
  update: ChatSessionUpdate
): Promise<ChatSession> {
  const supabase = createServerClient();

  // Construir objeto de actualización
  const updateData: Record<string, unknown> = {
    last_message_at: new Date().toISOString(),
  };

  if (update.current_step) {
    updateData.current_step = update.current_step;
  }

  if (update.user_id !== undefined) {
    updateData.user_id = update.user_id;
  }

  // Para metadata, hacemos merge con la existente
  if (update.metadata) {
    const { data: currentSession } = await supabase
      .from('chat_sessions')
      .select('metadata')
      .eq('id', sessionId)
      .single();

    const currentMetadata = (currentSession?.metadata || {}) as SessionMetadata;
    updateData.metadata = { ...currentMetadata, ...update.metadata };
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Error updating session: ${error?.message}`);
  }

  return data as ChatSession;
}

/**
 * Cambia el paso actual y guarda en el historial de navegación
 */
export async function transitionTo(
  sessionId: string,
  newStep: ConversationStep,
  additionalMetadata?: Partial<SessionMetadata>
): Promise<ChatSession> {
  const supabase = createServerClient();

  // Obtener sesión actual
  const { data: currentSession } = await supabase
    .from('chat_sessions')
    .select('current_step, metadata')
    .eq('id', sessionId)
    .single();

  if (!currentSession) {
    throw new Error('Session not found');
  }

  const currentMetadata = (currentSession.metadata || {}) as SessionMetadata;
  const currentStep = currentSession.current_step as ConversationStep;

  // Actualizar historial de navegación
  const history = currentMetadata.navigation_history || [];
  history.push(currentStep);

  // Limitar historial a últimos 20 pasos
  const trimmedHistory = history.slice(-20);

  // Construir nueva metadata
  const newMetadata: SessionMetadata = {
    ...currentMetadata,
    ...additionalMetadata,
    navigation_history: trimmedHistory,
  };

  return updateSession(sessionId, {
    current_step: newStep,
    metadata: newMetadata,
  });
}

/**
 * Vuelve al paso anterior usando el historial de navegación
 */
export async function goBack(sessionId: string): Promise<ChatSession> {
  const supabase = createServerClient();

  const { data: currentSession } = await supabase
    .from('chat_sessions')
    .select('metadata')
    .eq('id', sessionId)
    .single();

  if (!currentSession) {
    throw new Error('Session not found');
  }

  const metadata = (currentSession.metadata || {}) as SessionMetadata;
  const history = metadata.navigation_history || [];

  // Si no hay historial, volver al menú principal
  if (history.length === 0) {
    return transitionTo(sessionId, 'MAIN_MENU');
  }

  // Obtener último paso y removerlo del historial
  const previousStep = history.pop()!;

  return updateSession(sessionId, {
    current_step: previousStep,
    metadata: { navigation_history: history },
  });
}

/**
 * Resetea la sesión al estado inicial (IDLE)
 * Limpia toda la metadata excepto navigation_history
 */
export async function resetSession(sessionId: string): Promise<ChatSession> {
  return updateSession(sessionId, {
    current_step: 'IDLE',
    metadata: {
      selected_currency_from: undefined,
      selected_currency_to: undefined,
      selected_payment_method_id: undefined,
      selected_payment_method_name: undefined,
      selected_beneficiary_id: undefined,
      selected_beneficiary_name: undefined,
      amount_to_send: undefined,
      calculated_rate: undefined,
      calculated_amount_received: undefined,
      company_account_id: undefined,
      proof_url: undefined,
      extracted_ocr_data: undefined,
      navigation_history: [],
    },
  });
}

/**
 * Obtiene una sesión por ID
 */
export async function getSessionById(sessionId: string): Promise<ChatSession | null> {
  const supabase = createServerClient();

  const { data } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  return data as ChatSession | null;
}

/**
 * Limpia sesiones inactivas (más de 24 horas)
 */
export async function cleanupInactiveSessions(): Promise<number> {
  const supabase = createServerClient();

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 24);

  const { data, error } = await supabase
    .from('chat_sessions')
    .delete()
    .lt('last_message_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    console.error('Error cleaning up sessions:', error);
    return 0;
  }

  return data?.length || 0;
}
