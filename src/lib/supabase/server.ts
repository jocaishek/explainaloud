import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { env } from "~/env";

/**
 * Request-scoped Supabase client.
 *
 * `cache()` dedupes within a single render pass, so a layout and the page
 * nested inside it share one client instead of constructing two.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    },
  );
});

/**
 * The authenticated user, fetched at most once per request.
 *
 * `getUser()` is a network round-trip to Supabase's auth server — it verifies
 * the JWT rather than trusting the cookie. That's the correct security
 * posture, but it made navigation crawl: the proxy, the dashboard layout and
 * the page each called it independently, so one click cost three sequential
 * verifications plus two duplicate profile queries. `cache()` collapses every
 * call inside a render pass into one.
 */
const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

/**
 * For dashboard server components/actions. proxy.ts already redirects
 * unauthenticated `/dashboard/*` requests, but that's not a substitute for
 * checking here too - defense in depth per Supabase's SSR auth guidance.
 */
export async function requireUser() {
  const { supabase, user } = await getCachedUser();

  if (!user) {
    redirect("/");
  }

  return { supabase, user };
}

export type Profile = {
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  use_type: "school" | "teacher" | "personal";
  created_at: string;
};

/** Deduped per request for the same reason as the user lookup above. */
const getCachedProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "user_id, first_name, last_name, date_of_birth, use_type, created_at",
    )
    .eq("user_id", userId)
    .maybeSingle<Profile>();
  return data;
});

/**
 * For everything behind `/dashboard`. An account with no profile row hasn't
 * finished onboarding, so send it back there rather than rendering a
 * dashboard that can't greet the user by name.
 */
export async function requireProfile() {
  const { supabase, user } = await requireUser();
  const profile = await getCachedProfile(user.id);

  if (!profile) {
    redirect("/onboarding");
  }

  return { supabase, user, profile };
}
