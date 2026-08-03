"use client";

import { useId, useState } from "react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

/**
 * Day, month and year as three fields — not a calendar.
 *
 * **Why the calendar went.** Both date-of-birth inputs were
 * `<input type="date">`, whose native picker opens on today and steps a month
 * at a time. Reaching a birthday twenty years back is roughly 240 presses of
 * the same arrow, and the reported symptom — "it can only move between
 * months" — is that arrow being the only obvious control. Some pickers hide
 * year selection behind the header, some behind a spinner, and on a phone it
 * varies by OS. Adding a `min` improves the range but does not change the
 * shape of the problem.
 *
 * The deeper point is that a calendar is the wrong control for this question.
 * A calendar is for *choosing* a date — browsing, comparing, seeing which day
 * of the week something falls on. Nobody browses for their own birthday. They
 * know it, and the fastest input is the one that lets them type it, which is
 * what this is. It is also why every well-tested government form does it this
 * way rather than with a picker.
 *
 * Month is a select of names rather than a number, which removes the other
 * quiet failure here: `03/04` is March the fourth to an American and the third
 * of April to almost everybody else, and this app has no way to know which the
 * reader meant.
 *
 * Emits the same `yyyy-mm-dd` string the old input did, so `dateOfBirthError`
 * and the `date_of_birth` column are untouched. Incomplete input emits `""`,
 * which that validator already reports as "Enter your date of birth."
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Split a stored `yyyy-mm-dd` back into its three fields. */
function partsOf(iso: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!match) return { year: "", month: "", day: "" };
  return { year: match[1], month: match[2], day: match[3] };
}

export function DateOfBirthField({
  name,
  defaultValue,
  onChange,
  invalid = false,
  describedBy,
  className,
}: {
  /** Renders a hidden input under this name, for uncontrolled form posts. */
  name?: string;
  /** Stored `yyyy-mm-dd`, when editing an existing profile. */
  defaultValue?: string;
  /** Called with `yyyy-mm-dd`, or `""` while the date is incomplete. */
  onChange?: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}) {
  const [parts, setParts] = useState(() => partsOf(defaultValue));
  const dayId = useId();
  const monthId = useId();
  const yearId = useId();

  function update(next: Partial<typeof parts>) {
    const merged = { ...parts, ...next };
    setParts(merged);
    /* Zero-padded on the way out, so a typed "3" becomes "03" and the
       validator's strict `\d{2}` pattern matches. Only a complete date is
       emitted; anything partial is "" rather than a half-built string that
       would read as a real but wrong date. */
    const complete =
      merged.year.length === 4 && merged.month !== "" && merged.day !== "";
    onChange?.(
      complete
        ? `${merged.year}-${merged.month}-${merged.day.padStart(2, "0")}`
        : "",
    );
  }

  const value =
    parts.year.length === 4 && parts.month && parts.day
      ? `${parts.year}-${parts.month}-${parts.day.padStart(2, "0")}`
      : "";

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {name && <input type="hidden" name={name} value={value} readOnly />}

      <div className="flex w-[4.5rem] flex-col gap-1.5">
        <label
          htmlFor={dayId}
          className="font-mono text-[0.62rem] text-subtle uppercase tracking-[0.09em]"
        >
          Day
        </label>
        <Input
          id={dayId}
          /* `inputMode` rather than `type="number"`: a number input on a
             birthday brings a spinner nobody wants and silently accepts
             exponent notation. This gets the numeric keypad on a phone
             without either. */
          inputMode="numeric"
          autoComplete="bday-day"
          maxLength={2}
          placeholder="DD"
          aria-invalid={invalid}
          aria-describedby={describedBy}
          value={parts.day}
          onChange={(e) =>
            update({ day: e.target.value.replace(/\D/g, "").slice(0, 2) })
          }
          className="h-11 text-base"
        />
      </div>

      <div className="flex min-w-[8rem] flex-1 flex-col gap-1.5">
        <label
          htmlFor={monthId}
          className="font-mono text-[0.62rem] text-subtle uppercase tracking-[0.09em]"
        >
          Month
        </label>
        <select
          id={monthId}
          autoComplete="bday-month"
          aria-invalid={invalid}
          aria-describedby={describedBy}
          value={parts.month}
          onChange={(e) => update({ month: e.target.value })}
          className="h-11 rounded-control border border-input bg-card px-3 text-base text-strong"
        >
          <option value="">Month</option>
          {MONTHS.map((label, i) => (
            <option key={label} value={String(i + 1).padStart(2, "0")}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex w-[6rem] flex-col gap-1.5">
        <label
          htmlFor={yearId}
          className="font-mono text-[0.62rem] text-subtle uppercase tracking-[0.09em]"
        >
          Year
        </label>
        <Input
          id={yearId}
          inputMode="numeric"
          autoComplete="bday-year"
          maxLength={4}
          placeholder="YYYY"
          aria-invalid={invalid}
          aria-describedby={describedBy}
          value={parts.year}
          onChange={(e) =>
            update({ year: e.target.value.replace(/\D/g, "").slice(0, 4) })
          }
          className="h-11 text-base"
        />
      </div>
    </div>
  );
}
