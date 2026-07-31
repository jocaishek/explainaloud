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

  if (error || !parsed.success) {
    throw new Error("Could not load admin statistics.");
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-strong">
          User activity
        </h1>
        <p className="mt-2 max-w-2xl text-foreground">
          Read-only account and topic statistics. Private notes, sources,
          transcripts, and course content are not shown.
        </p>
      </div>

      <dl className="flex flex-wrap divide-x divide-border overflow-hidden rounded-xl border border-border bg-card">
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

        <div className="overflow-hidden rounded-xl border border-border bg-card">
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
