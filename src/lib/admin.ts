/**
 * Who can see the admin dashboard.
 *
 * **This list has a twin in the database.** `is_explainaloud_admin()` holds the
 * same addresses and is what actually gates the data — this one only decides
 * whether the nav link is drawn and whether the per-day caps apply. Changing
 * one without the other gives somebody a link to a page whose every query the
 * database then refuses, which looks like a bug rather than a permission.
 *
 * Kept as literals rather than an environment variable on purpose: an admin
 * list that can be changed by editing a deployment setting is a privilege
 * escalation with no code review and no history. These change through a commit
 * and a migration, both of which leave a trail.
 */
export const ADMIN_EMAILS = [
  "jovanny.shek@gmail.com",
  "rboyapati2010@gmail.com",
] as const;

/** Retained so nothing that imported the single-address form breaks. */
export const ADMIN_EMAIL = ADMIN_EMAILS[0];

export function isAdminEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLocaleLowerCase("en-US");
  if (!normalized) return false;
  return (ADMIN_EMAILS as readonly string[]).includes(normalized);
}
