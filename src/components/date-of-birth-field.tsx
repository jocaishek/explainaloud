"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

/**
 * Month, day and year as three dropdowns — not a calendar, and no typing.
 *
 * **Why the calendar went.** Both date-of-birth inputs were
 * `<input type="date">`, whose native picker opens on today and steps a month
 * at a time. Reaching a birthday twenty years back is roughly 240 presses of
 * the same arrow. A calendar is for *choosing* a date; nobody browses for
 * their own birthday.
 *
 * **Why the typed fields went.** The version after that typed the day and the
 * year, which invited "3" vs "03", a two-digit year, and a numeric keypad that
 * hides the Continue button on a phone. Three selects answer the same question
 * with nothing to mistype, and on a phone each one opens the OS's own wheel.
 *
 * Month is a list of names rather than numbers: `03/04` is March the fourth to
 * an American and the third of April to almost everybody else.
 *
 * Emits the same `yyyy-mm-dd` string as before, so `dateOfBirthError` and the
 * `date_of_birth` column are untouched. Incomplete input emits `""`, which that
 * validator reports as "Enter your date of birth." An impossible day for the
 * month (31 February) is emitted as typed and left to the validator to name.
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

const DAYS = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

/** Nobody younger than this is signing up; the validator enforces the real floor. */
const YOUNGEST_YEARS = 10;
const YEAR_SPAN = 100;

/** Split a stored `yyyy-mm-dd` back into its three fields. */
function partsOf(iso: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!match) return { year: "", month: "", day: "" };
  return { year: match[1], month: match[2], day: match[3] };
}

function yearOptions(keep: string) {
  const newest = new Date().getFullYear() - YOUNGEST_YEARS;
  const years = Array.from({ length: YEAR_SPAN }, (_, i) => String(newest - i));
  /* A stored date outside the window still has to show as selected, or the
     field would silently read as empty when editing an existing profile. */
  if (keep && !years.includes(keep)) {
    years.push(keep);
    years.sort((a, b) => Number(b) - Number(a));
  }
  return years;
}

const SELECT_CLASS =
  "h-12 w-full min-w-0 cursor-pointer appearance-none rounded-control border border-input bg-card pr-10 pl-3.5 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:border-accent-solid focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)] aria-invalid:border-destructive motion-reduce:transition-none dark:bg-input/30";

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
  const [years] = useState(() => yearOptions(parts.year));
  const dayId = useId();
  const monthId = useId();
  const yearId = useId();

  function emit(p: typeof parts) {
    return p.year && p.month && p.day ? `${p.year}-${p.month}-${p.day}` : "";
  }

  function update(next: Partial<typeof parts>) {
    const merged = { ...parts, ...next };
    setParts(merged);
    // Only a complete date is emitted; anything partial is "" rather than a
    // half-built string that would read as a real but wrong date.
    onChange?.(emit(merged));
  }

  const value = emit(parts);

  const fields = [
    {
      id: monthId,
      label: "Month",
      key: "month" as const,
      autoComplete: "bday-month",
      options: MONTHS.map((label, i) => ({
        value: String(i + 1).padStart(2, "0"),
        label,
      })),
    },
    {
      id: dayId,
      label: "Day",
      key: "day" as const,
      autoComplete: "bday-day",
      options: DAYS.map((d) => ({ value: d, label: String(Number(d)) })),
    },
    {
      id: yearId,
      label: "Year",
      key: "year" as const,
      autoComplete: "bday-year",
      options: years.map((y) => ({ value: y, label: y })),
    },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-[1.4fr_1fr_1fr] gap-3 max-sm:grid-cols-[1.3fr_1fr_1.1fr] max-sm:gap-2",
        className,
      )}
    >
      {name && <input type="hidden" name={name} value={value} readOnly />}

      {fields.map((field) => (
        <div key={field.key} className="flex min-w-0 flex-col gap-2">
          <Label htmlFor={field.id} className="text-foreground">
            {field.label}
          </Label>
          <div className="relative">
            <select
              id={field.id}
              autoComplete={field.autoComplete}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              value={parts[field.key]}
              onChange={(e) => update({ [field.key]: e.target.value })}
              className={cn(
                SELECT_CLASS,
                parts[field.key] === "" && "text-muted-foreground",
              )}
            >
              <option value="" disabled>
                {field.label}
              </option>
              {field.options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="text-foreground"
                >
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-3.5 size-4 text-muted-foreground"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
