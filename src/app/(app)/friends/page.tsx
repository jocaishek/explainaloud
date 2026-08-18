import { requireProfile } from "~/lib/supabase/server";
import { FriendsClient } from "./friends-client";
import type { Friend, PendingRequest } from "./types";

export const metadata = { title: "Friends · Explainaloud" };

export default async function FriendsPage() {
  const { supabase, profile } = await requireProfile();

  /* Two functions rather than two queries, because the profiles policy lets
     you read exactly one row — your own. Everything a friend's card shows
     comes back through a `security definer` function that checks the
     friendship itself; see `friend_overview`. */
  const [{ data: friends, error: friendsError }, { data: requests }] =
    await Promise.all([
      supabase.rpc("friend_overview"),
      supabase.rpc("friend_requests"),
    ]);

  if (friendsError) {
    console.error("Loading friends failed:", friendsError);
  }

  return (
    <FriendsClient
      friends={(friends ?? []) as Friend[]}
      requests={(requests ?? []) as PendingRequest[]}
      needsUsername={!profile.username}
    />
  );
}
