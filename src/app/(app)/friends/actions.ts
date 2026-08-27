"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "~/lib/supabase/server";

export type FriendActionResult = {
  ok: boolean;
  message: string;
  /* Where the two of you now stand. Present when the call changed that, so a
     search result can restate itself without the caller having to match on the
     wording of `message` — which is how a copy edit becomes a bug. */
  status?: "outgoing" | "friends";
};

/** Anything that is not this shape never reaches the database. */
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function refresh() {
  revalidatePath("/friends");
  // The rail carries the count of people waiting on an answer, and it renders
  // on every screen — so answering one here has to invalidate all of them.
  revalidatePath("/", "layout");
}

/**
 * Asks somebody to be friends.
 *
 * The interesting branch is the collision. `friendships_pair_key` makes the
 * *relationship* unique rather than the direction it was asked in, so if they
 * asked you an hour ago, your request is a duplicate key rather than a second
 * pending row. That is the right constraint and the wrong error message: two
 * people who have each independently asked for the same thing have agreed, and
 * the only sensible reading is to accept.
 */
export async function sendFriendRequest(
  addresseeId: string,
): Promise<FriendActionResult> {
  const { supabase, user } = await requireUser();

  if (!UUID.test(addresseeId)) {
    return { ok: false, message: "That isn't someone we can find." };
  }
  if (addresseeId === user.id) {
    return { ok: false, message: "You are already yourself." };
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: addresseeId,
    status: "pending",
  });

  if (!error) {
    refresh();
    return { ok: true, message: "Request sent.", status: "outgoing" };
  }

  if (error.code !== "23505") {
    console.error("Friend request failed:", error);
    return { ok: false, message: "Couldn't send that request. Try again." };
  }

  /* There is already a row for this pair. Which one decides what just
     happened, and only three answers are possible. */
  const { data: existing } = await supabase
    .from("friendships")
    .select("id, requester_id, status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`,
    )
    .maybeSingle<{ id: string; requester_id: string; status: string }>();

  if (!existing) {
    // A row exists that the caller cannot read, which the policies should make
    // impossible for a pair they are half of. Say something true rather than
    // something reassuring.
    return { ok: false, message: "Couldn't send that request. Try again." };
  }

  if (existing.status === "accepted") {
    refresh();
    return { ok: true, message: "You are already friends.", status: "friends" };
  }

  if (existing.requester_id === user.id) {
    return {
      ok: true,
      message: "You have already asked. Waiting on them.",
      status: "outgoing",
    };
  }

  // They asked first. Both sides now want it, so it is accepted.
  return respondToRequest(existing.id, true);
}

/**
 * Answers a request.
 *
 * Accepting is an update the database only lets the addressee make — see the
 * `friendships_update_authenticated` policy, which checks `addressee_id` and
 * is the one line stopping somebody accepting their own request. Declining is
 * a delete, because a declined row that stayed would block the pair index for
 * ever and neither person could ever ask again.
 */
export async function respondToRequest(
  requestId: string,
  accept: boolean,
): Promise<FriendActionResult> {
  const { supabase } = await requireUser();

  if (!UUID.test(requestId)) {
    return { ok: false, message: "That request no longer exists." };
  }

  if (!accept) {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", requestId);
    if (error) {
      console.error("Declining a request failed:", error);
      return { ok: false, message: "Couldn't decline that. Try again." };
    }
    refresh();
    return { ok: true, message: "Request declined." };
  }

  const { data, error } = await supabase
    .from("friendships")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", requestId)
    // Asked for back and checked: an update that matches no row under RLS
    // succeeds and changes nothing, which would report an acceptance that did
    // not happen.
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    console.error("Accepting a request failed:", error);
    return { ok: false, message: "Couldn't accept that. Try again." };
  }

  refresh();
  return { ok: true, message: "You are friends.", status: "friends" };
}

/** Unfriending, and cancelling a request you sent. The same delete. */
export async function removeFriendship(
  friendshipId: string,
): Promise<FriendActionResult> {
  const { supabase } = await requireUser();

  if (!UUID.test(friendshipId)) {
    return { ok: false, message: "That no longer exists." };
  }

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId);

  if (error) {
    console.error("Removing a friendship failed:", error);
    return { ok: false, message: "Couldn't do that. Try again." };
  }

  refresh();
  return { ok: true, message: "Removed." };
}
