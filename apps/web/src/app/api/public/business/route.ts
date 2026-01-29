import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Este endpoint es público - devuelve solo información no sensible del negocio
export async function GET() {
 try {
  // Usar anon key para lectura pública (la tabla tiene RLS para campos públicos)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
   .from('business_info')
   .select('key, value')
   .in('key', ['business_name', 'logo_url', 'contact_email', 'contact_phone', 'contact_whatsapp', 'address', 'business_hours']);

  if (error) {
   console.error('Error fetching public business info:', error);
   return NextResponse.json(
    { error: 'Error al obtener información' },
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
  console.error('Error en GET /api/public/business:', error);
  return NextResponse.json(
   { error: 'Error interno del servidor' },
   { status: 500 }
  );
 }
}
