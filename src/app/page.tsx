import { Suspense } from "react";
import { LandingDesk } from "~/components/landing/landing-desk";

/**
 * The landing page. One component, nothing held in reserve: the previous
 * direction lives in git history, which is what history is for.
 *
 * The Suspense boundary exists because the landing reads `?hero=` to switch
 * between candidate hero directions while the design is being decided.
 */
export default function Home() {
  return (
    <Suspense>
      <LandingDesk />
    </Suspense>
  );
}
