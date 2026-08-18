"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  ExternalLink,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  type Course,
  courseHref,
  courseTitle,
  FOLDER_COLOR_CLASSES,
  type Folder,
} from "~/lib/folders";
import { cn } from "~/lib/utils";
import {
  createFolder,
  deleteCourse,
  moveCourse,
  pinCourse,
  renameCourse,
} from "./actions";

/**
 * The topics in the rail: filed, movable, and removable from where you see
 * them.
 *
 * The rail listed six recent topics as flat links, and the reasonable question
 * that followed was why none of it could be *used* — why a topic could not be
 * deleted, why a folder could not be made, why nothing could be dragged into
 * one. All of that already existed on the Home grid, which is the wrong answer
 * to "why not here": a sidebar that shows your material and refuses to organise
 * it is a list, and the grid is two clicks away from every screen that is not
 * Home.
 *
 * So the rail is the same object as the grid now, at rail scale. Folders group
 * their topics and collapse; a topic carries a menu with delete and move; and a
 * topic dragged onto a folder is filed there. It deliberately does *not* grow
 * rename, colour-picking or folder deletion — those are one-off, deliberate
 * acts with a wider blast radius, and the grid does them properly with room for
 * a confirmation. What the rail gets is the everyday half.
 */

/** What the rail needs of a course: where it goes, what to call it, where it is filed. */
export type RailCourse = Pick<Course, "id" | "slug" | "topic" | "name"> & {
  folder_id: string | null;
  pinned: boolean;
};

const EASE = [0.23, 1, 0.32, 1] as const;

/** The drag payload, so the rail ignores files and text dragged in from outside. */
const DRAG_TYPE = "application/x-explainaloud-course";

