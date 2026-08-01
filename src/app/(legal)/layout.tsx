import Link from "next/link";
import { ExplainaloudMark } from "~/components/explainaloud-mark";

/**
 * Reading shell for the Terms and the Privacy Policy.
 *
 * These open in a new tab from the signup checkbox, so they arrive with no
 * history to go back through — hence the wordmark and the explicit link home
 * rather than a back arrow that would do nothing.
 *
 * Measure is capped near 68 characters. Legal prose is read in full by the
 * people who read it at all, and a full-width column of 10pt grey is how a
 * document signals it does not expect to be read.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen w-full bg-[#0b0f14] px-6 py-16 text-white">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 text-base font-semibold tracking-tight text-white transition-opacity hover:opacity-80"
        >
          <ExplainaloudMark className="size-6 shrink-0 text-brand-ink" />
          Explainaloud
        </Link>

        <article
          className={[
            "mt-12",
            // Headings
            "[&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-balance",
            "[&_h2]:mt-12 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white",
            "[&_h3]:mt-8 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white",
            // Body
            "[&_p]:mt-4 [&_p]:text-sm [&_p]:leading-7 [&_p]:text-[#A1A1AA]",
            "[&_li]:mt-2 [&_li]:text-sm [&_li]:leading-7 [&_li]:text-[#A1A1AA]",
            "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5",
            "[&_strong]:font-semibold [&_strong]:text-white",
            "[&_a]:text-brand-ink [&_a]:underline [&_a]:underline-offset-2",
          ].join(" ")}
        >
          {children}
        </article>

        <p className="mt-16 border-t border-white/10 pt-8 text-sm text-[#71717A]">
          <Link href="/" className="transition-colors hover:text-white">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
