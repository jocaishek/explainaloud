"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  /* Quiet, and shaped like the nav items above it.
   *
   * This was an outlined pill, which put a second bordered control next to the
   * one primary action in the frame and hardcoded a radius the app's own token
   * says is zero. Signing out is the least-used control in the product and the
   * only one nobody should hit by accident on the way to something else, so it
   * gets the ghost treatment: legible, labelled, and not competing. */
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={signingOut}
      onClick={handleSignOut}
      className="w-full justify-start gap-3 px-3 font-medium text-subtle hover:text-strong"
    >
      <LogOut className="size-4" />
      {signingOut ? "Signing out…" : "Sign out"}
    </Button>
  );
}