export function RailTopics({
  folders,
  courses,
  isCurrent,
  onNavigate,
}: {
  folders: Folder[];
  courses: RailCourse[];
  /** Whether a course's page is the one on screen. */
  isCurrent: (href: string) => boolean;
  /** Closes the drawer on a small screen. Absent in the permanent rail. */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Optimistic filing. A drop that waits for the server before it moves is a
     drop that looks like it missed — the card sits where it was for as long as
     the round trip takes, which is exactly when somebody drags it again. */
  const [moved, setMoved] = useState<Record<string, string | null>>({});
  const folderOf = (course: RailCourse) =>
    course.id in moved ? moved[course.id] : course.folder_id;

  function move(courseId: string, folderId: string | null) {
    setDropTarget(null);
    const course = courses.find((item) => item.id === courseId);
    if (!course || folderOf(course) === folderId) return;

    setMoved((current) => ({ ...current, [courseId]: folderId }));
    setError(null);

    startTransition(async () => {
      const form = new FormData();
      form.set("id", courseId);
      form.set("folderId", folderId ?? "");
      const result = await moveCourse({ error: null }, form);
      if (result.error) {
        // Put it back. A move that failed must not look like it stuck.
        setMoved((current) => {
          const next = { ...current };
          delete next[courseId];
          return next;
        });
        setError(result.error);
      }
      router.refresh();
    });
  }

  function remove(courseId: string) {
    setConfirmDelete(null);
    setError(null);
    startTransition(async () => {
      const form = new FormData();
      form.set("id", courseId);
      const result = await deleteCourse({ error: null }, form);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function pin(courseId: string, pinned: boolean) {
    setError(null);
    startTransition(async () => {
      const form = new FormData();
      form.set("id", courseId);
      form.set("pinned", String(pinned));
      const result = await pinCourse({ error: null }, form);
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  function rename(courseId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const form = new FormData();
      form.set("id", courseId);
      form.set("name", trimmed);
      const result = await renameCourse({ error: null }, form);
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  function addFolder(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreatingFolder(false);
    setFolderName("");
    setError(null);
    startTransition(async () => {
      const form = new FormData();
      form.set("name", trimmed);
      form.set("color", "default");
      const result = await createFolder({ error: null }, form);
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  /** Everything a drop zone needs, for a folder or for the loose list. */
  function zone(folderId: string | null) {
    const key = folderId ?? "__loose__";
    return {
      onDragOver: (event: React.DragEvent) => {
        if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
        // preventDefault is what actually marks this element as droppable.
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDropTarget(key);
      },
      onDragLeave: (event: React.DragEvent) => {
        // Ignore bubbling from children, or the highlight strobes as the
        // pointer crosses each row inside the zone.
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }
        setDropTarget((current) => (current === key ? null : current));
      },
      onDrop: (event: React.DragEvent) => {
        const id = event.dataTransfer.getData(DRAG_TYPE);
        if (!id) return;
        event.preventDefault();
        move(id, folderId);
      },
      lit: dropTarget === key,
    };
  }

  /* Pinned topics are lifted clean out of the list and shown above the folders.
     Sorting them to the top *within* their own folder — which is what this used
     to do — is not what a pin is for: the point of pinning is that you stop
     having to remember where you filed it. A pin that only reorders the inside
     of a closed folder is invisible, which is exactly the report.

     Lifted rather than duplicated. The same topic in two places in one rail
     reads as a bug, and the folder count below counts what is actually in the
     folder on screen.

     Computed here rather than in the query because `folderOf` is optimistic — a
     topic dragged a moment ago is in its new folder on screen before the server
     has heard about it. */
  const pinned = courses.filter((course) => course.pinned);
  const unpinned = courses.filter((course) => !course.pinned);
  const loose = unpinned.filter((course) => !folderOf(course));

  return (
    <nav aria-label="Topics" className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-3 pb-1.5">
        <p className="font-medium text-[0.75rem] text-subtle">Topics</p>
        <span className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setCreatingFolder((was) => !was)}
            aria-label="New folder"
            title="New folder"
            className="press flex size-5 items-center justify-center rounded-control text-subtle transition-colors hover:bg-muted hover:text-strong"
          >
            <FolderPlus className="size-3.5" />
          </button>
          {/* Starting a topic from the list of topics, where the thought
              occurs. The button at the top of the rail is the same
              destination; this one is the one you reach for when you are
              already looking at what you have. */}
          <Link
            href="/new"
            onClick={onNavigate}
            aria-label="New topic"
            title="New topic"
            className="press flex size-5 items-center justify-center rounded-control text-subtle transition-colors hover:bg-muted hover:text-strong"
          >
            <Plus className="size-3.5" />
          </Link>
        </span>
      </div>

      <AnimatePresence initial={false}>
        {creatingFolder && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="overflow-hidden px-3 pb-2"
          >
            {/* Enter creates, Escape abandons. A folder is one word and a
                dialog for it would be three interactions for one. */}
            <input
              // biome-ignore lint/a11y/noAutofocus: the field only exists because it was just asked for
              autoFocus
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addFolder(folderName);
                if (event.key === "Escape") {
                  setCreatingFolder(false);
                  setFolderName("");
                }
              }}
              onBlur={() => addFolder(folderName)}
              placeholder="Folder name"
              aria-label="Folder name"
              maxLength={40}
              className="w-full rounded-control border border-input bg-card px-2 py-1.5 text-sm text-strong outline-none placeholder:text-subtle focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p role="alert" className="px-3 pb-2 text-[0.72rem] text-destructive">
          {error}
        </p>
      )}

      {/* Its own scroll region. Forty topics must not push the account block
          off the bottom of the rail. */}
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {/* Above the folders, because that is the whole of what a pin does. */}
        {pinned.length > 0 && (
          <ul className="mb-1 border-border border-b pb-1">
            <li className="flex items-center gap-1.5 px-2 py-1.5 font-medium text-[0.75rem] text-subtle">
              <Pin aria-hidden className="size-3 shrink-0" />
              Pinned
            </li>
            {pinned.map((course) => (
              <TopicRow
                key={course.id}
                course={course}
                folders={folders}
                current={isCurrent(courseHref(course))}
                confirming={confirmDelete === course.id}
                onConfirmDelete={() => setConfirmDelete(course.id)}
                onCancelDelete={() => setConfirmDelete(null)}
                onDelete={() => remove(course.id)}
                onMove={(folderId) => move(course.id, folderId)}
                onPin={() => pin(course.id, !course.pinned)}
                onRename={(name) => rename(course.id, name)}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        )}

        {folders.map((folder) => {
          const inFolder = unpinned.filter(
            (course) => folderOf(course) === folder.id,
          );
          const shut = collapsed[folder.id] ?? false;
          const drop = zone(folder.id);
          const { text } = FOLDER_COLOR_CLASSES[folder.color];

          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: pointer-only enhancement; the menu on each topic is the keyboard path
            <div
              key={folder.id}
              onDragOver={drop.onDragOver}
              onDragLeave={drop.onDragLeave}
              onDrop={drop.onDrop}
              className={cn(
                "rounded-control transition-colors duration-200",
                drop.lit &&
                  "bg-accent-wash ring-1 ring-[color:var(--accent-solid)]",
              )}
            >
              <button
                type="button"
                onClick={() =>
                  setCollapsed((current) => ({
                    ...current,
                    [folder.id]: !shut,
                  }))
                }
                aria-expanded={!shut}
                className="press flex w-full items-center gap-1.5 rounded-control px-2 py-1.5 text-left text-sm text-subtle transition-colors hover:bg-muted hover:text-strong"
              >
                <ChevronRight
                  aria-hidden
                  className={cn(
                    "size-3.5 shrink-0 transition-transform duration-200",
                    !shut && "rotate-90",
                  )}
                />
                <span className={cn("min-w-0 truncate font-medium", text)}>
                  {folder.name}
                </span>
                <span className="ml-auto font-mono text-[0.6rem] text-subtle tabular-nums">
                  {inFolder.length}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {!shut && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="overflow-hidden"
                  >
                    {inFolder.map((course) => (
                      <TopicRow
                        key={course.id}
                        course={course}
                        folders={folders}
                        indented
                        current={isCurrent(courseHref(course))}
                        confirming={confirmDelete === course.id}
                        onConfirmDelete={() => setConfirmDelete(course.id)}
                        onCancelDelete={() => setConfirmDelete(null)}
                        onDelete={() => remove(course.id)}
                        onMove={(folderId) => move(course.id, folderId)}
                        onPin={() => pin(course.id, !course.pinned)}
                        onRename={(name) => rename(course.id, name)}
                        onNavigate={onNavigate}
                      />
                    ))}
                    {inFolder.length === 0 && (
                      <li className="px-3 py-1.5 pl-8 text-[0.72rem] text-subtle">
                        {drop.lit ? "Drop to file it here" : "Empty"}
                      </li>
                    )}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {(() => {
          const drop = zone(null);
          return (
            <ul
              onDragOver={drop.onDragOver}
              onDragLeave={drop.onDragLeave}
              onDrop={drop.onDrop}
              className={cn(
                "rounded-control transition-colors duration-200",
                folders.length > 0 && "mt-1",
                drop.lit &&
                  "bg-accent-wash ring-1 ring-[color:var(--accent-solid)]",
              )}
            >
              {loose.map((course) => (
                <TopicRow
                  key={course.id}
                  course={course}
                  folders={folders}
                  current={isCurrent(courseHref(course))}
                  confirming={confirmDelete === course.id}
                  onConfirmDelete={() => setConfirmDelete(course.id)}
                  onCancelDelete={() => setConfirmDelete(null)}
                  onDelete={() => remove(course.id)}
                  onMove={(folderId) => move(course.id, folderId)}
                  onPin={() => pin(course.id, !course.pinned)}
                  onRename={(name) => rename(course.id, name)}
                  onNavigate={onNavigate}
                />
              ))}
              {loose.length === 0 && folders.length > 0 && (
                <li className="px-3 py-1.5 text-[0.72rem] text-subtle">
                  {drop.lit
                    ? "Drop to take it out of a folder"
                    : "No loose topics"}
                </li>
              )}
            </ul>
          );
        })()}
      </div>
    </nav>
  );
}

/**
 * The items, written once.
 *
 * Right-click and the ⋯ button open the same menu, and Radix keeps context
 * menus and dropdowns as separate primitives because they answer different
 * questions about where to appear — at the pointer, or against the control. So
 * the primitive set is passed in and the list of items is not duplicated: two
 * copies of a menu drift, and the one nobody opens is the one that goes stale.
 *
 * Modelled on the menu asked for, minus "mark as unread" — there is nothing in
 * this product a topic can be unread *of* — and with "add to project" and "move
 * to group" collapsed into the one thing this app has, which is a folder.
 */
function topicMenuItems({
  Item,
  Separator,
  Shortcut,
  Sub,
  SubTrigger,
  SubContent,
  course,
  folders,
  onPin,
  onRename,
  onMove,
  onConfirmDelete,
}: {
  Item: typeof DropdownMenuItem;
  Separator: typeof DropdownMenuSeparator;
  Shortcut: typeof DropdownMenuShortcut;
  Sub: typeof DropdownMenuSub;
  SubTrigger: typeof DropdownMenuSubTrigger;
  SubContent: typeof DropdownMenuSubContent;
  course: RailCourse;
  folders: Folder[];
  onPin: () => void;
  onRename: () => void;
  onMove: (folderId: string | null) => void;
  onConfirmDelete: () => void;
}) {
  return (
    <>
      <Item onSelect={onPin}>
        {course.pinned ? <PinOff /> : <Pin />}
        {course.pinned ? "Unpin" : "Pin"}
        <Shortcut>P</Shortcut>
      </Item>
      <Item onSelect={onRename}>
        <Pencil />
        Rename
        <Shortcut>R</Shortcut>
      </Item>

      {folders.length > 0 && (
        <Sub>
          <SubTrigger>
            <FolderPlus />
            Move to folder
          </SubTrigger>
          <SubContent>
            {folders.map((folder) => (
              <Item
                key={folder.id}
                disabled={course.folder_id === folder.id}
                onSelect={() => onMove(folder.id)}
              >
                {folder.name}
              </Item>
            ))}
            {course.folder_id && (
              <>
                <Separator />
                <Item onSelect={() => onMove(null)}>Take out of folder</Item>
              </>
            )}
          </SubContent>
        </Sub>
      )}

      <Separator />
      <Item variant="destructive" onSelect={onConfirmDelete}>
        <Trash2 />
        Delete
        <Shortcut>D</Shortcut>
      </Item>

      <Separator />
      {/* A real anchor inside the item, so the browser's own "open in new tab"
          machinery does the work — `window.open` from a click handler is what
          popup blockers exist to stop. */}
      <Item asChild>
        <a href={courseHref(course)} target="_blank" rel="noreferrer noopener">
          <ExternalLink />
          Open in new tab
        </a>
      </Item>
    </>
  );
}

function TopicRow({
  course,
  folders,
  current,
  indented = false,
  confirming,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
  onMove,
  onPin,
  onRename,
  onNavigate,
}: {
  course: RailCourse;
  folders: Folder[];
  current: boolean;
  indented?: boolean;
  confirming: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onMove: (folderId: string | null) => void;
  onPin: () => void;
  onRename: (name: string) => void;
  onNavigate?: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const title = courseTitle(course);

  /* The confirmation replaces the row rather than opening over it.
     A topic takes its recordings, its uploads and its gap reports with it, and
     that is not a thing to lose to a mis-click on a menu item. */
  if (confirming) {
    return (
      <li className={cn("px-2 py-1.5", indented && "pl-6")}>
        <p className="truncate text-[0.72rem] text-subtle">
          Delete “{title}” and its recordings?
        </p>
        <div className="mt-1 flex gap-1.5">
          <button
            type="button"
            onClick={onDelete}
            className="press rounded-control bg-destructive px-2 py-0.5 font-semibold text-[0.7rem] text-white"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onCancelDelete}
            className="press rounded-control px-2 py-0.5 text-[0.7rem] text-subtle hover:text-strong"
          >
            Keep
          </button>
        </div>
      </li>
    );
  }

  if (renaming) {
    return (
      <li className={cn("px-2 py-1", indented && "pl-6")}>
        {/* Enter saves, Escape abandons, blur saves — the same three keys as
            the folder field above, because they are the same gesture. */}
        <input
          // biome-ignore lint/a11y/noAutofocus: the field only exists because it was just asked for
          autoFocus
          defaultValue={title}
          aria-label={`Rename ${title}`}
          maxLength={80}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onRename(event.currentTarget.value);
              setRenaming(false);
            }
            if (event.key === "Escape") setRenaming(false);
          }}
          onBlur={(event) => {
            onRename(event.currentTarget.value);
            setRenaming(false);
          }}
          className="w-full rounded-control border border-input bg-card px-2 py-1 text-sm text-strong outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)]"
        />
      </li>
    );
  }

  const items = {
    course,
    folders,
    onPin,
    onRename: () => setRenaming(true),
    onMove,
    onConfirmDelete,
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <li
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(DRAG_TYPE, course.id);
            event.dataTransfer.effectAllowed = "move";
            setDragging(true);
          }}
          onDragEnd={() => setDragging(false)}
          className={cn(
            "group/row relative flex items-center transition-opacity duration-200",
            dragging && "opacity-40",
          )}
        >
          <Link
            href={courseHref(course)}
            onClick={onNavigate}
            aria-current={current ? "page" : undefined}
            className={cn(
              "press flex min-w-0 flex-1 items-center gap-2.5 rounded-control py-2 pr-7 pl-3 text-sm transition-colors duration-200",
              indented && "pl-7",
              current
                ? "bg-accent-wash font-medium text-strong"
                : "text-subtle hover:bg-muted hover:text-strong",
            )}
          >
            {/* A pin where the dot goes, when there is one. Forty identical
                document glyphs down a rail is furniture; a mark that means
                something is not. */}
            {course.pinned ? (
              <Pin
                aria-label="Pinned"
                className={cn(
                  "size-3 shrink-0",
                  current ? "text-[color:var(--accent-solid)]" : "text-subtle",
                )}
              />
            ) : (
              <span
                aria-hidden
                className={cn(
                  "size-1.5 shrink-0 rounded-full transition-colors duration-200",
                  current ? "bg-[color:var(--accent-solid)]" : "bg-border",
                )}
              />
            )}
            <span className="truncate">{title}</span>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Options for ${title}`}
              className="press absolute right-1 flex size-5 items-center justify-center rounded-control text-subtle opacity-0 transition-opacity hover:bg-muted hover:text-strong focus-visible:opacity-100 group-hover/row:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-48">
              {topicMenuItems({
                ...items,
                Item: DropdownMenuItem,
                Separator: DropdownMenuSeparator,
                Shortcut: DropdownMenuShortcut,
                Sub: DropdownMenuSub,
                SubTrigger: DropdownMenuSubTrigger,
                SubContent: DropdownMenuSubContent,
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      </ContextMenuTrigger>

      <ContextMenuContent className="min-w-48">
        {topicMenuItems({
          ...items,
          Item: ContextMenuItem as typeof DropdownMenuItem,
          Separator: ContextMenuSeparator,
          Shortcut: ContextMenuShortcut,
          Sub: ContextMenuSub,
          SubTrigger: ContextMenuSubTrigger as typeof DropdownMenuSubTrigger,
          SubContent: ContextMenuSubContent,
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}
