/**
 * Google sign-in that happens on our own domain.
 *
 * `signInWithOAuth` sends the browser to Google with a redirect_uri pointing
 * at `<project-ref>.supabase.co/auth/v1/callback`, and Google's consent screen
 * names the host it is about to return to. So the one moment a stranger is
 * deciding whether to trust this app, it showed them a random string and
 * somebody else's domain.
 *
 * Google Identity Services does the handshake in a popup owned by this origin
 * and hands back an ID token. Supabase accepts that token directly through
 * `signInWithIdToken`, so the browser never visits supabase.co and the consent
 * screen names explainaloud.com. It costs nothing, where the alternative was a
 * paid plan plus a paid add-on.
 *
 * What it does not do is replace the redirect flow entirely. The script is
 * third-party and blockable, so `auth-card.tsx` keeps `signInWithOAuth` as the
 * fallback for anyone this cannot reach.
 */

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const SCRIPT_ID = "google-identity-services";

export type GoogleCredential = { credential: string };

type GoogleIdApi = {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredential) => void;
    nonce?: string;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "small" | "medium" | "large";
      text?: "signin_with" | "signup_with" | "continue_with";
      shape?: "rectangular" | "pill" | "circle" | "square";
      logo_alignment?: "left" | "center";
      width?: number;
    },
  ): void;
  disableAutoSelect(): void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdApi } };
  }
}

/** The client id, or null when this deployment has not configured one. */
export function googleClientId(): string | null {
  // `process.env` rather than `~/env`: this module runs in the browser, and
  // NEXT_PUBLIC values are inlined at build time, so importing the schema here
  // would ship Zod to every page for the sake of re-checking a constant. See
  // `.claude/rules/env-vars.md`.
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || null;
}

let loading: Promise<GoogleIdApi> | null = null;

/**
 * Load the GIS script once and resolve with its API.
 *
 * Memoised on the promise rather than on a boolean: two components mounting in
 * the same tick would otherwise both see "not loaded" and append two script
 * tags. Rejects rather than hanging when the script is blocked, which is the
 * signal the caller needs to fall back to the redirect.
 */
export function loadGoogleIdentity(): Promise<GoogleIdApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("google identity needs a browser"));
  }

  const existing = window.google?.accounts?.id;
  if (existing) return Promise.resolve(existing);
  if (loading) return loading;

  loading = new Promise<GoogleIdApi>((resolve, reject) => {
    const done = () => {
      const api = window.google?.accounts?.id;
      if (api) resolve(api);
      else reject(new Error("google identity loaded without an id api"));
    };

    const already = document.getElementById(SCRIPT_ID);
    if (already) {
      already.addEventListener("load", done, { once: true });
      already.addEventListener(
        "error",
        () => reject(new Error("google identity failed to load")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = done;
    script.onerror = () => {
      // Let a later attempt retry rather than caching the failure forever:
      // this is frequently a blocked request on one page load and a fine one
      // on the next.
      loading = null;
      reject(new Error("google identity failed to load"));
    };
    document.head.appendChild(script);
  });

  return loading;
}

/**
 * A nonce pair binding this token to this page load.
 *
 * Google receives the SHA-256 hash and embeds it in the ID token it signs.
 * Supabase receives the original and checks that hashing it reproduces the
 * claim, which is what stops a token minted for some other page being replayed
 * here. The two values are not interchangeable and passing them the wrong way
 * round fails with a confusing "invalid nonce".
 */
export async function createNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const raw = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  const hashed = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return { raw, hashed };
}
