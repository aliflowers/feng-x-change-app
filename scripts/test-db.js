
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kltdktiqliipphcbtjfp.supabase.co';
// Usar la ANON KEY para simular el acceso público como en el endpoint
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsdGRrdGlxbGlpcHBoY2J0amZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NzUxOTgsImV4cCI6MjA4NDQ1MTE5OH0.byKxXzZ5SAA5GHiiUZMrfHG3KKSFE1o7-793__ztw7Y';

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key (last 10):', supabaseAnonKey.slice(-10));

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
 try {
  const { data, error } = await supabase
   .from('business_info')
   .select('key, value')
   .limit(5);

  if (error) {
   console.error('❌ Error fetching business_info:', error);
  } else {
   console.log('✅ Success! Data:', data);
  }
 } catch (e) {
  console.error('❌ Exception:', e);
 }
}

test();
