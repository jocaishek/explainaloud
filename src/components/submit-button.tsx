"use client";

import { useFormStatus } from "react-dom";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className={cn(
        "bg-brand-deep font-semibold text-white shadow-[0_0_30px_-8px_var(--color-brand-deep)] transition-transform hover:bg-brand-deep/90 active:scale-[0.98]",
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
