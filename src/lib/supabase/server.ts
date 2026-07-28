import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
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

type AuthenticatedUser = {
  id: string;
  email?: string;
};

/**
 * The authenticated identity, verified at most once per render pass.
 *
 * `getClaims()` verifies the JWT signature and normally does that locally
 * against Supabase's cached public key. Unlike `getUser()`, it does not add an
 * Auth-server round trip to every tab click. Course data remains protected by
 * both this verified subject and owner-scoped RLS queries.
 */
const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = error ? null : data?.claims.sub;
  const email = data?.claims.email;
  const user: AuthenticatedUser | null =
    typeof subject === "string"
      ? {
          id: subject,
          ...(typeof email === "string" ? { email } : {}),
        }
      : null;
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

/**
 * Requires both the expected verified identity and the database's admin check.
 * A hidden navigation item is not authorization; this protects direct URLs too.
 */
export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.rpc("is_ropes_admin");

  if (error || data !== true) {
    notFound();
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
