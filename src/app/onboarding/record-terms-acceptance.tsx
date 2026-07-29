"use client";

import { useEffect } from "react";
import { createClient } from "~/lib/supabase/client";
import { takePendingConsent } from "~/lib/terms-consent";

/**
 * Stamps a Google signup's acceptance onto the account.
 *
 * Renders nothing. It sits on `/onboarding` because that is the first page a
 * brand-new account reaches with a usable client-side session — the callback
 * route runs on the server and has no way to know what the browser ticked.
 *
 * Does nothing at all when there is no parked consent, which covers every
 * email signup (already stamped at `signUp`) and every returning visit.
 */
export function RecordTermsAcceptance() {
  useEffect(() => {
    const consent = takePendingConsent();
    if (!consent) return;

    // Fire and forget. Failing to write the receipt must not stand between
    // someone and the onboarding form; the acceptance itself already happened.
    void createClient()
      .auth.updateUser({ data: consent })
      .catch(() => {});
  }, []);

  return null;
}
