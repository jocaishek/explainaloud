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
