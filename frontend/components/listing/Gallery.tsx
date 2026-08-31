"use client";

import React, { useEffect, useState } from "react";
import type { MediaItem } from "@/lib/types";

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
            <img
              src={current.url}
              alt={current.alt || title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )
        ) : (
          <span style={{ color: "var(--faint)", fontSize: 14 }}>No image available</span>
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
                  borderRadius: 10,
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
                        fontSize: 18,
                      }}
                    >
                      ▶
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.url}
                      alt={img.alt || `${title} ${i + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
