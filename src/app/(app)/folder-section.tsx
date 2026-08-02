"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  FOLDER_COLOR_CLASSES,
  FOLDER_COLORS,
  type Folder,
  type FolderColor,
} from "~/lib/folders";
import { cn } from "~/lib/utils";
import {
  createFolder,
  deleteFolder,
  type MutationState,
  renameFolder,
} from "./actions";

const EASE = [0.23, 1, 0.32, 1] as const;

/** Swatch row shared by the create and rename forms. */
function ColorPicker({
  value,
  onChange,
}: {
  value: FolderColor;
  onChange: (color: FolderColor) => void;
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-1.5">
      <legend className="sr-only">Folder colour</legend>
      {FOLDER_COLORS.map((color) => {
        const { swatch, label } = FOLDER_COLOR_CLASSES[color];
        const selected = value === color;
        return (
          <label
            key={color}
            title={label}
            className={cn(
              "relative flex size-6 cursor-pointer items-center justify-center rounded-full transition-transform duration-200 ease-out",
              "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
              selected ? "scale-110" : "hover:scale-105",
            )}
          >
            <input
              type="radio"
              name="color"
              value={color}
              checked={selected}
              onChange={() => onChange(color)}
              className="sr-only"
            />
            <span className={cn("size-4 rounded-full", swatch)} />
            {selected && (
              <motion.span
                layoutId="folder-color-ring"
                transition={{ type: "spring", duration: 0.35, bounce: 0.2 }}
                className="absolute inset-0 rounded-full ring-2 ring-strong"
              />
            )}
          </label>
        );
      })}
    </fieldset>
  );
}

export function NewFolderButton() {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState<FolderColor>("default");
  const [state, formAction, pending] = useActionState<MutationState, FormData>(
    createFolder,
    { error: null },
  );

  const settled = useRef(false);
  useEffect(() => {
    if (pending) {
      settled.current = true;
      return;
    }
    if (settled.current && !state.error) {
      settled.current = false;
      setOpen(false);
      setColor("default");
    }
  }, [pending, state.error]);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="gap-1.5 rounded-full border-input bg-surface text-strong transition-transform duration-200 ease-out active:scale-[0.97]"
      >
        New folder
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.2, ease: EASE }}
            // Anchored right: the trigger sits at the right edge of the
            // header row, so a left-anchored panel would run off-screen.
            style={{ transformOrigin: "top right" }}
            className="absolute top-full right-0 z-20 mt-2 w-72 rounded-card border border-border bg-popover p-3 shadow-xl"
          >
            <form action={formAction} className="flex flex-col gap-3">
              <Input
                name="name"
                autoFocus
                placeholder="Folder name"
                aria-label="Folder name"
                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                className="h-9 text-sm"
              />
              <ColorPicker value={color} onChange={setColor} />
              {state.error && (
                <p role="alert" className="text-xs text-destructive">
                  {state.error}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={pending}
                  className="h-8 flex-1 rounded-full bg-brand-deep text-xs font-semibold text-white hover:bg-brand-deep/90"
                >
                  {pending ? "Creating…" : "Create folder"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  className="h-8 rounded-full text-xs"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FolderHeader({
  folder,
  count,
  collapsed,
  onToggle,
}: {
  folder: Folder;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const { swatch, text } = FOLDER_COLOR_CLASSES[folder.color];

  if (editing) {
    return <FolderEditRow folder={folder} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? "Expand" : "Collapse"} ${folder.name}`}
        className="flex items-center gap-2.5 text-left"
      >
        <span className={cn("size-2.5 shrink-0 rounded-full", swatch)} />
        <span className="text-sm font-semibold text-strong">{folder.name}</span>
        <span className={cn("font-mono text-[11px]", text)}>{count}</span>
        <motion.span
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="text-subtle"
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </button>

      <button
        type="button"
        aria-label={`Rename ${folder.name}`}
        onClick={() => setEditing(true)}
        className="ml-auto rounded-md px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] text-subtle uppercase transition-colors duration-200 hover:bg-surface hover:text-strong"
      >
        Rename
      </button>
    </div>
  );
}

function FolderEditRow({
  folder,
  onDone,
}: {
  folder: Folder;
  onDone: () => void;
}) {
  const [color, setColor] = useState<FolderColor>(folder.color);
  const [state, formAction, pending] = useActionState<MutationState, FormData>(
    renameFolder,
    { error: null },
  );
  const [removeState, removeAction, removing] = useActionState<
    MutationState,
    FormData
  >(deleteFolder, { error: null });

  const settled = useRef(false);
  useEffect(() => {
    if (pending) {
      settled.current = true;
      return;
    }
    if (settled.current && !state.error) onDone();
  }, [pending, state.error, onDone]);

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-3">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={folder.id} />
        <Input
          name="name"
          autoFocus
          defaultValue={folder.name}
          aria-label="Folder name"
          onKeyDown={(e) => e.key === "Escape" && onDone()}
          className="h-8 max-w-56 flex-1 text-sm"
        />
        <ColorPicker value={color} onChange={setColor} />
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          className="h-8 rounded-full bg-brand-deep px-3 text-xs font-semibold text-white hover:bg-brand-deep/90"
        >
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onDone}
          className="h-8 rounded-full px-3 text-xs"
        >
          Cancel
        </Button>
      </form>

      <form action={removeAction} className="flex items-center gap-2">
        <input type="hidden" name="id" value={folder.id} />
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          disabled={removing}
          className="h-7 gap-1.5 rounded-full px-2 text-xs text-destructive hover:bg-destructive/10"
        >
          {removing ? "Deleting…" : "Delete folder"}
        </Button>
        <span className="text-[11px] text-subtle">
          Topics inside move back to Loose topics.
        </span>
      </form>

      {(state.error || removeState.error) && (
        <p role="alert" className="text-xs text-destructive">
          {state.error ?? removeState.error}
        </p>
      )}
    </div>
  );
}
