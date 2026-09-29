import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente seguro para el navegador (usando la llave anónima, protegida por RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
