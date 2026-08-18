"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "~/components/ui/button";

/**
 * Choosing which part of a photograph is the picture.
 *
 * Without this the upload was `object-fit: cover` on whatever was chosen,
 * which centre-crops — and a photograph of a person is almost never composed
 * with the face in the middle. A head sat at the top of the frame lost its
 * forehead in a 32px circle and there was nothing to be done about it except
 * go and crop the file somewhere else first.
 *
 * Drag to move, the slider to zoom. The mask is a circle because the avatar is
 * rendered as a circle everywhere, so the crop should be judged in the shape it
 * will be seen in — but what is *written* is the square that circle sits in.
 * Storing a circle would mean transparent corners, which look like a hole on
 * one background and a ring on another, and it would throw away pixels that any
 * future square rendering would want back.
 *
 * It re-encodes as well as crops, which is the part that matters for what
 * reaches the bucket: a 4 MB photograph off a phone becomes a 512px WebP of a
 * few tens of kilobytes, so the size limit is only ever a bound on what the
 * browser agrees to open.
 */

/** Edge of the square that gets written. Twice the largest place it renders. */
const OUTPUT_PX = 512;
/** Edge of the crop box on screen. */
const BOX_PX = 264;
const MAX_ZOOM = 4;

type Point = { x: number; y: number };

export function AvatarCropper({
  file,
  busy,
  onCancel,
  onCrop,
}: {
  file: File;
  busy: boolean;
  onCancel: () => void;
  /** Receives the cropped square, ready to upload. */
  onCrop: (blob: Blob) => void;
}) {
  const zoomId = useId();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const drag = useRef<{ from: Point; origin: Point } | null>(null);

  /* The object URL is revoked when the file changes or the cropper closes.
     Left alone it pins the whole photograph in memory for the life of the tab,
     which for a handful of four megabyte attempts is a real amount. */
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /* Scale at which the image exactly covers the box. Everything else is
     expressed as a multiple of it, so `zoom = 1` is always "no gaps" whatever
     shape was uploaded. */
  const base = image
    ? BOX_PX / Math.min(image.naturalWidth, image.naturalHeight)
    : 1;
  const shownW = image ? image.naturalWidth * base * zoom : 0;
  const shownH = image ? image.naturalHeight * base * zoom : 0;

  /* Clamped so the image can never be dragged far enough to show background
     inside the circle. A crop box with a corner of nothing in it is a crop box
     that produces an avatar with a corner of nothing in it. */
  const clamp = useCallback(
    (next: Point): Point => {
      const slackX = Math.max(0, (shownW - BOX_PX) / 2);
      const slackY = Math.max(0, (shownH - BOX_PX) / 2);
      return {
        x: Math.min(slackX, Math.max(-slackX, next.x)),
        y: Math.min(slackY, Math.max(-slackY, next.y)),
      };
    },
    [shownW, shownH],
  );

  // Re-clamped on zoom out, or the image keeps an offset it is no longer big
  // enough to justify and a sliver of background appears at one edge.
  useEffect(() => {
    setOffset((current) => clamp(current));
  }, [clamp]);

  function onPointerDown(event: React.PointerEvent) {
    if (!image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      from: { x: event.clientX, y: event.clientY },
      origin: offset,
    };
  }

  function onPointerMove(event: React.PointerEvent) {
    const state = drag.current;
    if (!state) return;
    setOffset(
      clamp({
        x: state.origin.x + (event.clientX - state.from.x),
        y: state.origin.y + (event.clientY - state.from.y),
      }),
    );
  }

  function endDrag() {
    drag.current = null;
  }

  function crop() {
    if (!image) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_PX;
    canvas.height = OUTPUT_PX;
    const context = canvas.getContext("2d");
    if (!context) return;

    /* Box coordinates back into source pixels. The box shows a window on to
       the scaled image, so the window's size in source pixels is its size on
       screen divided by the total scale, and its origin is however far the
       image has been pushed off centre. */
    const scale = base * zoom;
    const size = BOX_PX / scale;
    const sx = (shownW / 2 - BOX_PX / 2 - offset.x) / scale;
    const sy = (shownH / 2 - BOX_PX / 2 - offset.y) / scale;

    context.imageSmoothingQuality = "high";
    context.drawImage(image, sx, sy, size, size, 0, 0, OUTPUT_PX, OUTPUT_PX);
    canvas.toBlob(
      (blob) => {
        if (blob) onCrop(blob);
      },
      // WebP at every size that matters here, and every browser that can run
      // this app reads it. A PNG of a photograph is roughly ten times larger.
      "image/webp",
      0.9,
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Dragging is a pointer-only refinement and needs no suppression: the
          crop is fully reachable without it, because the zoom slider is a real
          range input and the default framing already covers the box. */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ width: BOX_PX, height: BOX_PX }}
        className="relative cursor-grab touch-none overflow-hidden rounded-full bg-muted active:cursor-grabbing"
      >
        {image && (
          // biome-ignore lint/performance/noImgElement: a local object URL being positioned by transform; see avatar-picker.tsx
          <img
            src={image.src}
            alt=""
            draggable={false}
            style={{
              width: shownW,
              height: shownH,
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
              left: (BOX_PX - shownW) / 2,
              top: (BOX_PX - shownH) / 2,
            }}
            className="absolute max-w-none select-none"
          />
        )}
        {/* The ring sits over the picture rather than around the box, so the
            edge being judged is the edge that will exist. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-[rgba(28,25,23,0.18)] ring-inset"
        />
      </div>

      <div className="flex w-full max-w-[264px] flex-col gap-1.5">
        <label
          htmlFor={zoomId}
          className="font-mono text-[0.6rem] text-subtle uppercase tracking-[0.14em]"
        >
          Zoom
        </label>
        <input
          id={zoomId}
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="w-full accent-[color:var(--accent-solid)]"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" onClick={crop} disabled={!image || busy}>
          {busy ? "Saving…" : "Use photo"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
