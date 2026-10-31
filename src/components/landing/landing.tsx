import { ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ExplainaloudMark } from "~/components/explainaloud-mark";
import { cn } from "~/lib/utils";
import { DemoFilm } from "./demo-film";
import styles from "./landing.module.css";
import { MiniDemos } from "./mini-demos";
import { TopicSpinner } from "./topic-spinner";

/**
 * The landing page: one sentence, then the product being used.
 *
 * A server component. The three moving parts (the topic in the headline, the
 * film, and the small demos) are client components; everything else is
 * static markup.
 */

const YRI_URL = "https://yriscience.com?ref=EXPLAINALOUD";

const navLink =
  "transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground";

function Wordmark({ size }: { size: "nav" | "footer" }) {
  return (
    <span className="inline-flex items-center gap-2 font-medium text-base text-foreground tracking-[-0.01em]">
      <ExplainaloudMark
        disc
        className={size === "nav" ? "size-5 text-strong" : "size-6 text-strong"}
      />
      explainaloud
    </span>
  );
}

export function Landing() {
  const year = new Date().getFullYear();

  return (
    <div className={cn(styles.root, "min-h-dvh bg-background text-foreground")}>
      <nav
        aria-label="Main"
        className="mx-auto grid h-16 max-w-[1240px] grid-cols-[1fr_auto_1fr] items-center px-6 max-[820px]:grid-cols-[1fr_auto]"
      >
        <Link
          href="/"
          aria-label="Explainaloud home"
          className="justify-self-start rounded-sm"
        >
          <Wordmark size="nav" />
        </Link>
        <div className="flex gap-8 text-muted-foreground text-sm max-[820px]:hidden">
          <a href="#how" className={navLink}>
            How it works
          </a>
        </div>
        <div className="flex items-center justify-end gap-6 text-muted-foreground text-sm">
          <Link href="/login" className={navLink}>
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center rounded-pill bg-accent-solid px-4 font-medium text-accent-contrast text-sm transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-accent-solid-hover active:scale-[0.98]"
          >
            Start explaining
          </Link>
        </div>
      </nav>

      <main>
        <header className="mx-auto max-w-[1000px] px-6 pt-24 text-center max-[820px]:pt-12">
          <h1
            className={cn(
              styles.rise,
              "relative font-normal text-[clamp(44px,6.6vw,92px)] leading-[1.04] tracking-[-0.035em]",
            )}
          >
            Tonight I'm explaining
            <br />
            <span className="sr-only">
              Newton's third law, the New Deal, cell division, and whatever else
              you're studying
            </span>
            <TopicSpinner />
          </h1>
          <p
            className={cn(
              styles.rise,
              styles.rise1,
              styles.sub,
              "mx-auto mt-6 max-w-[40rem] text-xl leading-[30px] max-[820px]:text-lg max-[820px]:leading-7",
            )}
          >
            Upload your notes, explain the topic out loud, and see exactly what
            you missed
          </p>
          <div
            className={cn(
              styles.rise,
              styles.rise2,
              "mt-8 flex flex-wrap items-center justify-center gap-6",
            )}
          >
            <Link
              href="/signup"
              className={cn(
                styles.nudge,
                "inline-flex h-12 items-center gap-2 rounded-pill bg-accent-solid px-5 font-medium text-accent-contrast text-base transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-accent-solid-hover active:scale-[0.98]",
              )}
            >
              Start explaining
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
            <a
              href="#how"
              className={cn(
                styles.nudge,
                "inline-flex items-center gap-2 text-base",
              )}
            >
              See how it works
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
          </div>
        </header>

        <section
          aria-label="A short film of the app being used: notes go in, the topic is explained out loud, and what was missed comes back"
          className={cn(
            styles.rise,
            styles.rise3,
            "mx-auto mt-16 mb-24 max-w-[1240px] px-6 max-[820px]:mt-12 max-[820px]:mb-16",
          )}
        >
          <DemoFilm />
        </section>

        <MiniDemos />

        <section
          aria-labelledby="partner-heading"
          className="mx-auto mb-24 flex max-w-[1240px] flex-col items-center gap-6 px-6 text-center"
        >
          <h2
            id="partner-heading"
            className="font-normal text-muted-foreground text-sm"
          >
            In partnership with
          </h2>
          <a
            href={YRI_URL}
            target="_blank"
            rel="noopener"
            aria-label="YRI Fellowship (opens in a new tab)"
            className="rounded-sm transition-opacity duration-150 hover:opacity-70"
          >
            <Image
              src="/landing/yri-fellowship-logo.webp"
              width={823}
              height={165}
              alt="YRI Fellowship"
              className="block h-auto w-64 max-[820px]:w-52"
            />
          </a>
        </section>
      </main>

      <footer className="mx-auto max-w-[1240px] px-6 pb-10">
        <div className="grid grid-cols-[1.4fr_repeat(3,1fr)] border-border border-t pt-10 max-[820px]:grid-cols-2 max-[820px]:gap-y-8 [&>div+div]:border-border [&>div+div]:border-l [&>div+div]:px-8 max-[820px]:[&>div+div]:border-l-0 max-[820px]:[&>div+div]:px-0">
          <div className="max-[820px]:col-span-full">
            <Wordmark size="footer" />
            <p className="mt-4 max-w-[26ch] text-muted-foreground text-sm leading-5">
              Explain it out loud. Find out what you actually know
            </p>
          </div>
          <FooterColumn title="Product">
            <li>
              <a href="#how" className={navLink}>
                How it works
              </a>
            </li>
            <li>
              <Link href="/signup" className={navLink}>
                Start explaining
              </Link>
            </li>
            <li>
              <Link href="/login" className={navLink}>
                Log in
              </Link>
            </li>
          </FooterColumn>
          <FooterColumn title="Partners">
            <li>
              <a
                href={YRI_URL}
                target="_blank"
                rel="noopener"
                className={navLink}
              >
                YRI Fellowship
              </a>
            </li>
          </FooterColumn>
          <FooterColumn title="Legal">
            <li>
              <Link href="/privacy" className={navLink}>
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className={navLink}>
                Terms
              </Link>
            </li>
          </FooterColumn>
        </div>
        <p className="mt-12 font-mono text-muted-foreground text-xs leading-4">
          © {year} Explainaloud
        </p>
      </footer>
    </div>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="font-medium text-sm">{title}</h3>
      <ul className="mt-4 grid list-none gap-2 p-0 text-muted-foreground text-sm">
        {children}
      </ul>
    </div>
  );
}
