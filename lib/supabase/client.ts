import { createBrowserClient } from "@supabase/ssr";

// The connection to Supabase from inside the browser, as the signed-in person.
// Used to upload receipt photos straight to storage.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
