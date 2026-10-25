"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// "Mark as read": decisions before now stop counting as new.
// The database function only ever updates the signed-in person's own profile.
export async function markRemindersSeen() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notifications_seen");
  if (error) {
    return { error: error.message };
  }
  refresh();
  return null;
}
