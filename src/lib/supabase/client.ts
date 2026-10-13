import { createBrowserClient } from '@supabase/ssr';

// Cliente único del navegador. Usa la MISMA sesión (cookies) que el login y el proxy del servidor.
// Antes este archivo creaba un segundo cliente con localStorage, que podía no ver la sesión del login.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
