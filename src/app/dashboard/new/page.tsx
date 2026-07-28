import { createCourse } from "~/app/dashboard/actions";
import { SubmitButton } from "~/components/submit-button";
import { Input } from "~/components/ui/input";

const ERROR_MESSAGES: Record<string, string> = {
  missing_topic: "Enter a topic before continuing.",
  create_failed: "Something went wrong creating that course. Try again.",
};

export default async function NewTopicPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; folder?: string }>;
}) {
  const { error, folder } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-strong">
          Start a topic
        </h1>
        <p className="mt-2 text-foreground">
          Type a topic or paste your notes. TeachItBack builds a short course
          from real sources, then listens while you teach it back.
        </p>
      </div>

      <form
        action={createCourse}
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/40"
      >
        {/* Carried through from a folder's "New topic" tile, so the course
            lands in the folder the user started from. RLS rejects a folder id
            belonging to anyone else. */}
        {folder && <input type="hidden" name="folderId" value={folder} />}
        <Input
          type="text"
          name="topic"
          required
          placeholder="e.g. Photosynthesis, the Krebs cycle, Bayes' theorem…"
          className="h-11 border-input bg-surface text-base text-strong placeholder:text-subtle"
        />
        <textarea
          name="notes"
          rows={4}
          placeholder="Paste your notes here (optional)"
          className="resize-none rounded-md border border-input bg-surface p-3 text-sm text-strong placeholder:text-subtle focus:outline-none"
        />
        {error && ERROR_MESSAGES[error] && (
          <p className="text-sm text-destructive">{ERROR_MESSAGES[error]}</p>
        )}
        <SubmitButton pendingLabel="Building course…">
          Build my course
        </SubmitButton>
      </form>
    </div>
  );
}
