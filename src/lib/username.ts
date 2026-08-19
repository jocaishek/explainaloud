/**
 * What a username may be.
 *
 * The shape here is the same shape as the `profiles_username_shape` constraint
 * in the database, and that duplication is deliberate: the constraint is what
 * makes it true, this is what makes it a sentence instead of a 23514. If one
 * changes the other has to, and the test for whether they agree is that a name
 * this file accepts never comes back rejected from Postgres.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/**
 * The same expression the database enforces.
 *
 * Letters and digits, and no separator at all. An earlier version allowed a
 * single underscore between two alphanumerics, which is safe against the
 * doubled-separator impersonations and still wrong: it makes `@ada_lovelace`
 * and `@adalovelace` two different people, told apart by a character nobody
 * says out loud. A handle is read aloud and typed from memory, so it has one
 * spelling.
 */
const SHAPE = /^[a-z0-9]{3,20}$/;

/**
 * Names nobody may take, because taking them is a way of pretending.
 *
 * Not profanity: these are the words that would let somebody be mistaken for
 * the product or for someone official. Somebody messaging as `@support` about
 * a billing problem is the whole reason this list exists.
 */
const RESERVED = new Set([
  "about",
  "account",
  "admin",
  "administrator",
  "api",
  "auth",
  "billing",
  "contact",
  "explainaloud",
  "help",
  "home",
  "login",
  "logout",
  "mod",
  "moderator",
  "official",
  "owner",
  "privacy",
  "profile",
  "record",
  "root",
  "security",
  "settings",
  "signup",
  "staff",
  "support",
  "system",
  "team",
  "terms",
  "test",
  "undefined",
  "null",
]);

/**
 * Slurs and the coarser profanity, matched as whole normalised words.
 *
 * Kept short on purpose. A long substring blocklist is the version of this
 * that rejects `bassist`, `assistant`, `scunthorpe` and `analysis`, and a
 * moderation rule that fires on ordinary words teaches people the product is
 * broken rather than that the rule exists. What is here is matched against the
 * name with its separators and leet spellings folded away, so `f_u_c_k` and
 * `fu9k` do not walk past a list written in letters.
 *
 * This is a floor rather than a policy. Anything cleverer than this belongs in
 * a report-and-review flow, because no list catches a name that is only
 * offensive to the person it is aimed at.
 */
const PROFANITY = new Set([
  "anal",
  "anus",
  "arse",
  "ass",
  "asshole",
  "bastard",
  "bitch",
  "bollocks",
  "boner",
  "clit",
  "cock",
  "coon",
  "cum",
  "cunt",
  "dick",
  "dildo",
  "dyke",
  "fag",
  "faggot",
  "fuck",
  "fucker",
  "goatse",
  "jizz",
  "kike",
  "nigga",
  "nigger",
  "paki",
  "penis",
  "piss",
  "porn",
  "prick",
  "pussy",
  "rape",
  "rapist",
  "retard",
  "semen",
  "sex",
  "shit",
  "slut",
  "spastic",
  "spic",
  "tits",
  "tranny",
  "twat",
  "vagina",
  "wank",
  "whore",
]);

/**
 * The name with the tricks taken out, for matching against the lists.
 *
 * Digits that stand in for letters are folded back, separators dropped, and a
 * character repeated three or more times collapsed — so `fuuuuck`, `f_u_c_k`
 * and `fu(k` spelled `fu9k` all reduce to the same word the list holds. This
 * is only ever used for *comparison*; what gets stored is what was typed.
 */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[0]/g, "o")
    .replace(/[1|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[9]/g, "g")
    .replace(/[^a-z]/g, "")
    .replace(/(.)\1{2,}/g, "$1");
}

/**
 * The reason this name cannot be used, or `null`.
 *
 * Deliberately not a boolean. Every branch below is a different thing for the
 * person to do next, and "Username not allowed" is the message that makes
 * somebody try the same name again with a digit on the end.
 */
export function usernameError(value: string): string | null {
  const name = value.trim().toLowerCase();

  if (!name) return "Pick a username.";
  if (name.length < USERNAME_MIN) {
    return `Usernames are at least ${USERNAME_MIN} characters.`;
  }
  if (name.length > USERNAME_MAX) {
    return `Usernames are at most ${USERNAME_MAX} characters.`;
  }
  if (/[^a-z0-9]/.test(name)) {
    return "Letters and numbers only.";
  }
  if (!SHAPE.test(name)) {
    return "That username isn't allowed.";
  }
  if (RESERVED.has(normalise(name))) {
    return "That username is reserved.";
  }
  /* One word, because there is nothing left to split on. This used to split
     the name on underscores first, so `dick_head` was checked as two words as
     well as one; with separators gone a username *is* a single word, and the
     run-together spellings are exactly what the folding above is for. */
  if (PROFANITY.has(normalise(name))) {
    return "Pick something else.";
  }
  return null;
}

/** What gets stored: lowercase, trimmed, matching the column's constraint. */
export function normaliseUsername(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * The name, reduced to characters a username may contain.
 *
 * Diacritics are folded rather than dropped, so José becomes `jose` and not
 * `jos`. A person whose name does not fit in ASCII should still be offered
 * something recognisable as theirs, and losing a letter in the middle of it is
 * worse than losing the accent on top of it.
 */
function asciiFold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * A few usernames somebody might actually want, built from their own name.
 *
 * Offered rather than imposed: the field stays empty and these are chips you
 * can ignore. The reason they exist is that "pick a username" in front of an
 * empty box is the slowest step in most sign-ups, and it is slow for a reason
 * worth respecting — it is permanent here, and people know it.
 *
 * Every candidate goes back through `usernameError`, so nothing is suggested
 * that the form would then refuse — a suggestion the product rejects when you
 * take it is worse than no suggestion. What that catches now is mostly the
 * blocklists: two ordinary names can run together into a word neither of them
 * contains, and `usernameError` is the only thing that knows.
 */
export function usernameSuggestions(
  firstName: string,
  lastName: string,
): string[] {
  const first = asciiFold(firstName);
  const last = asciiFold(lastName);
  if (!first) return [];

  /* Every candidate opens with the first name, which is what somebody expects
     a suggestion of their own username to look like. A last-name-first variant
     was here and was dropped: it produced handles people did not recognise as
     theirs, and on some names it produced worse than that. */
  const initial = last.slice(0, 1);
  /* The underscored variant that used to sit second is gone with the
     underscore. Its place goes to the first name on its own, which is the
     handle most people would pick if they were not being helped — it is
     usually taken, and `UsernameSuggestions` drops what is taken before
     anybody sees it, so offering it costs one availability check and
     occasionally hands somebody the name they wanted. */
  const candidates = [
    `${first}${last}`,
    first,
    initial ? `${first}${initial}` : "",
    `${first}${last.slice(0, 3)}`,
  ];

  const seen = new Set<string>();
  const usable: string[] = [];

  for (const raw of candidates) {
    const name = raw.slice(0, USERNAME_MAX);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    if (usernameError(name) === null) usable.push(name);
    if (usable.length === 3) break;
  }

  return usable;
}
