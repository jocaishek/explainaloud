import { ChevronDown } from "lucide-react";
import { z } from "zod";
import { requireAdmin } from "~/lib/supabase/server";

const adminTopicSchema = z.object({
  id: z.string().uuid(),
  topic: z.string(),
  name: z.string().nullable(),
  status: z.string(),
  created_at: z.string(),
});

const adminUserOverviewSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().nullable(),
  /* Optional as well as nullable, and the two mean different things.
   *
   * Null is an account that has no handle — everybody who signed up before
   * usernames existed and has not been backfilled. Absent is a database whose
   * `admin_user_overview` predates this column, which is the state between
   * this deploying and its migration being pushed. Rejecting that would take
   * the whole page down over a field that is decoration, so it renders a dash
   * and the counts still work. */
  username: z.string().nullable().optional(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  joined_at: z.string(),
  topic_count: z.coerce.number().int().nonnegative(),
  recording_count: z.coerce.number().int().nonnegative(),
  topics: z.array(adminTopicSchema),
});

type AdminUserOverview = z.infer<typeof adminUserOverviewSchema>;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function displayName(user: AdminUserOverview) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return name || "Onboarding incomplete";
}

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_user_overview");
  const parsed = z.array(adminUserOverviewSchema).safeParse(data);

  /* Say which of the two went wrong, and what it said.
   *
   * This threw one sentence for both cases and logged neither, so a broken
   * admin page produced a black screen with an error digest on it and nothing
   * anywhere that named a cause — the database's own message, which is the
   * only part worth having, was discarded at the point it arrived. Postgres
   * error messages are specific and this page is behind an admin check, so
   * there is nothing here worth hiding from the server log. */
  if (error) {
    console.error("admin_user_overview failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  } else if (!parsed.success) {
    console.error(
      "admin_user_overview returned an unexpected shape:",
      parsed.error.issues.slice(0, 5),
    );
  }

  /* And it does not take the route down.
   *
   * Throwing from a server component is a 500 and Vercel's own error page —
   * no navigation, no way back, nothing that says which page failed. The
   * statistics are the only thing that depends on this call, so failing it
   * renders as a panel where the statistics would have been, inside a page
   * that still works. */
  if (error || !parsed.success) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <h1 className="font-semibold text-3xl text-strong tracking-tight">
          User activity
        </h1>
        <div
          role="alert"
          className="rounded-card border border-border bg-card p-5 shadow-rest"
        >
          <p className="font-medium text-strong text-sm">
            Couldn&apos;t load the statistics.
          </p>
          <p className="mt-1 text-sm text-subtle">
            {error
              ? "The database refused the request. The reason is in the server log."
              : "The database answered in a shape this page does not recognise. The details are in the server log."}
          </p>
        </div>
      </div>
    );
  }

  const users = parsed.data;
  const totalTopics = users.reduce(
    (total, user) => total + Number(user.topic_count),
    0,
  );
  const totalRecordings = users.reduce(
    (total, user) => total + Number(user.recording_count),
    0,
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-stack px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-strong">
          User activity
        </h1>
        <p className="mt-2 max-w-2xl text-foreground">
          Read-only account and topic statistics. Private notes, sources,
          transcripts, and course content are not shown.
        </p>
      </div>

      <dl className="flex flex-wrap divide-x divide-border overflow-hidden rounded-card border border-border bg-card shadow-rest">
        {[
          ["Users", users.length],
          ["Topics", totalTopics],
          ["Recordings", totalRecordings],
        ].map(([label, value]) => (
          <div key={label} className="min-w-36 flex-1 px-5 py-4">
            <dt className="text-sm text-subtle">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-strong tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="users-heading">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 id="users-heading" className="text-lg font-semibold text-strong">
            Every user
          </h2>
          <p className="text-sm text-subtle">
            {users.length} account{users.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="overflow-hidden rounded-card border border-border bg-card shadow-rest">
          <div className="hidden grid-cols-[minmax(0,1.7fr)_0.55fr_0.65fr_0.8fr_1.5rem] gap-4 border-b border-border bg-surface px-5 py-3 text-xs font-medium text-subtle md:grid">
            <span>User</span>
            <span>Topics</span>
            <span>Recordings</span>
            <span>Joined</span>
            <span className="sr-only">Expand</span>
          </div>

          {users.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-subtle">
              No accounts yet.
            </p>
          ) : (
            users.map((user) => (
              <details
                key={user.user_id}
                className="group border-b border-border last:border-b-0"
              >
                <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_1.5rem] items-center gap-4 px-5 py-4 transition-colors hover:bg-surface md:grid-cols-[minmax(0,1.7fr)_0.55fr_0.65fr_0.8fr_1.5rem]">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-strong">
                      {displayName(user)}
                    </span>
                    <span className="block truncate text-xs text-subtle">
                      {/* The handle first, because it is what every other
                          screen in the product calls this person and what a
                          support message will quote at you. The email is the
                          account, and stays — but it is the thing you check
                          second. */}
                      {user.username ? (
                        <span className="font-mono text-foreground">
                          @{user.username}
                        </span>
                      ) : (
                        <span title="No username set">—</span>
                      )}
                      <span aria-hidden> · </span>
                      {user.email ?? "No email"}
                    </span>
                  </span>
                  <span className="hidden text-sm text-foreground tabular-nums md:block">
                    {user.topic_count}
                  </span>
                  <span className="hidden text-sm text-foreground tabular-nums md:block">
                    {user.recording_count}
                  </span>
                  <span className="hidden text-sm text-subtle md:block">
                    {dateFormatter.format(new Date(user.joined_at))}
                  </span>
                  <ChevronDown className="size-4 text-subtle transition-transform duration-200 group-open:rotate-180" />
                  <span className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle md:hidden">
                    <span>{user.topic_count} topics</span>
                    <span>{user.recording_count} recordings</span>
                    <span>
                      Joined {dateFormatter.format(new Date(user.joined_at))}
                    </span>
                  </span>
                </summary>

                <div className="border-t border-border bg-surface px-5 py-4">
                  <h3 className="text-sm font-semibold text-strong">
                    Topics created
                  </h3>
                  {user.topics.length === 0 ? (
                    <p className="mt-2 text-sm text-subtle">
                      No topics created.
                    </p>
                  ) : (
                    <ul className="mt-3 divide-y divide-border">
                      {user.topics.map((topic) => {
                        const title = topic.name?.trim() || topic.topic;
                        return (
                          <li
                            key={topic.id}
                            className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-strong">
                                {title}
                              </span>
                              {title !== topic.topic && (
                                <span className="mt-0.5 block text-xs text-subtle">
                                  Topic: {topic.topic}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-xs text-subtle">
                              {dateFormatter.format(new Date(topic.created_at))}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </details>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
