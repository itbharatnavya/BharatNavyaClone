"use client";

import React, { useEffect, useState } from "react";
import type { MediaItem } from "@/lib/types";
import ImageViewer from "@/components/ImageViewer";

export interface GalleryProps {
  media?: MediaItem[];
  title: string;
}

/**
 * Listing image gallery — large active frame + thumbnail strip.
 * Falls back to a clean placeholder when the listing has no media.
 */
export default function Gallery({ media, title }: GalleryProps) {
  const items = (media || []).filter((m) => m && m.url);
  const [active, setActive] = useState(0);
  const [viewer, setViewer] = useState(false);
  const photos = items.filter((m) => m.type !== "video").map((m) => ({ src: m.url, alt: m.alt || title }));

  useEffect(() => {
    setActive(0);
  }, [title]);

  const current = items[active] || items[0] || null;
  // Render one thumbnail per real image only (no empty placeholder slots).
  const thumbCount = items.length;

  return (
    <div style={{ minWidth: 0 }}>
      <div
        className="card card-flat"
        style={{
          aspectRatio: "4 / 3",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-subtle)",
          padding: 0,
        }}
      >
        {current ? (
          current.type === "video" ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={current.url}
              controls
              style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <button type="button" className="gl-zoom" onClick={() => setViewer(true)} aria-label="Open photo viewer">
              <img
                src={current.url}
                alt={current.alt || title}
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <span className="gl-zoom-hint" aria-hidden><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2M11 8.5v5M8.5 11h5" /></svg>Click to zoom</span>
            </button>
          )
        ) : (
          <span style={{ color: "var(--faint)", fontSize: "var(--fs-sm)" }}>No image available</span>
        )}
      </div>

      {items.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 10,
            marginTop: 12,
          }}
        >
          {Array.from({ length: thumbCount }).slice(0, 8).map((_, i) => {
            const img = items[i];
            const selected = i === active;
            return (
              <button
                key={i}
                type="button"
                onClick={() => img && setActive(i)}
                aria-label={`View media ${i + 1}`}
                style={{
                  aspectRatio: "1 / 1",
                  background: "var(--bg-subtle)",
                  border: selected ? "2px solid var(--brand)" : "1px solid var(--border)",
                  borderRadius: "var(--r-sm)",
                  padding: 0,
                  overflow: "hidden",
                  cursor: img ? "pointer" : "default",
                  transition: "border-color 150ms ease",
                }}
              >
                {img && (
                  img.type === "video" ? (
                    <span
                      style={{
                        display: "flex",
                        width: "100%",
                        height: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--faint)",
                        fontSize: "var(--fs-lg)",
                      }}
                    >
                      ▶
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.url}
                      alt={img.alt || `${title} ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )
                )}
              </button>
            );
          })}
        </div>
      )}
      {viewer && photos.length > 0 && <ImageViewer images={photos} start={Math.max(0, photos.findIndex((p) => p.src === current?.url))} title={title} onClose={() => setViewer(false)} />}
    </div>
  );
}
