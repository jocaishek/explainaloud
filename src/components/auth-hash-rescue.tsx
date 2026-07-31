"use client";

import { useEffect } from "react";
import { createClient } from "~/lib/supabase/client";

/**
 * Completes a sign-in whose credentials arrived in the URL fragment.
 *
 * The last way an emailed link strands someone on the landing page. A project
 * on the implicit flow — or one whose email template routes through Supabase's
 * own verify endpoint — hands the session back as
 * `#access_token=…&refresh_token=…`. A fragment is never sent to the server, so
 * `/auth/callback` cannot see it, the proxy cannot rescue it, and the page
 * renders for what looks like a stranger while the session sits in the address
 * bar unread.
 *
 * Supabase's browser client does detect this, but only once something
 * instantiates it — and on the landing page nothing does, because the sign-in
 * form lives on `/login`. Mounted at the root, this is the thing that
 * instantiates it, so detection runs wherever the link happens to land.
 *
 * A full navigation rather than a router push, so the freshly written auth
 * cookies are present before any server guard reads them.
 */
export function AuthHashRescue() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const errorCode = params.get("error_code") ?? params.get("error");

    if (!accessToken && !errorCode) return;

    // Clear it either way. These are credentials: leaving them in the address
    // bar means they survive a copied link, a screenshot, and the back button.
    const clean = window.location.pathname + window.location.search;

    if (errorCode) {
      // Almost always an expired or already-consumed link — a mail scanner
      // reached it first. `/login` is where the explanation can be shown.
      window.location.replace(
        `/login?auth_error=${
          /expired|invalid/i.test(errorCode)
            ? "link_expired"
            : "exchange_failed"
        }`,
      );
      return;
    }

    if (!accessToken || !refreshToken) {
      window.history.replaceState(null, "", clean);
      return;
    }

    let cancelled = false;
    void createClient()
      .auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error }) => {
        if (cancelled) return;
        window.history.replaceState(null, "", clean);
        if (error) {
          window.location.replace("/login?auth_error=exchange_failed");
          return;
        }
        // Only move someone who is standing somewhere that makes no sense for
        // a signed-in visitor. Landing on `/auth/confirmed` with a working
        // session is the intended destination, not a place to be bounced from.
        if (window.location.pathname === "/") {
          window.location.assign("/home");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
