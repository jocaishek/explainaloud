"use client";

import { Eye, EyeOff, Sparkles } from "lucide-react";
import { useState } from "react";
import { Input } from "~/components/ui/input";
import { Progress } from "~/components/ui/progress";
import {
  checkPassword,
  generateSecurePassword,
  getPasswordStrength,
} from "~/lib/password";
import { cn } from "~/lib/utils";

export function PasswordField({
  value,
  onChange,
  placeholder = "Password",
  autoComplete,
  minLength,
  showStrength = false,
  showGenerate = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  showStrength?: boolean;
  showGenerate?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const strength = getPasswordStrength(value);
  const checks = checkPassword(value);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 border-input bg-surface pr-10 text-base text-strong placeholder:text-subtle"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-3 flex items-center text-subtle hover:text-strong"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {showGenerate && (
        <button
          type="button"
          onClick={() => {
            onChange(generateSecurePassword());
            setVisible(true);
          }}
          className="flex w-fit items-center gap-1.5 text-xs font-medium text-brand hover:text-[#7FB3F0]"
        >
          <Sparkles className="size-3.5" />
          Generate a secure password
        </button>
      )}

      {showStrength && value && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Progress
              value={(strength.score + 1) * 20}
              className="h-1.5 bg-surface"
              indicatorStyle={{ backgroundColor: strength.color }}
            />
            <span
              className="w-14 shrink-0 text-xs font-medium"
              style={{ color: strength.color }}
            >
              {strength.label}
            </span>
          </div>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-subtle">
            <PasswordCheckItem met={checks.length} label="8+ characters" />
            <PasswordCheckItem met={checks.uppercase} label="Uppercase" />
            <PasswordCheckItem met={checks.lowercase} label="Lowercase" />
            <PasswordCheckItem met={checks.digit} label="Number" />
            <PasswordCheckItem met={checks.symbol} label="Symbol" />
          </ul>
        </div>
      )}
    </div>
  );
}

function PasswordCheckItem({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-1.5", met && "text-[#84CC16]")}>
      <span
        className={cn(
          "size-1 rounded-full",
          met ? "bg-[#84CC16]" : "bg-subtle",
        )}
      />
      {label}
    </li>
  );
}
