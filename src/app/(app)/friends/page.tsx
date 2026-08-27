import { requireProfile } from "~/lib/supabase/server";
import { FriendsClient } from "./friends-client";
import type { Friend, PendingRequest, Squad, SquadRow } from "./types";

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
    { data: squadRows, error: squadsError },
  ] = await Promise.all([
    supabase.rpc("friend_overview"),
    supabase.rpc("friend_requests"),
    supabase.rpc("own_streak", { zone }),
    // Head-only: the card wants the number, never the rows.
    supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase.rpc("squad_overview"),
  ]);

  /* Flat rows in, squads out. One row per member per squad is the shape that
     costs one round trip; the shape the panel wants is this one. */
  const squads: Squad[] = [];
  for (const row of (squadRows ?? []) as SquadRow[]) {
    let squad = squads.find((entry) => entry.id === row.squad_id);
    if (!squad) {
      squad = {
        id: row.squad_id,
        name: row.squad_name,
        joinCode: row.join_code,
        isOwner: row.is_owner,
        streak: row.streak,
        members: [],
      };
      squads.push(squad);
    }
    squad.members.push({
      id: row.member_id,
      username: row.member_username,
      avatarUrl: row.member_avatar_url,
      recordedToday: row.recorded_today,
    });
  }
  if (squadsError) console.error("Loading squads failed:", squadsError);

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
      squads={squads}
      requests={(requests ?? []) as PendingRequest[]}
      loadFailed={loadFailed}
    />
  );
}
