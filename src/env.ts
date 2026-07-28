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
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
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
