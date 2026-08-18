"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";
import { removeAvatar, saveAvatar } from "./actions";

/** Matches the bucket's own ceiling, so the failure is caught before the upload. */
const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

/**
 * The picture, and the two things you can do to it.
 *
 * The whole avatar is the control — clicking the image is what everybody tries
 * first, and a camera badge in the corner says so without a button underneath
 * repeating it in words.
 *
 * The upload goes browser → storage directly. It is a `<input type="file">`
 * behind a label rather than a drop zone, because a drop zone is a rectangle
 * with a dashed border and an icon in the middle, and that is the same shape as
 * every generated upload widget on the internet.
 */
export function AvatarPicker({
  url,
  initials,
  userId,
}: {
  url: string | null;
  initials: string;
  userId: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  /* Shown immediately from the chosen file, so the new picture is on screen
     while the bytes are still going up rather than after a round trip. */
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview ?? url;

  async function upload(file: File) {
    setError(null);
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("Pick a PNG, JPEG, WebP or GIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That picture is over 2 MB. Pick a smaller one.");
      return;
    }

    setBusy(true);
    setPreview(URL.createObjectURL(file));

    const supabase = createClient();
    const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
    /* One path per account rather than one per upload, with `upsert`. A new
       filename every time leaves every previous picture in the bucket forever,
       and nothing ever goes back to delete them. */
    const path = `${userId}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setBusy(false);
      setPreview(null);
      setError("We couldn't upload that. Try again shortly.");
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    /* A cache-buster, because the path is stable by design: without it the
       browser and the CDN both keep serving the picture that was just
       replaced, and the change looks like it did not happen. */
    const stamped = `${publicUrl}?v=${Date.now()}`;
    const result = await saveAvatar(stamped);
    setBusy(false);
    if (result.error) {
      setPreview(null);
      setError(result.error);
      return;
    }
    setPreview(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => input.current?.click()}
          aria-label={shown ? "Change your picture" : "Add a picture"}
          className="press group relative block size-20 overflow-hidden rounded-full bg-accent-wash outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)]"
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shown}
              alt=""
              className="size-full object-cover"
              width={80}
              height={80}
            />
          ) : (
            <span className="flex size-full items-center justify-center font-medium text-[1.4rem] text-brand-ink">
              {initials}
            </span>
          )}
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-[rgba(28,25,23,0.55)] text-white opacity-0 transition-opacity duration-200",
              "group-hover:opacity-100 group-focus-visible:opacity-100",
              busy && "opacity-100",
            )}
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Camera className="size-5" />
            )}
          </span>
        </button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Cleared so choosing the same file twice still fires a change.
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </div>

      <div className="min-w-0">
        <p className="text-[0.85rem] text-subtle leading-relaxed">
          A square picture looks best. PNG, JPEG, WebP or GIF, up to 2 MB.
        </p>
        <div className="mt-2 flex items-center gap-4">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="press font-medium text-[0.85rem] text-[color:var(--accent-solid)] underline-offset-4 hover:underline disabled:opacity-50"
          >
            {shown ? "Change picture" : "Upload a picture"}
          </button>
          {url && (
            <button
              type="button"
              disabled={busy || pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await removeAvatar();
                  if (result.error) setError(result.error);
                  else router.refresh();
                })
              }
              className="press text-[0.85rem] text-subtle underline-offset-4 hover:text-strong hover:underline disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-[0.8rem] text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
