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
        "bg-accent-solid font-semibold text-accent-contrast transition-transform hover:bg-accent-solid-hover active:scale-[0.98]",
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
