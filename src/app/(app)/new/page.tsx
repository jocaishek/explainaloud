import { isAdminEmail } from "~/lib/admin";
import { requireUser } from "~/lib/supabase/server";
import { NewTopicForm } from "./new-topic-form";

export default async function NewTopicPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; folder?: string }>;
}) {
  const { error, folder } = await searchParams;
  const { user } = await requireUser();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-stack px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-strong">
          Start a topic
        </h1>
        <p className="mt-2 text-foreground">
          Type a topic or paste your notes. Explainaloud builds a short course
          from real sources, then listens while you explain it back.
        </p>
      </div>

      <NewTopicForm
        folderId={folder}
        initialError={error}
        unlimited={isAdminEmail(user.email)}
      />
    </div>
  );
}
