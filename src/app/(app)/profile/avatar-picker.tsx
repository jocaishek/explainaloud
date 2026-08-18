"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";
import { removeAvatar, saveAvatar } from "./actions";
import { AvatarCropper } from "./avatar-cropper";

/**
 * Matches the bucket's own ceiling, so the failure is a sentence rather than a
 * rejected request.
 *
 * It was 2 MB, argued from what the rail renders — which is 32 pixels, so by
 * that reasoning 2 MB was already enormous. Wrong thing to measure. What people
 * upload is whatever their phone took, and that is routinely three or four
 * megabytes untouched, so the limit was not protecting anything. It was
 * rejecting the ordinary case and asking somebody to go and resize a file by
 * hand.
 *
 * It costs nothing now regardless: the cropper re-encodes to a 512px WebP
 * before anything is uploaded, so what lands in the bucket is tens of
 * kilobytes whatever was chosen. This only bounds what the browser is asked to
 * decode.
 */
const MAX_BYTES = 5 * 1024 * 1024;
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
  /* The file being cropped. Non-null is the whole of "the cropper is open" —
     one piece of state rather than a file and a boolean that can disagree. */
  const [chosen, setChosen] = useState<File | null>(null);
  const shown = preview ?? url;

  function choose(file: File) {
    setError(null);
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("Pick a PNG, JPEG, WebP or GIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That picture is over 5 MB. Pick a smaller one.");
      return;
    }
    // Straight to the cropper. Nothing is uploaded until a square comes back.
    setChosen(file);
  }

  async function upload(blob: Blob) {
    setError(null);
    setBusy(true);
    setPreview(URL.createObjectURL(blob));

    const supabase = createClient();
    /* One path per account rather than one per upload, with `upsert`. A new
       filename every time leaves every previous picture in the bucket forever,
       and nothing ever goes back to delete them.

       Always `.webp` now, because the cropper decides the format rather than
       the upload: a stable extension means the old file is genuinely replaced
       instead of a JPEG being orphaned beside its PNG replacement. */
    const path = `${userId}/avatar.webp`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/webp" });

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
    setChosen(null);
    router.refresh();
  }

  if (chosen) {
    return (
      <div className="flex flex-col gap-4">
        <AvatarCropper
          file={chosen}
          busy={busy}
          onCancel={() => {
            setChosen(null);
            setError(null);
          }}
          onCrop={(blob) => void upload(blob)}
        />
        {error && (
          <p
            role="alert"
            className="text-center text-[0.8rem] text-destructive"
          >
            {error}
          </p>
        )}
      </div>
    );
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
            /* A plain `img`, and the rule is suppressed rather than followed.
             *
             * `next/image` exists to pick a size and a format for an image
             * whose dimensions are decided by the layout. This one is 80
             * CSS pixels, square, always, and the file behind it is a 512px
             * WebP the cropper made. Routing it through the optimiser
             * would add a host to `remotePatterns`, a build-time dependency
             * on the Supabase URL, and a per-image transform that Vercel
             * bills for — to serve a thumbnail that is smaller than the
             * request headers asking for it.
             *
             * It is also the wrong shape for this component: the preview
             * below is a `blob:` URL from the file the reader just picked,
             * which the optimiser cannot fetch at all. */
            // biome-ignore lint/performance/noImgElement: fixed-size avatar, and the preview is a local blob: URL
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
            if (file) choose(file);
          }}
        />
      </div>

      <div className="min-w-0">
        <p className="text-[0.85rem] text-subtle leading-relaxed">
          PNG, JPEG, WebP or GIF, up to 5 MB. You choose the crop.
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
