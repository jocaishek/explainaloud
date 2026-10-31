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
    <main className="min-h-screen w-full bg-background px-6 py-16 text-foreground">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 font-medium text-base text-strong tracking-[-0.02em] transition-opacity hover:opacity-80"
        >
          <ExplainaloudMark disc className="size-6 shrink-0 text-strong" />
          explainaloud
        </Link>

        <article
          className={[
            "mt-12",
            // Headings
            "[&_h1]:font-display [&_h1]:text-[2rem] [&_h1]:text-strong [&_h1]:text-balance",
            "[&_h2]:mt-12 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:text-strong",
            "[&_h3]:mt-8 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-strong",
            // Body
            "[&_p]:mt-4 [&_p]:text-sm [&_p]:leading-7 [&_p]:text-foreground",
            "[&_li]:mt-2 [&_li]:text-sm [&_li]:leading-7 [&_li]:text-foreground",
            "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5",
            "[&_strong]:font-medium [&_strong]:text-strong",
            "[&_a]:text-strong [&_a]:underline [&_a]:underline-offset-2",
          ].join(" ")}
        >
          {children}
        </article>

        <p className="mt-16 border-border border-t pt-8 text-sm text-subtle">
          <Link href="/" className="transition-colors hover:text-strong">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
