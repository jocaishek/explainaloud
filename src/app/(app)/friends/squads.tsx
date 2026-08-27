"use client";

import { useState, useTransition } from "react";
import { PersonAvatar } from "~/components/person-avatar";
import { StreakFlame } from "~/components/streak-flame";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { createSquad, joinSquad, leaveSquad } from "./actions";
import type { Squad } from "./types";

/**
 * A streak that belongs to a group rather than to a person.
 *
 * A personal streak is a promise to yourself and it breaks quietly. A squad's
 * breaks in front of four other people, which is the whole mechanism — the day
 * somebody does not want to record is the day the group notices, and that is
 * the day the habit is worth something.
 *
 * So the panel leads with who has not recorded, not with the number. The
 * number is the reward for a day already finished; the list of names is the
 * only part anybody can still act on, and it is what makes this different from
 * the friends list underneath it, which is a scoreboard.
 */
export function Squads({ squads }: { squads: Squad[] }) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [opening, setOpening] = useState<"none" | "start" | "join">("none");

  const run = (action: () => Promise<{ ok: boolean; message: string }>) => {
    startTransition(async () => {
      const result = await action();
      setNotice(result.message);
      if (result.ok) {
        setName("");
        setCode("");
        setOpening("none");
      }
    });
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-lg text-strong">Squads</h2>
        <p className="text-sm text-muted-foreground">
          Everybody records, or the run ends.
        </p>
      </div>

      {squads.map((squad) => {
        const missing = squad.members.filter((member) => !member.recordedToday);
        const safe = missing.length === 0;
        return (
          <div
            key={squad.id}
            className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-rest"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <StreakFlame lit={squad.streak > 0} />
                <div>
                  <p className="font-semibold text-strong">{squad.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {squad.streak === 0
                      ? "No run yet"
                      : `${squad.streak} ${squad.streak === 1 ? "day" : "days"} together`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <code className="rounded-control border border-border bg-surface px-2 py-1 font-mono text-xs tracking-widest text-subtle">
                  {squad.joinCode}
                </code>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => leaveSquad(squad.id))}
                  className="text-xs text-subtle underline underline-offset-4 hover:text-foreground"
                >
                  {squad.isOwner ? "Close squad" : "Leave"}
                </button>
              </div>
            </div>

            {/* Today, as a row of faces rather than a number.
                Somebody who has recorded is lit; somebody who has not is not,
                and their name is said out loud underneath. Being the greyed-out
                one in a row of five is the entire product of this feature. */}
            <ul className="flex flex-wrap gap-2">
              {squad.members.map((member) => (
                <li
                  key={member.id}
                  className={cn(
                    "flex items-center gap-2 rounded-control border px-2.5 py-1.5",
                    member.recordedToday
                      ? "border-brand/30 bg-brand/[0.06]"
                      : "border-border bg-surface opacity-60",
                  )}
                >
                  <PersonAvatar
                    firstName={member.username ?? "?"}
                    lastName=""
                    avatarUrl={member.avatarUrl}
                    size={22}
                  />
                  <span className="text-sm text-foreground">
                    {member.username ?? "someone"}
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-sm text-muted-foreground">
              {safe
                ? "Everyone has recorded today. The run is safe."
                : missing.length === squad.members.length
                  ? "Nobody has recorded yet today."
                  : `Waiting on ${missing
                      .map((member) => member.username ?? "someone")
                      .join(", ")}.`}
            </p>
          </div>
        );
      })}

      {squads.length === 0 && (
        <p className="text-sm text-muted-foreground">
          A squad is a handful of people keeping one streak. It survives the day
          only if all of you record.
        </p>
      )}

      <div className="flex flex-wrap items-start gap-3">
        {opening !== "start" ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpening("start")}
          >
            Start a squad
          </Button>
        ) : (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => createSquad(name));
            }}
          >
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Squad name"
              maxLength={40}
              className="w-48"
            />
            <Button type="submit" disabled={pending}>
              Start
            </Button>
          </form>
        )}

        {opening !== "join" ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpening("join")}
          >
            Join with a code
          </Button>
        ) : (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => joinSquad(code));
            }}
          >
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="ABC234"
              maxLength={6}
              className="w-32 font-mono tracking-widest"
            />
            <Button type="submit" disabled={pending}>
              Join
            </Button>
          </form>
        )}
      </div>

      {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
    </section>
  );
}
