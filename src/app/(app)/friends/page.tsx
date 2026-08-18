import { requireProfile } from "~/lib/supabase/server";
import { FriendsClient } from "./friends-client";
import type { Friend, PendingRequest } from "./types";

export const metadata = { title: "Friends · Explainaloud" };

export default async function FriendsPage() {
  const { supabase, user, profile } = await requireProfile();
  const zone = profile.timezone ?? "UTC";

  /* Functions rather than queries, because the profiles policy lets you read
     exactly one row — your own. Everything a friend's card shows comes back
     through a `security definer` function that checks the friendship itself;
     see `friend_overview`. */
  const [
    { data: friends, error: friendsError },
    { data: requests, error: requestsError },
    { data: streak },
    { count: topics },
  ] = await Promise.all([
    supabase.rpc("friend_overview"),
    supabase.rpc("friend_requests"),
    supabase.rpc("own_streak", { zone }),
    // Head-only: the card wants the number, never the rows.
    supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  /* Told apart from "you have no friends", which is what an empty array means
     and what a failed call used to look like. Somebody with eleven friends
     seeing an empty screen has been lied to; somebody seeing "we couldn't load
     this" has been told something true and can try again. */
  const loadFailed = Boolean(friendsError || requestsError);
  if (friendsError) console.error("Loading friends failed:", friendsError);
  if (requestsError) console.error("Loading requests failed:", requestsError);

  return (
    <FriendsClient
      you={{
        firstName: profile.first_name,
        lastName: profile.last_name,
        username: profile.username,
        avatarUrl: profile.avatar_url,
        streak: typeof streak === "number" ? streak : 0,
        topics: topics ?? 0,
      }}
      friends={(friends ?? []) as Friend[]}
      requests={(requests ?? []) as PendingRequest[]}
      loadFailed={loadFailed}
    />
  );
}
