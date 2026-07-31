"use client";

import { AnimatePresence, motion } from "framer-motion";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  type Course,
  courseHref,
  courseTitle,
  type Folder,
} from "~/lib/folders";
import { cn } from "~/lib/utils";
import {
  deleteCourse,
  type MutationState,
  moveCourse,
  renameCourse,
} from "./actions";

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * A topic tile. Shows the user's chosen name with the original topic text
 * underneath, so renaming never loses what the course was actually built from.
 */
export function TopicCard({
  course,
  folders,
  dragType,
  dragging,
  onDragStateChange,
}: {
  course: Course;
  folders: Folder[];
  dragType: string;
  dragging: boolean;
  onDragStateChange: (id: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const title = courseTitle(course);

  return (
    <motion.div
      layout
      transition={{ duration: 0.3, ease: EASE }}
      // Not draggable while the rename editor is open — dragging would
      // otherwise steal the text selection inside the input.
      draggable={!editing}
      onDragStart={(e) => {
        const dt = (e as unknown as React.DragEvent).dataTransfer;
        dt.setData(dragType, course.id);
        dt.effectAllowed = "move";
        onDragStateChange(course.id);
      }}
      onDragEnd={() => onDragStateChange(null)}
      className={cn(
        "group relative transition-opacity duration-200",
        !editing && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      {editing ? (
        <RenameCard
          course={course}
          folders={folders}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          <Link
            href={courseHref(course)}
            aria-label={`${title} — topic: ${course.topic}`}
            className="glass glass-lift flex h-36 flex-col justify-between rounded-xl p-4"
          >
            <span className="font-mono text-[10px] tracking-[0.14em] text-subtle uppercase">
              {course.status}
            </span>
            <span>
              <span className="line-clamp-2 text-sm font-semibold text-strong">
                {title}
              </span>
              {/* Always show the source topic — it's what the course was
                  generated from, and a rename shouldn't hide it. */}
              <span className="mt-1 line-clamp-1 block text-[11px] text-subtle">
                Topic: {course.topic}
              </span>
            </span>
          </Link>

          <button
            type="button"
            aria-label={`Rename ${title}`}
            onClick={() => setEditing(true)}
            className={cn(
              "absolute top-2 right-2 rounded-md px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] text-subtle uppercase",
              "opacity-0 transition-[opacity,color,background-color] duration-200 group-hover:opacity-100 focus-visible:opacity-100",
              "hover:bg-surface hover:text-strong",
            )}
          >
            Edit
          </button>
        </>
      )}
    </motion.div>
  );
}

function RenameCard({
  course,
  folders,
  onDone,
}: {
  course: Course;
  folders: Folder[];
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState<MutationState, FormData>(
    renameCourse,
    { error: null },
  );

  // A successful rename revalidates and re-renders with the new title; close
  // the editor once the action settles without an error.
  const settled = useRef(false);
  useEffect(() => {
    if (pending) {
      settled.current = true;
      return;
    }
    if (settled.current && !state.error) onDone();
  }, [pending, state.error, onDone]);

  useEffect(() => inputRef.current?.select(), []);

  return (
    <div className="glass flex min-h-36 flex-col gap-2 rounded-xl p-3">
      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={course.id} />
        <Input
          ref={inputRef}
          name="name"
          defaultValue={courseTitle(course)}
          aria-label="Topic name"
          onKeyDown={(e) => e.key === "Escape" && onDone()}
          className="h-8 text-sm"
        />
        <div className="flex gap-1.5">
          <Button
            type="submit"
            size="sm"
            disabled={pending}
            className="h-7 flex-1 rounded-md bg-brand px-2 text-xs font-semibold text-white hover:bg-brand/90"
          >
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onDone}
            className="h-7 rounded-md px-2 text-xs"
          >
            Cancel
          </Button>
        </div>
      </form>

      <MoveSelect course={course} folders={folders} />

      <DeleteTopic course={course} />

      {state.error && (
        <p role="alert" className="text-[11px] text-destructive">
          {state.error}
        </p>
      )}
    </div>
  );
}

/** Folder picker — submits on change, so there's no second button to press. */
function MoveSelect({
  course,
  folders,
}: {
  course: Course;
  folders: Folder[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<MutationState, FormData>(
    moveCourse,
    { error: null },
  );

  return (
    <form ref={formRef} action={formAction} className="mt-auto">
      <input type="hidden" name="id" value={course.id} />
      <select
        name="folderId"
        aria-label="Move to folder"
        defaultValue={course.folder_id ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        className="w-full rounded-md border border-input bg-surface px-2 py-1 text-[11px] text-subtle"
      >
        <option value="">No folder</option>
        {folders.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {folder.name}
          </option>
        ))}
      </select>
      <AnimatePresence>
        {state.error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="mt-1 text-[11px] text-destructive"
          >
            {state.error}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}

/**
 * Two-step delete. This cascades to the topic's sources, recordings and gap
 * reports, so a single mis-click must not be enough to trigger it.
 */
function DeleteTopic({ course }: { course: Course }) {
  const [armed, setArmed] = useState(false);
  const [state, formAction, pending] = useActionState<MutationState, FormData>(
    deleteCourse,
    { error: null },
  );

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="self-start font-mono text-[10px] tracking-[0.1em] text-destructive uppercase transition-colors hover:text-destructive/80"
      >
        Delete
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={course.id} />
      <span className="text-[11px] text-subtle">Are you sure?</span>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-destructive px-2 py-1 text-[11px] font-semibold text-white"
      >
        {pending ? "Deleting…" : "Yes"}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="text-[11px] text-subtle hover:text-strong"
      >
        No
      </button>
      {state.error && (
        <span role="alert" className="text-[11px] text-destructive">
          {state.error}
        </span>
      )}
    </form>
  );
}
