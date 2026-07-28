export function NotWiredYet({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <p className="text-sm font-medium text-strong">{title}</p>
      <p className="max-w-sm text-sm text-subtle">{description}</p>
    </div>
  );
}
