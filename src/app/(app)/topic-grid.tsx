"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { type Course, FOLDER_COLOR_CLASSES, type Folder } from "~/lib/folders";
import { cn } from "~/lib/utils";
import { moveCourse } from "./actions";
import { FolderHeader, NewFolderButton } from "./folder-section";
import { TopicCard } from "./topic-card";

const EASE = [0.23, 1, 0.32, 1] as const;

/** Shared grid geometry — cards are deliberately compact. */
const GRID =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

/** Custom MIME type so the grid ignores files and text dragged in from outside. */
const DRAG_TYPE = "application/x-explainaloud-course";

export function TopicGrid({
  folders,
  courses,
}: {
  folders: Folder[];
  courses: Course[];
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Optimistic overrides so a dropped card jumps to its new home immediately
  // rather than after the server round-trip.
  const [moved, setMoved] = useState<Record<string, string | null>>({});
  const folderOf = (course: Course) =>
    course.id in moved ? moved[course.id] : course.folder_id;

  const loose = courses.filter((c) => !folderOf(c));

  function handleDrop(courseId: string, folderId: string | null) {
    setDragging(null);
    setDropTarget(null);

    const course = courses.find((c) => c.id === courseId);
    if (!course || folderOf(course) === folderId) return;

    setMoved((m) => ({ ...m, [courseId]: folderId }));

    startTransition(async () => {
      const form = new FormData();
      form.set("id", courseId);
      form.set("folderId", folderId ?? "");
      const result = await moveCourse({ error: null }, form);
      if (result.error) {
        // Put it back where it was — a failed move must not look like it stuck.
        setMoved((m) => {
          const next = { ...m };
          delete next[courseId];
          return next;
        });
      }
      router.refresh();
    });
  }

  /** Props shared by every drop zone. */
  function dropZone(folderId: string | null) {
    const key = folderId ?? "__loose__";
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
        // preventDefault is what actually marks this element as droppable.
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDropTarget(key);
      },
      onDragLeave: (e: React.DragEvent) => {
        // Ignore bubbling from children, or the highlight strobes as the
        // pointer crosses each card inside the zone.
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setDropTarget((t) => (t === key ? null : t));
      },
      onDrop: (e: React.DragEvent) => {
        const id = e.dataTransfer.getData(DRAG_TYPE);
        if (!id) return;
        e.preventDefault();
        handleDrop(id, folderId);
      },
      active: dropTarget === key,
    };
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between gap-4 border-border border-b pb-3">
        <h2 className="font-mono text-[0.7rem] text-subtle uppercase tracking-[0.09em]">
          Your topics
          <span className="ml-3 text-strong tabular-nums">
            {courses.length}
          </span>
        </h2>
        <NewFolderButton />
      </div>

      {folders.map((folder) => {
        const inFolder = courses.filter((c) => folderOf(c) === folder.id);
        const isCollapsed = collapsed[folder.id] ?? false;
        const { border, tint } = FOLDER_COLOR_CLASSES[folder.color];
        const zone = dropZone(folder.id);

        return (
          // Drag-and-drop is a pointer-only enhancement. The keyboard and
          // screen-reader path is the "Move to folder" select inside each
          // card's rename panel, which performs the identical mutation.
          // biome-ignore lint/a11y/noStaticElementInteractions: pointer-only enhancement with a keyboard equivalent
          <section
            key={folder.id}
            onDragOver={zone.onDragOver}
            onDragLeave={zone.onDragLeave}
            onDrop={zone.onDrop}
            className={cn(
              "rounded-2xl border p-4 transition-[border-color,box-shadow,transform] duration-200 ease-out",
              border,
              tint,
              zone.active &&
                "scale-[1.005] border-brand shadow-[0_0_0_3px_var(--color-brand)]/20",
            )}
          >
            <FolderHeader
              folder={folder}
              count={inFolder.length}
              collapsed={isCollapsed}
              onToggle={() =>
                setCollapsed((c) => ({ ...c, [folder.id]: !isCollapsed }))
              }
            />

            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className={cn(GRID, "mt-4")}>
                    {inFolder.map((course) => (
                      <TopicCard
                        key={course.id}
                        course={course}
                        folders={folders}
                        dragType={DRAG_TYPE}
                        dragging={dragging === course.id}
                        onDragStateChange={setDragging}
                      />
                    ))}
                    <NewTopicTile folderId={folder.id} />
                  </div>
                  {inFolder.length === 0 && (
                    <p className="mt-3 text-xs text-subtle">
                      {zone.active
                        ? "Drop to file it here."
                        : "Empty for now. Drag a topic in from below, or start one here."}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        );
      })}

      {(() => {
        const zone = dropZone(null);
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: pointer-only enhancement with a keyboard equivalent
          <section
            onDragOver={zone.onDragOver}
            onDragLeave={zone.onDragLeave}
            onDrop={zone.onDrop}
            className={cn(
              "flex flex-col gap-4 rounded-2xl border border-transparent p-4 transition-colors duration-200",
              zone.active && "border-brand bg-brand/[0.04]",
            )}
          >
            {folders.length > 0 && (
              <h3 className="font-semibold text-sm text-strong">
                Loose topics
                {dragging && (
                  <span className="ml-2 font-normal text-subtle">
                    Drop here to take it out of a folder
                  </span>
                )}
              </h3>
            )}
            <div className={GRID}>
              {loose.map((course) => (
                <TopicCard
                  key={course.id}
                  course={course}
                  folders={folders}
                  dragType={DRAG_TYPE}
                  dragging={dragging === course.id}
                  onDragStateChange={setDragging}
                />
              ))}
              <NewTopicTile />
            </div>
          </section>
        );
      })()}
    </div>
  );
}

function NewTopicTile({ folderId }: { folderId?: string }) {
  return (
    <Link
      href={folderId ? `/new?folder=${folderId}` : "/new"}
      className="press flex h-36 flex-col items-center justify-center gap-1.5 rounded-xl border border-border border-dashed text-subtle transition-colors duration-200 hover:border-brand hover:text-brand-ink"
    >
      <Plus className="size-4" />
      <span className="text-xs font-medium">New topic</span>
    </Link>
  );
}
