import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "submitter" | "approver";

export type CurrentUser = {
  id: string;
  fullName: string;
  role: Role;
};

// Who is signed in, with their name and role from profiles.
// Sends them to the sign-in page if nobody is signed in.
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .single();

  return {
    id: userId,
    fullName: profile?.full_name ?? data.claims.email ?? "Unknown",
    role: (profile?.role as Role) ?? "submitter",
  };
}
