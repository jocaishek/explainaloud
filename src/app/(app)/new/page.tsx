import { isAdminEmail } from "~/lib/admin";
import { requireUser } from "~/lib/supabase/server";
import { NewTopicForm } from "./new-topic-form";

export default async function NewTopicPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; folder?: string; topic?: string }>;
}) {
  const { error, folder, topic } = await searchParams;
  const { user } = await requireUser();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-stack px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div data-rise="">
        <h1 className="font-display text-[2rem] text-strong leading-tight">
          Start a topic
        </h1>
        <p className="mt-2 text-foreground">
          Type a topic or paste your notes. Explainaloud builds a short course
          from real sources, then listens while you explain it back.
        </p>
      </div>

      <NewTopicForm
        folderId={folder}
        /* Carried from home's "Tonight I'm explaining" line, so the topic
           somebody typed there is already in the field. */
        initialTopic={topic?.slice(0, 200)}
        initialError={error}
        unlimited={isAdminEmail(user.email)}
      />
    </div>
  );
}
