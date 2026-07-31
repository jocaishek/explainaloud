import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // AI providers. Both optional so the app still boots without them — the
    // AI routes report "not configured" instead of the whole app failing to
    // start. Server-only: these must never reach the browser bundle.
    GEMINI_API_KEY: z.string().min(1).optional(),
    GROQ_API_KEY: z.string().min(1).optional(),
    TAVILY_API_KEY: z.string().min(1).optional(),
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
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
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
  },
  runtimeEnv: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NODE_ENV: process.env.NODE_ENV,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
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
