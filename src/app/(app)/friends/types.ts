/** What the four friend functions in the database hand back. */

export type Friend = {
  user_id: string;
  friendship_id: string;
  username: string | null;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  /** How many topics they have built. */
  topics: number;
  /** Days in a row, counted in their timezone rather than in yours. */
  streak: number;
  friends_since: string;
};

export type PendingRequest = {
  id: string;
  direction: "incoming" | "outgoing";
  user_id: string;
  username: string | null;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  created_at: string;
};

/** Where a search result already stands with you. */
export type PersonStatus = "none" | "friends" | "incoming" | "outgoing";

export type SearchResult = {
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  status: PersonStatus;
  request_id: string | null;
};

/**
 * You, as the friends screen shows you.
 *
 * The same two numbers a friend sees, deliberately. A page that shows other
 * people a streak and a topic count and shows you something else is a page
 * where you cannot tell what you are sharing.
 */
export type You = {
  firstName: string;
  lastName: string;
  /** Null on accounts made before usernames existed. */
  username: string | null;
  avatarUrl: string | null;
  streak: number;
  topics: number;
};

/** A profile as `/profiles/<username>` renders it. */
export type PublicProfile = {
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  member_since: string;
  status: PersonStatus | "self";
  request_id: string | null;
  /** Null for a stranger, which is not the same as zero. */
  topics: number | null;
  streak: number | null;
};
