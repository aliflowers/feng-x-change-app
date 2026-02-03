// =========================================================================
// Endpoint de Configuración del Agente IA
// GET: Obtener configuración + estado de API key
// PUT: Actualizar configuración (sin api_key - viene de .env.local)
// =========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';
import { z } from 'zod';
import type { AIConfigResponse } from '@/types/ai-types';

// =========================================================================
// VALIDACIÓN (nodejs-backend-patterns)
// ⚠️ Nota: api_key NO se incluye - viene de variable de entorno
// =========================================================================
const updateConfigSchema = z.object({
 is_enabled: z.boolean().optional(),
 model: z.enum(['gpt-5-nano', 'gpt-5-mini', 'gpt-4o', 'gpt-4o-mini']).optional(),
 system_prompt: z.string().optional(),
 reasoning_effort: z.enum(['low', 'medium', 'high']).optional(),
 max_tokens: z.number().min(100).max(4000).optional(),
 can_query_rates: z.boolean().optional(),
 can_calculate_amounts: z.boolean().optional(),
 can_list_beneficiaries: z.boolean().optional(),
 can_create_operations: z.boolean().optional(),
 can_analyze_images: z.boolean().optional(),
 notify_on_payment_complete: z.boolean().optional()
});

// =========================================================================
// GET: Obtener configuración
// =========================================================================
export async function GET() {
 try {
  const supabase = await createClient();

  // Verificar autenticación y rol
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
   return NextResponse.json(
    { error: 'Unauthorized', message: 'No autenticado' },
    { status: 401 }
   );
  }

  const { data: profile } = await supabase
   .from('profiles')
   .select('role')
   .eq('id', user.id)
   .single();

  if (profile?.role !== 'SUPER_ADMIN') {
   return NextResponse.json(
    { error: 'Forbidden', message: 'Acceso denegado' },
    { status: 403 }
   );
  }

  // Obtener configuración
  const { data: config, error } = await supabase
   .from('ai_config')
   .select('*')
   .single();

  if (error) {
   return NextResponse.json(
    { error: 'NotFound', message: 'Configuración no encontrada' },
    { status: 404 }
   );
  }

  // ✅ Verificar si la API key está configurada en variables de entorno
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  const response: AIConfigResponse = {
   ...config,
   api_key_status: hasApiKey ? 'configured' : 'missing'
  };

  return NextResponse.json(response);

 } catch (error) {
  console.error('Error getting AI config:', error);
  return NextResponse.json(
   { error: 'InternalError', message: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}

// =========================================================================
// PUT: Actualizar configuración
// =========================================================================
export async function PUT(request: NextRequest) {
 try {
  const supabase = await createClient();

  // Verificar autenticación y rol
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
   return NextResponse.json(
    { error: 'Unauthorized', message: 'No autenticado' },
    { status: 401 }
   );
  }

  const { data: profile } = await supabase
   .from('profiles')
   .select('role')
   .eq('id', user.id)
   .single();

  if (profile?.role !== 'SUPER_ADMIN') {
   return NextResponse.json(
    { error: 'Forbidden', message: 'Acceso denegado' },
    { status: 403 }
   );
  }

  // Validar entrada
  const body = await request.json();
  const validation = updateConfigSchema.safeParse(body);

  if (!validation.success) {
   return NextResponse.json(
    {
     error: 'ValidationError',
     message: 'Datos inválidos',
     details: validation.error.errors
    },
    { status: 400 }
   );
  }

  const updates = validation.data;

  // ✅ Ya no es necesario cifrar api_key - viene de .env.local
  const updateData = {
   ...updates,
   updated_at: new Date().toISOString()
  };

  // Actualizar
  const { data: config, error } = await supabase
   .from('ai_config')
   .update(updateData)
   .eq('id', '00000000-0000-0000-0000-000000000001')
   .select()
   .single();

  if (error) {
   return NextResponse.json(
    { error: 'UpdateError', message: error.message },
    { status: 500 }
   );
  }

  // ✅ Retornar configuración actualizada con estado de API key
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  const response: AIConfigResponse = {
   ...config,
   api_key_status: hasApiKey ? 'configured' : 'missing'
  };

  return NextResponse.json(response);

 } catch (error) {
  console.error('Error updating AI config:', error);
  return NextResponse.json(
   { error: 'InternalError', message: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
