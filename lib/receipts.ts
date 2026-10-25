import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Receipts are private, so ask for temporary links (good for 1 hour) to show them.
// Returns a map from receipt path to its link.
export async function getReceiptUrls(supabase: Supabase, paths: (string | null)[]) {
  const urls = new Map<string, string>();
  const realPaths = paths.filter((p): p is string => Boolean(p));
  if (realPaths.length === 0) {
    return urls;
  }

  const { data } = await supabase.storage.from("receipts").createSignedUrls(realPaths, 60 * 60);
  data?.forEach((s) => s.path && s.signedUrl && urls.set(s.path, s.signedUrl));
  return urls;
}
