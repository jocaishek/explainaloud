"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "~/components/password-field";
import { Button } from "~/components/ui/button";
import { passwordRequirementError } from "~/lib/password";
import { createClient } from "~/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const requirementError = passwordRequirementError(password);
    if (requirementError) {
      setError(requirementError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setSubmitting(false);
      setError(
        updateError.message.toLowerCase().includes("password")
          ? "Password isn't strong enough. Use 8+ characters with a mix of uppercase, lowercase, numbers, and symbols."
          : "That reset link has expired. Request a new one from the sign-in page.",
      );
      return;
    }

    router.push("/home");
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-6 text-foreground">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/10 bg-[#171717] p-6 shadow-xl shadow-black/40"
      >
        <div>
          <h1 className="text-lg font-semibold text-white">
            Set a new password
          </h1>
          <p className="mt-1 text-sm text-[#71717A]">
            Choose a new password for your account.
          </p>
        </div>
        <PasswordField
          value={password}
          onChange={setPassword}
          minLength={8}
          autoComplete="new-password"
          placeholder="New password"
          showStrength
          showGenerate
        />
        <PasswordField
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          placeholder="Confirm new password"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="submit"
          disabled={submitting}
          className="bg-brand-deep font-semibold text-white shadow-[0_0_30px_-8px_var(--color-brand-deep)] transition-transform hover:bg-brand-deep/90 active:scale-[0.98]"
        >
          {submitting ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </main>
  );
}
