import { createClient } from '@supabase/supabase-js';

// The admin client uses the Service Role Key to bypass Row Level Security (RLS)
// It should ONLY be used in secure server environments (like API routes or Server Actions), never on the client.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
