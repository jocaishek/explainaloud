"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { env } from "~/env";
import { createClient } from "~/lib/supabase/server";

export type SignInResult = {
  ok: boolean;
  /** Shown to the person. Deliberately the same for every kind of failure. */
  error: string | null;
  /** True when the account exists but the address was never confirmed. */
  needsVerification: boolean;
};

/**
 * The one sentence every failed sign-in gets.
 *
 * Same words for a username that does not exist, an email that does not exist,
 * and a correct username with the wrong password. Anything else is an oracle:
 * a form that says "no such user" for one name and "wrong password" for
 * another is a form that will happily confirm which of ten thousand guessed
 * usernames are real, and usernames here are public by design.
 */
const REFUSED = "That username or password isn't right.";

/**
 * Signs in with either an email address or a username.
 *
 * On the server, and this is the whole reason the action exists. Resolving a
 * username to an email needs a privileged lookup, and the resolved address
 * must never reach the browser — so the hop and the sign-in both happen here,
 * and what goes back is a session cookie or a refusal.
 */
export async function signInWithIdentifier(
  identifier: string,
  password: string,
): Promise<SignInResult> {
  const supabase = await createClient();
  const trimmed = identifier.trim();

  if (!trimmed || !password) {
    return { ok: false, error: REFUSED, needsVerification: false };
  }

  /* An `@` means they typed an address. Everything else is treated as a
     username, including a bare word that happens to be somebody's local part —
     the two namespaces do not overlap, because a username cannot contain `@`. */
  let email = trimmed;

  if (!trimmed.includes("@")) {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      /* Fail closed, and say so in the log rather than on screen. Without the
         key there is no way to resolve a username, and quietly treating the
         username as an email would produce the same refusal for a completely
         different reason — which is exactly the confusion this whole file is
         written to avoid. */
      console.error(
        "Username sign-in is unavailable: SUPABASE_SERVICE_ROLE_KEY is not set.",
      );
      return { ok: false, error: REFUSED, needsVerification: false };
    }

    const service = createServiceClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await service.rpc("email_for_username", {
      candidate: trimmed.replace(/^@/, ""),
    });

    if (error) {
      console.error("Username lookup failed:", error);
      return { ok: false, error: REFUSED, needsVerification: false };
    }
    if (typeof data !== "string" || !data) {
      // No such username. Same sentence, same shape, same timing as a wrong
      // password: the caller must not be able to tell these apart.
      return { ok: false, error: REFUSED, needsVerification: false };
    }
    email = data;
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    /* The one failure worth distinguishing, because it is the one with an
       action attached: the account exists and the address was never confirmed,
       so the fix is a new confirmation mail rather than a different password.
       It reveals nothing a person could not learn by signing up again. */
    const needsVerification = /email not confirmed|confirm your email/i.test(
      signInError.message,
    );
    return {
      ok: false,
      error: needsVerification
        ? "Confirm your email address before signing in."
        : REFUSED,
      needsVerification,
    };
  }

  return { ok: true, error: null, needsVerification: false };
}
