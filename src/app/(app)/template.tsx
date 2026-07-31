/**
 * Dashboard navigation should reveal content immediately. This template is
 * intentionally animation-free: route-level fades delayed every tab after
 * its data had already arrived and made fast responses feel sluggish.
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-full">{children}</div>;
}
