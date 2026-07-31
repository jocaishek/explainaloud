"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import {
  createNonce,
  googleClientId,
  loadGoogleIdentity,
} from "~/lib/google-identity";
import { createClient } from "~/lib/supabase/client";

/**
 * The Google button, rendered by Google, on our origin.
 *
 * Google's own iframe rather than the app's styled button, because that is the
 * only way to obtain an ID token from Identity Services and also what Google's
 * branding rules require. It is themed as close to the surrounding form as the
 * API allows.
 *
 * Everything about this can fail in ways the app does not control: no client
 * id configured, a blocked script, a popup closed halfway. Every one of those
 * paths ends in `onUnavailable`, and the caller puts the old redirect button
 * back. Nobody should be unable to sign in because a third-party script did
 * not load.
 */
export function GoogleSignIn({
  onUnavailable,
  onError,
  onStart,
  disabled = false,
}: {
  /** Called when this cannot be used at all, so the caller can fall back. */
  onUnavailable: () => void;
  onError: (message: string) => void;
  /** Fired once a credential is in hand and the session is being written. */
  onStart: () => void;
  disabled?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // Google draws its own button, so it has to be told which way the page went.
  // `resolvedTheme` rather than `theme`, because "system" is not an answer the
  // button API accepts. Undefined until mounted, which is why the effect waits
  // for it rather than guessing and redrawing a moment later.
  const { resolvedTheme } = useTheme();
  // Callbacks live in a ref so a parent re-render cannot re-run the effect and
  // hand Google a second button to draw into the same node.
  const handlers = useRef({ onUnavailable, onError, onStart });
  handlers.current = { onUnavailable, onError, onStart };

  useEffect(() => {
    if (!resolvedTheme) return;

    const clientId = googleClientId();
    if (!clientId) {
      handlers.current.onUnavailable();
      return;
    }

    let cancelled = false;

    // Taken as an argument rather than closed over: TypeScript cannot carry
    // the null check above into a nested async function.
    async function mount(clientId: string) {
      let api: Awaited<ReturnType<typeof loadGoogleIdentity>>;
      try {
        api = await loadGoogleIdentity();
      } catch {
        if (!cancelled) handlers.current.onUnavailable();
        return;
      }
      if (cancelled || !host.current) return;

      const nonce = await createNonce();
      if (cancelled || !host.current) return;

      api.initialize({
        client_id: clientId,
        nonce: nonce.hashed,
        // Never sign somebody in from a stored session without them asking.
        // This form is also where people come to switch accounts.
        auto_select: false,
        use_fedcm_for_prompt: true,
        callback: (response) => {
          if (cancelled) return;
          handlers.current.onStart();
          void createClient()
            .auth.signInWithIdToken({
              provider: "google",
              token: response.credential,
              nonce: nonce.raw,
            })
            .then(({ error }) => {
              if (cancelled) return;
              if (error) {
                // The likeliest cause by far is this client id missing from
                // the project's "Authorized Client IDs", which is a
                // configuration problem no visitor can act on.
                handlers.current.onError(
                  "Google sign-in didn't complete. Try email instead.",
                );
                return;
              }
              // A full navigation, not a router push: the session cookies were
              // just written by the browser client, and the server guard on
              // /home has to read them on this request rather than the next.
              window.location.assign("/home");
            });
        },
      });

      // Redrawing on a theme switch means clearing what is already there;
      // renderButton appends rather than replacing.
      host.current.replaceChildren();
      api.renderButton(host.current, {
        type: "standard",
        theme: resolvedTheme === "dark" ? "filled_black" : "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
        width: Math.min(Math.round(host.current.clientWidth) || 320, 400),
      });

      // `renderButton` returns void and draws asynchronously, and it draws
      // nothing at all when the client id is not one Google recognises. Left
      // there, that is an empty gap where the sign-in button should be, with
      // no error and no fallback. Check the node actually received something
      // and treat silence as unavailable.
      window.setTimeout(() => {
        if (cancelled) return;
        if (host.current?.childElementCount) setReady(true);
        else handlers.current.onUnavailable();
      }, 1_200);
    }

    void mount(clientId);
    return () => {
      cancelled = true;
    };
  }, [resolvedTheme]);

  return (
    <div
      ref={host}
      // Google draws into this node. Held at the button's height before it
      // arrives so the form does not jump, and blocked from interaction while
      // an email submit is in flight.
      className={
        disabled
          ? "pointer-events-none flex min-h-11 justify-center opacity-60"
          : "flex min-h-11 justify-center"
      }
      aria-busy={!ready}
    />
  );
}
