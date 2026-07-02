"use client";

import { useEffect, useState } from "react";

const ANIMATION_URL =
  "https://c4cizlb2akfcloys.public.blob.vercel-storage.com/Western%20Duel%20Animated.html";

// The blob is served with Content-Disposition: attachment, so pointing an
// <iframe src> straight at it triggers a download instead of rendering.
// Fetching it (not navigating) sidesteps that, then we inject it via srcDoc.
export function DuelAnimation() {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(ANIMATION_URL)
      .then((res) => res.text())
      .then((text) => {
        if (!cancelled) setHtml(text);
      })
      .catch(() => {
        // ignore — animation is decorative
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!html) return null;

  return (
    <iframe
      srcDoc={html}
      title="Western duel animation"
      sandbox="allow-scripts"
      className="mx-auto h-56 w-full max-w-2xl border-0"
      style={{
        maskImage: "radial-gradient(ellipse 65% 75% at center, black 45%, transparent 95%)",
        WebkitMaskImage: "radial-gradient(ellipse 65% 75% at center, black 45%, transparent 95%)",
      }}
    />
  );
}
