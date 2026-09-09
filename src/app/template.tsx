"use client";

import { usePathname } from "next/navigation";

/**
 * App-wide cross-fade between top-level routes — landing → onboarding →
 * dashboard no longer cut hard from one page to the next.
 *
 * A plain CSS animation, deliberately: the previous framer-motion version
 * pulled the whole motion runtime into every route's bundle to animate one
 * opacity. Opacity only, also deliberately — `transform` and `filter` both
 * establish a containing block for `position: fixed` descendants, which
 * would break the landing page's fixed nav. Reduced motion is handled by
 * the media query rather than JS, so the fade costs nothing to skip.
 */
export default function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // The authenticated app optimizes for repeated task navigation. Marketing
  // routes keep the entrance fade, but dashboard clicks render immediately.
  if (pathname.startsWith("/home")) {
    return <>{children}</>;
  }

  return (
    <div className="route-fade">
      <style>{`
        .route-fade {
          animation: route-fade-in 0.22s cubic-bezier(0.23, 1, 0.32, 1);
        }
        @keyframes route-fade-in {
          from { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .route-fade { animation: none; }
        }
      `}</style>
      {children}
    </div>
  );
}
