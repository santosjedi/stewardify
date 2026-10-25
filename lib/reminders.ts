import { cache } from "react";
import type { CurrentUser } from "@/lib/auth";
import { addDays, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type Reminder = {
  id: string;
  kind: "review" | "revise" | "decided";
  title: string;
  date: string; // a plain date for deadlines, a timestamp for decisions
  overdue: boolean;
  status: "pending" | "approved" | "rejected";
  href: string;
};

type Row = {
  id: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  submitted_by: string;
  needed_by: string | null;
  revise_by: string | null;
  reviewed_at: string | null;
};

// Everything that needs this person's attention. Worked out once per page load.
//   Approvers: other people's pending expenses needed within 3 days, or overdue.
//   Everyone: their own rejected expenses to revise within 3 days, or overdue,
//   and their own expenses approved or rejected since they last marked
//   reminders as read.
// "This week" counts the same deadlines over the next 7 days, for the banner.
export const getReminders = cache(async (user: CurrentUser) => {
  const supabase = await createClient();
  const today = todayISO();
  const inThreeDays = addDays(today, 3);
  const inAWeek = addDays(today, 7);

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, description, status, submitted_by, needed_by, revise_by, reviewed_at"),
    supabase.from("profiles").select("notifications_seen_at, created_at").eq("id", user.id).single(),
  ]);

  const expenses = (rows ?? []) as Row[];
  const seenSince = profile?.notifications_seen_at ?? profile?.created_at ?? null;

  const toReview = expenses.filter(
    (e) => user.role === "approver" && e.status === "pending" && e.needed_by && e.submitted_by !== user.id
  );
  const toRevise = expenses.filter(
    (e) => e.submitted_by === user.id && e.status === "rejected" && e.revise_by
  );

  const reminders: Reminder[] = [
    ...toReview
      .filter((e) => e.needed_by! <= inThreeDays)
      .map((e) => ({
        id: e.id,
        kind: "review" as const,
        title: e.description,
        date: e.needed_by!,
        overdue: e.needed_by! < today,
        status: e.status,
        href: "/approvals",
      })),
    ...toRevise
      .filter((e) => e.revise_by! <= inThreeDays)
      .map((e) => ({
        id: e.id,
        kind: "revise" as const,
        title: e.description,
        date: e.revise_by!,
        overdue: e.revise_by! < today,
        status: e.status,
        href: `/expenses/${e.id}/edit`,
      })),
    ...expenses
      .filter(
        (e) =>
          e.submitted_by === user.id &&
          e.status !== "pending" &&
          e.reviewed_at &&
          (!seenSince || e.reviewed_at > seenSince)
      )
      .sort((a, b) => b.reviewed_at!.localeCompare(a.reviewed_at!))
      .map((e) => ({
        id: e.id,
        kind: "decided" as const,
        title: e.description,
        date: e.reviewed_at!,
        overdue: false,
        status: e.status,
        href: "/",
      })),
  ];

  return {
    reminders,
    reviewThisWeek: toReview.filter((e) => e.needed_by! <= inAWeek).length,
    reviseThisWeek: toRevise.filter((e) => e.revise_by! <= inAWeek).length,
  };
});
