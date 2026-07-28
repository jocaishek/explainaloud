"use client";

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

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={signingOut}
      onClick={handleSignOut}
      className="rounded-full border-input bg-surface font-medium text-strong transition-transform duration-200 ease-out hover:bg-accent active:scale-[0.97]"
    >
      {signingOut ? "Signing out…" : "Sign out"}
    </Button>
  );
}
