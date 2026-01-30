/**
 * API Endpoint: /api/admin/audit-logs
 * 
 * GET: Listar logs de auditoría con paginación y filtros
 * Query params: page, limit, action, user_id, resource_type, from, to
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-cookies';

export async function GET(request: NextRequest) {
 try {
  const supabase = await createClient();

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
   return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Verificar rol de admin
  const { data: profile } = await supabase
   .from('profiles')
   .select('role')
   .eq('id', user.id)
   .single();

  if (!profile || !['SUPER_ADMIN', 'ADMIN'].includes(profile.role)) {
   return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  // Obtener parámetros de query
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const action = searchParams.get('action');
  const userId = searchParams.get('user_id');
  const resourceType = searchParams.get('resource_type');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  // Construir query base
  let query = supabase
   .from('audit_logs')
   .select(`
        id,
        user_id,
        action,
        resource_type,
        resource_id,
        old_value,
        new_value,
        ip_address,
        created_at,
        profiles:user_id (
          full_name,
          email
        )
      `, { count: 'exact' });

  // Aplicar filtros
  if (action) {
   query = query.eq('action', action);
  }
  if (userId) {
   query = query.eq('user_id', userId);
  }
  if (resourceType) {
   query = query.eq('resource_type', resourceType);
  }
  if (from) {
   query = query.gte('created_at', from);
  }
  if (to) {
   query = query.lte('created_at', to);
  }

  // Paginación y orden
  const offset = (page - 1) * limit;
  query = query
   .order('created_at', { ascending: false })
   .range(offset, offset + limit - 1);

  const { data: logs, error, count } = await query;

  if (error) {
   console.error('[Audit Logs] Error:', error);
   return NextResponse.json({ error: 'Error al obtener logs' }, { status: 500 });
  }

  // Obtener acciones únicas para filtros
  const { data: actions } = await supabase
   .from('audit_logs')
   .select('action')
   .order('action');

  const uniqueActions = [...new Set(actions?.map(a => a.action) || [])];

  // Obtener tipos de recurso únicos
  const { data: resourceTypes } = await supabase
   .from('audit_logs')
   .select('resource_type')
   .order('resource_type');

  const uniqueResourceTypes = [...new Set(resourceTypes?.map(r => r.resource_type) || [])];

  return NextResponse.json({
   logs: logs || [],
   pagination: {
    page,
    limit,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
   },
   filters: {
    actions: uniqueActions,
    resourceTypes: uniqueResourceTypes,
   },
  });

 } catch (error) {
  console.error('[Audit Logs] Unexpected error:', error);
  return NextResponse.json({ error: 'Error interno' }, { status: 500 });
 }
}

/**
 * DELETE: Purgar logs antiguos (solo SUPER_ADMIN)
 */
export async function DELETE() {
 try {
  const supabase = await createClient();

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
   return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Verificar rol de SUPER_ADMIN
  const { data: profile } = await supabase
   .from('profiles')
   .select('role')
   .eq('id', user.id)
   .single();

  if (!profile || profile.role !== 'SUPER_ADMIN') {
   return NextResponse.json({ error: 'Solo SUPER_ADMIN puede purgar logs' }, { status: 403 });
  }

  // Obtener días de retención de configuración
  const { data: config } = await supabase
   .from('security_config')
   .select('value')
   .eq('key', 'audit_retention_days')
   .single();

  const retentionDays = config?.value || 90;
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  // Contar logs a purgar
  const { count } = await supabase
   .from('audit_logs')
   .select('id', { count: 'exact', head: true })
   .lt('created_at', cutoffDate);

  // Purgar logs antiguos
  const { error } = await supabase
   .from('audit_logs')
   .delete()
   .lt('created_at', cutoffDate);

  if (error) {
   console.error('[Audit Logs] Error purging:', error);
   return NextResponse.json({ error: 'Error al purgar logs' }, { status: 500 });
  }

  // Registrar la purga
  await supabase.from('audit_logs').insert({
   user_id: user.id,
   action: 'PURGE_AUDIT_LOGS',
   resource_type: 'system',
   new_value: { purged_count: count, retention_days: retentionDays },
  });

  return NextResponse.json({
   success: true,
   purgedCount: count,
   message: `Se purgaron ${count} logs anteriores a ${retentionDays} días`,
  });

 } catch (error) {
  console.error('[Audit Logs] Unexpected error:', error);
  return NextResponse.json({ error: 'Error interno' }, { status: 500 });
 }
}
