import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "~/env";

export async function createClient() {
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
}

/**
 * For dashboard server components/actions. proxy.ts already redirects
 * unauthenticated `/dashboard/*` requests, but that's not a substitute for
 * checking here too - defense in depth per Supabase's SSR auth guidance.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

/**
 * For everything behind `/dashboard`. An account with no profile row hasn't
 * finished onboarding, so send it back there rather than rendering a
 * dashboard that can't greet the user by name.
 */
export async function requireProfile() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "user_id, first_name, last_name, date_of_birth, use_type, created_at",
    )
    .eq("user_id", user.id)
    .maybeSingle<Profile>();

  if (!profile) {
    redirect("/onboarding");
  }

  return { supabase, user, profile };
}
