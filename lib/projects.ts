import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Project / Program names used before, for the form's suggestions.
// Security rules decide which expenses count: your own, or all for approvers.
export async function projectSuggestions(supabase: Supabase) {
  const { data } = await supabase.from("expenses").select("project").not("project", "is", null);
  const names = new Map<string, string>();
  for (const row of data ?? []) {
    const name = String(row.project).trim();
    if (name && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}
