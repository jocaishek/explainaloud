import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * What `vercel env pull` writes instead of a secret it will not hand over.
 *
 * It is a literal, eleven characters long, and that length is the entire
 * problem: `z.string().min(1)` accepts it, so every guard of the shape
 * `if (!env.SOME_KEY) return "not configured"` sails past and the app sends
 * `Authorization: Bearer [SENSITIVE]` to a real API. What comes back is a 401,
 * which is logged on the server and looks on screen exactly like a search that
 * ran and found nothing.
 *
 * That is why "the YouTube finder doesn't work" survived a fix to the YouTube
 * finder. There was nothing left to fix in it — locally the key was never a
 * key.
 */
const PULLED_PLACEHOLDER = "[SENSITIVE]";

/**
 * An optional secret, with the placeholder treated as absent.
 *
 * Absent is a state every one of these already supports and handles well: the
 * AI chain skips the rung, the search route answers "not configured", the
 * username lookup fails closed and says so in the log. Each of those is a
 * better outcome than a request that cannot succeed, and each of them tells
 * somebody something true.
 *
 * Deliberately only applied to the optional ones. Doing it to a *required*
 * variable would turn a placeholder into a boot failure, which is arguably
 * also correct and is a bigger decision than this.
 */
const optionalSecret = () =>
  z
    .string()
    .min(1)
    .optional()
    .transform((value) => (value === PULLED_PLACEHOLDER ? undefined : value));

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // AI providers. Both optional so the app still boots without them — the
    // AI routes report "not configured" instead of the whole app failing to
    // start. Server-only: these must never reach the browser bundle.
    GEMINI_API_KEY: optionalSecret(),
    GROQ_API_KEY: optionalSecret(),
    // The Vercel AI Gateway, which is how the wide-context failover rung is
    // reached. Optional like the rest: unset, that rung is skipped and the
    // chain is what it was.
    AI_GATEWAY_API_KEY: optionalSecret(),
    /**
     * Which model that rung asks for.
     *
     * A variable rather than a constant because the model it pointed at was
     * withdrawn — `inclusionai/ling-3.0-flash-free` now answers 404
     * `model_not_found` — and a free model on a gateway is exactly the kind of
     * thing that disappears without notice. Repointing it should be an
     * environment change, not a code change and a deploy.
     *
     * Unset, `provider.ts` uses its own default. See `GATEWAY_MODEL` there for
     * what that rung is for and why it is not simply Gemini again.
     */
    AI_GATEWAY_MODEL: optionalSecret(),
    TAVILY_API_KEY: optionalSecret(),
    // Set by Vercel to the project's stable production hostname, without a
    // protocol. Absent locally, which is why it's optional.
    VERCEL_PROJECT_PRODUCTION_URL: z.string().min(1).optional(),
    // Which kind of deployment this is. Only "production" is treated as the
    // canonical one — preview builds must stay on their own hostname or
    // reviewing a pull request would bounce you to the live site.
    VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
    // Billing. All optional so the app still boots without them: unconfigured,
    // the upgrade button reports that billing isn't set up rather than the
    // whole site failing to start. Every one of these is a secret — none may
    // ever be prefixed NEXT_PUBLIC_, which would inline it into the browser.
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    // From the Stripe CLI or the dashboard's webhook endpoint. Without it the
    // webhook cannot tell a real Stripe event from a forged one, so the route
    // refuses to run rather than trusting the body.
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    // The recurring price the Pro plan checks out against (`price_...`, not
    // `prod_...`).
    STRIPE_PRICE_ID: z.string().min(1).optional(),
    // Bypasses row-level security. Used only by the Stripe webhook, which has
    // no user session and must write the `plan` column that authenticated
    // users are explicitly forbidden from writing.
    SUPABASE_SERVICE_ROLE_KEY: optionalSecret(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    // The domain this app is actually served on, with protocol — for example
    // `https://explainaloud.com`. Vercel's own variable names the project's
    // `*.vercel.app` host, which is not where anyone visits once a custom
    // domain is attached, so share links and Open Graph images would keep
    // pointing at the wrong hostname. Optional: unset, the Vercel host is
    // still a working fallback.
    NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
    // The Google OAuth client id, so the sign-in handshake can run on this
    // origin instead of redirecting through `<ref>.supabase.co` — which is
    // the host Google's consent screen would otherwise name. Public by
    // design; the client secret is never involved in this flow. Optional:
    // unset, the button falls back to the Supabase redirect.
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NODE_ENV: process.env.NODE_ENV,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    AI_GATEWAY_MODEL: process.env.AI_GATEWAY_MODEL,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    // Supabase renamed the browser-safe key: new projects hand out a
    // `PUBLISHABLE_KEY`, older ones an `ANON_KEY`. They are interchangeable
    // for supabase-js, so accept whichever name the host has set rather than
    // failing the build over the spelling. Both are referenced statically so
    // Next can inline either one into the client bundle.
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
  // The default failure is a bare "Invalid environment variables" thrown from
  // a minified chunk, which tells a deploy log nothing. Name the variables so
  // a failed build says which ones are missing from the host's settings.
  onValidationError: (issues) => {
    const names = issues
      .map((issue) => {
        const name = issue.path?.join(".") ?? "(unknown)";
        return name === "NEXT_PUBLIC_SUPABASE_ANON_KEY"
          ? `${name} (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)`
          : name;
      })
      .join(", ");
    throw new Error(
      `Invalid or missing environment variables: ${names}. Set them in your hosting provider's environment settings and redeploy.`,
    );
  },
});
