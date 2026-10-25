import { createClient } from "@supabase/supabase-js";

// The connection to our Supabase project. The two values come from .env.local.
// The publishable key is safe to use in the browser; RLS rules decide what it can do.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);
