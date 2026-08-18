import { notFound } from "next/navigation";
import type { PublicProfile } from "~/app/(app)/friends/types";
import { requireProfile } from "~/lib/supabase/server";
import { normaliseUsername } from "~/lib/username";
import { ProfileView } from "./profile-view";

/**
 * Somebody's profile, at a URL you can send to them.
 *
 * Inside the `(app)` group on purpose, which is what makes it require a
 * signed-in account: `requireProfile` redirects anybody else to the front
 * page. A profile is open to the service, not to the web — nothing here is
 * crawlable, and a stranger who wants to look somebody up has to be somebody
 * themselves first.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const handle = normaliseUsername(decodeURIComponent(username));
  return {
    title: `@${handle} · Explainaloud`,
    /* Not indexable, and said twice: the route is behind auth so a crawler
       never reaches it, and this is the belt to that pair of braces. */
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { supabase } = await requireProfile();
  const { username } = await params;
  const handle = normaliseUsername(decodeURIComponent(username));

  const { data, error } = await supabase.rpc("public_profile", {
    handle,
  });

  if (error) {
    console.error("Loading a profile failed:", error);
  }

  const profile = ((data ?? []) as PublicProfile[])[0];

  /* A handle nobody holds is a 404, and it says the same thing as a handle
     that never existed. Distinguishing them would turn this route into a way
     of testing whether a username is taken without the rate limits or the
     account the rest of the product requires. */
  if (!profile) notFound();

  return <ProfileView profile={profile} />;
}
