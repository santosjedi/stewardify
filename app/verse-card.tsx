import styles from "./page.module.css";

// The wording and attributions here must stay exactly as given.
const REMINDERS = [
  {
    text: "God's work done in God's way will never lack God's supply.",
    source: "Hudson Taylor, founder of the China Inland Mission",
  },
  {
    text: "Gain all you can, save all you can, give all you can.",
    source: "John Wesley, sermon “The Use of Money”, 1744",
  },
  {
    text: "He is no fool who gives what he cannot keep to gain that which he cannot lose.",
    source: "Jim Elliot, missionary martyr, 1927–1956",
  },
  {
    text: "We who valued above all things the acquiring of wealth and possessions, now bring what we have into a common stock, and communicate to every one in need.",
    source: "Justin Martyr, First Apology, c. 155",
  },
  {
    text: "Eighty and six years have I served Him, and He never did me any injury: how then can I blaspheme my King and my Saviour?",
    source: "Polycarp of Smyrna, martyr, c. 69–155",
  },
  {
    text: "Earthly goods are given to be used, not to be collected.",
    source: "Dietrich Bonhoeffer, The Cost of Discipleship",
  },
];

// The rotation starts on this day (Philippine time) with the first reminder above.
const FIRST_DAY = Date.UTC(2026, 9, 25); // October 25, 2026

// Today's reminder: the same for everyone on a given day (Philippine time),
// moving to the next one each day.
function todaysReminder(now: Date) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(now);
  const [year, month, day] = today.split("-").map(Number);
  const days = Math.floor((Date.UTC(year, month - 1, day) - FIRST_DAY) / 86_400_000);
  const count = REMINDERS.length;
  return REMINDERS[((days % count) + count) % count];
}

export function VerseCard() {
  const reminder = todaysReminder(new Date());

  return (
    <figure className={styles.verse}>
      <figcaption className={styles.verseLabel}>Reminder of the day</figcaption>
      <blockquote className={styles.verseText}>“{reminder.text}”</blockquote>
      <p className={styles.verseSource}>{reminder.source}</p>
    </figure>
  );
}
