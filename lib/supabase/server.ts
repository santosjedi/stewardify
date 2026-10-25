import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// The connection to our Supabase project, as the person who is signed in.
// Their sign-in is kept in browser cookies; the RLS rules use it to decide what they can see.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Pages can't save cookies. That's fine: proxy.ts keeps sign-ins fresh.
          }
        },
      },
    }
  );
}
