"use client";

import { useRouter } from "next/navigation";
import { type DragEvent, type FormEvent, useRef, useState } from "react";
import { createCourse } from "~/app/(app)/actions";
import { LocalDayField } from "~/components/local-day-field";
import {
  SCOPE_OPTIONS,
  SCOPE_QUESTION,
  SourceScopeOption,
} from "~/components/source-scope-choice";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  HOMEWORK_MESSAGE,
  looksLikeHomework,
  materialLooksLikeHomework,
} from "~/lib/homework";
import { PURPOSE_COPY, PURPOSES, type Purpose } from "~/lib/purpose";
import { BROAD_TOPIC_MESSAGE, isTopicTooBroad } from "~/lib/topic-scope";
import {
  ACCEPT_ATTRIBUTE,
  ACCEPTED_EXTENSIONS,
  MAX_NOTES_CHARS,
  MAX_SOURCE_BYTES,
  sourceLimitFor,
} from "~/lib/uploads";
import { cn } from "~/lib/utils";

const ERROR_MESSAGES: Record<string, string> = {
  missing_topic: "Enter a topic before continuing.",
  topic_too_broad: BROAD_TOPIC_MESSAGE,
  create_failed: "Something went wrong creating that course. Try again.",
  topic_is_homework: HOMEWORK_MESSAGE,
  topic_limit:
    "You\u2019ve hit today\u2019s limit of 2 new topics. It resets at midnight your time.",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function NewTopicForm({
  folderId,
  initialError,
  unlimited = false,
}: {
  folderId?: string;
  initialError?: string;
  /** Admins bypass the per-topic source cap. */
  unlimited?: boolean;
}) {
  const sourceLimit = sourceLimitFor(unlimited);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [files, setFiles] = useState<File[]>([]);
  // Controlled only so the length can be reported back; the value still posts
  // through the form's own `name`, and the whole of it is saved.
  const [notes, setNotes] = useState("");
  const [dragActive, setDragActive] = useState(false);
  // Off by default: someone who uploads a single handout and expects a whole
  // course should get one. Strictness is the deliberate choice, not the
  // accidental one.
  const [sourcesOnly, setSourcesOnly] = useState(false);
  const [purpose, setPurpose] = useState<Purpose>("study");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    initialError ? (ERROR_MESSAGES[initialError] ?? null) : null,
  );
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  // Kept alongside the id because links address a course by slug, and a
  // half-finished upload still has to be able to open the course it made.
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  function addFiles(incoming: File[]) {
    setError(null);
    const existing = new Set(files.map(fileKey));
    const next = [...files];
    const rejected: string[] = [];

    for (const file of incoming) {
      if (existing.has(fileKey(file))) continue;
      if (next.length >= sourceLimit) {
        rejected.push(`A topic can hold ${sourceLimit} sources.`);
        break;
      }
      if (file.size > MAX_SOURCE_BYTES) {
        rejected.push(`${file.name} is over the 5 MB limit.`);
        continue;
      }
      const lowerName = file.name.toLowerCase();
      if (
        !ACCEPTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))
      ) {
        rejected.push(`${file.name} is not a supported file type.`);
        continue;
      }
      existing.add(fileKey(file));
      next.push(file);
    }

    setFiles(next);
    if (rejected.length) setError([...new Set(rejected)].join(" "));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  async function uploadSources(courseId: string) {
    if (files.length === 0) return true;

    const failures: File[] = [];
    const messages: string[] = [];

    for (const [index, file] of files.entries()) {
      setStatus(`Reading source ${index + 1} of ${files.length}: ${file.name}`);
      const body = new FormData();
      body.set("file", file);

      try {
        const response = await fetch(`/api/courses/${courseId}/sources`, {
          method: "POST",
          body,
        });
        const json = await response.json();
        if (!response.ok) {
          failures.push(file);
          messages.push(`${file.name}: ${json.error ?? "upload failed"}`);
        }
      } catch {
        failures.push(file);
        messages.push(`${file.name}: couldn't reach the server`);
      }
    }

    setFiles(failures);
    if (failures.length > 0) {
      setError(
        `Your topic was created, but ${failures.length} source${failures.length === 1 ? "" : "s"} could not be added. ${messages.join(" ")}`,
      );
      setStatus(null);
      return false;
    }

    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const formData = new FormData(event.currentTarget);
    const topic = String(formData.get("topic") ?? "");
    // Mirrors the server: breadth is a study problem. A talk's title is a
    // title, and its material is the speaker's own deck.
    if (purpose === "study" && isTopicTooBroad(topic)) {
      setError(BROAD_TOPIC_MESSAGE);
      setStatus(null);
      return;
    }
    const notes = String(formData.get("notes") ?? "");
    if (looksLikeHomework(topic) || materialLooksLikeHomework(notes)) {
      setError(HOMEWORK_MESSAGE);
      setStatus(null);
      return;
    }

    setPending(true);
    setError(null);

    let courseId = createdCourseId;
    let courseSlug = createdSlug;
    if (!courseId) {
      setStatus("Creating your topic…");
      const result = await createCourse(formData);
      if (!result.ok) {
        setError(ERROR_MESSAGES[result.error]);
        setStatus(null);
        setPending(false);
        return;
      }
      courseId = result.courseId;
      courseSlug = result.slug;
      setCreatedCourseId(courseId);
      setCreatedSlug(courseSlug);
    }

    const uploaded = await uploadSources(courseId);
    if (!uploaded) {
      setPending(false);
      return;
    }

    setStatus("Opening your course…");
    router.push(`/home/${courseSlug ?? courseId}`);
  }

  function leaveDragTarget() {
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragActive(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-card border border-border bg-card p-6 shadow-float"
    >
      {/* A folder's New topic tile carries its destination into creation.
          Owner-scoped RLS still rejects another user's folder id. */}
      {folderId && <input type="hidden" name="folderId" value={folderId} />}
      <LocalDayField />

      {/* Asked first, because it changes what the rest of the form means: the
          same upload is either material to learn from or a talk to be checked
          against. It is also the only question here somebody can answer
          without thinking — they already know why they opened the app. */}
      <fieldset
        disabled={!!createdCourseId || pending}
        className="flex flex-col gap-3 disabled:opacity-60"
      >
        <legend className="text-sm font-semibold text-strong">
          What is this for?
        </legend>
        <div className="flex flex-col gap-2 sm:flex-row">
          {PURPOSES.map((value) => (
            <SourceScopeOption
              key={value}
              name="purpose"
              value={value}
              checked={purpose === value}
              onSelect={() => setPurpose(value)}
              title={PURPOSE_COPY[value].label}
              description={PURPOSE_COPY[value].blurb}
            />
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-4">
        <Input
          type="text"
          name="topic"
          required
          disabled={!!createdCourseId}
          placeholder={
            purpose === "talk"
              ? "e.g. Capstone presentation, Founders pitch, Toast for Sam…"
              : "e.g. Photosynthesis, the Krebs cycle, Bayes' theorem…"
          }
          className="h-11 border-input bg-surface text-base text-strong placeholder:text-subtle"
          aria-invalid={error === BROAD_TOPIC_MESSAGE}
          aria-describedby={
            error === BROAD_TOPIC_MESSAGE ? "new-topic-error" : undefined
          }
          onChange={() => {
            if (error === BROAD_TOPIC_MESSAGE) setError(null);
          }}
        />
        <textarea
          name="notes"
          rows={4}
          disabled={!!createdCourseId}
          placeholder="Paste your notes here (optional)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="resize-none rounded-md border border-input bg-surface p-3 text-sm text-strong placeholder:text-subtle focus:outline-none disabled:opacity-60"
        />
        {/* Said before submitting, not discovered afterwards.
         *
         * The whole note is saved and shown on the topic page; only what
         * travels to the course builder is bounded. Without this the cut is
         * silent, and a student who pasted a chapter would have no way to know
         * the course was built from part of it. */}
        {notes.length > MAX_NOTES_CHARS && (
          <p className="text-xs text-subtle">
            That&apos;s {notes.length.toLocaleString()} characters. The course
            is built from the first {MAX_NOTES_CHARS.toLocaleString()} — the
            rest is saved with your topic but not sent to the builder. Paste the
            part you want taught, or upload it as a file instead.
          </p>
        )}
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="source-heading">
        <div>
          <h2 id="source-heading" className="text-sm font-semibold text-strong">
            Add sources{" "}
            <span className="font-normal text-subtle">(optional)</span>
          </h2>
          <p className="mt-1 text-xs text-subtle">
            Ground the course in your own PDFs, Word files, or text. You can
            also add these later.
          </p>
        </div>

        {/* biome-ignore lint/a11y/noStaticElementInteractions: drop target; the button provides the keyboard path */}
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            dragDepth.current += 1;
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={leaveDragTarget}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border border-dashed px-5 py-6 text-center transition-[border-color,background-color,transform] duration-200",
            dragActive
              ? "scale-[1.01] border-brand bg-brand/[0.06]"
              : "border-border bg-surface",
          )}
        >
          <p className="text-sm font-medium text-strong">
            {dragActive ? "Drop to queue sources" : "Drag sources here"}
          </p>
          <p className="text-xs text-subtle">
            Up to 5 MB each · {unlimited ? "unlimited" : sourceLimit} files
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
            className="mt-1 rounded-full"
          >
            Choose files
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </div>

        {/* Only meaningful once something is queued: with no files there is
            nothing to be strict about. Appears with the first upload rather
            than sitting there greyed out, so the choice arrives at the moment
            it starts to mean something. */}
        {files.length > 0 && (
          <fieldset
            disabled={!!createdCourseId || pending}
            className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 disabled:opacity-60"
          >
            <legend className="px-1 text-sm font-semibold text-strong">
              {SCOPE_QUESTION}
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              <SourceScopeOption
                name="sourcesOnly"
                value="off"
                checked={!sourcesOnly}
                onSelect={() => setSourcesOnly(false)}
                {...SCOPE_OPTIONS.open}
              />
              <SourceScopeOption
                name="sourcesOnly"
                value="on"
                checked={sourcesOnly}
                onSelect={() => setSourcesOnly(true)}
                {...SCOPE_OPTIONS.strict}
              />
            </div>
            {sourcesOnly && (
              <p className="text-xs leading-5 text-subtle">
                Expect a shorter course. If your files only cover part of the
                topic, that is what you will get. The rest is named instead of
                filled in.
              </p>
            )}
          </fieldset>
        )}

        {files.length > 0 && (
          <ul className="flex flex-col gap-2">
            {files.map((file) => (
              <li
                key={fileKey(file)}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-strong">
                  {file.name}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-subtle">
                  {formatSize(file.size)}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    setFiles((current) =>
                      current.filter((item) => fileKey(item) !== fileKey(file)),
                    )
                  }
                  className="shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] text-destructive uppercase transition-colors hover:bg-destructive/10 disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {status && (
        <p role="status" className="text-sm text-subtle">
          {status}
        </p>
      )}
      {error && (
        <p
          id="new-topic-error"
          role="alert"
          className="max-w-[65ch] text-sm leading-6 text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={pending}
          className="bg-accent-solid font-semibold text-accent-contrast shadow-[0_0_30px_-8px_var(--color-brand-deep)] transition-transform hover:bg-accent-solid-hover active:scale-[0.98]"
        >
          {pending
            ? status || "Building course…"
            : createdCourseId
              ? "Retry sources"
              : files.length > 0
                ? `Build with ${files.length} source${files.length === 1 ? "" : "s"}`
                : "Build my course"}
        </Button>

        {createdCourseId && (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              router.push(`/home/${createdSlug ?? createdCourseId}`)
            }
          >
            Continue without failed sources
          </Button>
        )}
      </div>
    </form>
  );
}
