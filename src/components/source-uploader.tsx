"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileText, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { ACCEPT_ATTRIBUTE } from "~/lib/uploads";
import { cn } from "~/lib/utils";

const EASE = [0.23, 1, 0.32, 1] as const;

export type SourceItem = {
  id: string;
  filename: string;
  byte_size: number;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Drop zone plus file picker for a course's sources.
 *
 * Uploads run one at a time rather than in parallel: each one is a parse on
 * the server, and a dropped folder of ten PDFs firing at once would stall the
 * route and give the student no idea which file failed.
 */
export function SourceUploader({
  courseId,
  initialSources,
  onChange,
}: {
  courseId: string;
  initialSources: SourceItem[];
  onChange?: (sources: SourceItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sources, setSources] = useState<SourceItem[]>(initialSources);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  // dragenter/dragleave fire for every child element, so a plain boolean
  // flickers as the pointer crosses the icon or the text inside the zone.
  const dragDepth = useRef(0);

  function publish(next: SourceItem[]) {
    setSources(next);
    onChange?.(next);
  }

  async function uploadAll(files: File[]) {
    setErrors([]);
    const failures: string[] = [];
    let current = sources;

    for (const file of files) {
      setBusy(file.name);
      const body = new FormData();
      body.set("file", file);

      try {
        const response = await fetch(`/api/courses/${courseId}/sources`, {
          method: "POST",
          body,
        });
        const json = await response.json();
        if (!response.ok) {
          failures.push(`${file.name}: ${json.error ?? "upload failed"}`);
        } else {
          current = [...current, json.source];
          publish(current);
        }
      } catch {
        failures.push(`${file.name}: couldn't reach the server`);
      }
    }

    setBusy(null);
    if (failures.length) setErrors(failures);
  }

  async function remove(id: string) {
    const next = sources.filter((s) => s.id !== id);
    publish(next);
    await fetch(`/api/courses/${courseId}/sources?id=${id}`, {
      method: "DELETE",
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drop target; the visible button inside is the keyboard path */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={() => {
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setDragActive(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragActive(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length) void uploadAll(files);
        }}
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-[border-color,background-color,transform] duration-200 ease-out",
          dragActive
            ? "scale-[1.01] border-brand bg-brand/[0.06]"
            : "border-border bg-surface",
        )}
      >
        <Upload
          className={cn(
            "size-6 transition-colors duration-200",
            dragActive ? "text-brand" : "text-subtle",
          )}
        />
        <div>
          <p className="text-sm font-medium text-strong">
            {dragActive ? "Drop to add them" : "Drag your sources here"}
          </p>
          <p className="mt-1 text-xs text-subtle">
            PDF, Word, or text — up to 5 MB each, 10 per topic
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!!busy}
          className="rounded-full border border-input bg-background px-4 py-1.5 text-xs font-medium text-strong transition-transform duration-200 ease-out hover:border-brand/40 active:scale-[0.97] disabled:opacity-50"
        >
          {busy ? `Reading ${busy}…` : "Browse your computer"}
        </button>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) void uploadAll(files);
            // Reset so re-picking the same file still fires a change event.
            e.target.value = "";
          }}
        />
      </div>

      <AnimatePresence initial={false}>
        {sources.map((source) => (
          <motion.div
            key={source.id}
            layout
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
          >
            <FileText className="size-4 shrink-0 text-brand" />
            <span className="min-w-0 flex-1 truncate text-sm text-strong">
              {source.filename}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-subtle">
              {formatSize(source.byte_size)}
            </span>
            <button
              type="button"
              aria-label={`Remove ${source.filename}`}
              onClick={() => void remove(source.id)}
              className="shrink-0 rounded-md p-1 text-subtle transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {errors.map((message) => (
        <p key={message} role="alert" className="text-xs text-destructive">
          {message}
        </p>
      ))}
    </div>
  );
}
