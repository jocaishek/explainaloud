import { ScrollReveal } from "~/components/scroll-reveal";

/**
 * The sign-in and sign-up screens.
 *
 * Exists for one reason: to mount the reveal observer, so the heading and the
 * card arrive the way every block on the landing page does rather than being
 * painted in place. Without it `data-rise=""` still renders fully revealed —
 * that is the attribute's resting state — so the screen is correct with
 * JavaScript off and nothing is hidden from a crawler.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ScrollReveal />
      {children}
    </>
  );
}
