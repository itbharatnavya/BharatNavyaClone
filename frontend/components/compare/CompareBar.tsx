"use client";

// Floating COMPARE tray — a fixed bottom bar that appears whenever the buyer has
// selected products to compare. Shows a thumbnail per selection (with a remove X),
// a "Compare (N)" button → /compare, and "Clear". Hidden when empty. It sits at
// the bottom full-width; on small screens the action cluster reserves room on the
// right so it never hides behind the chat bubble.

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCompare } from "@/lib/compare";
import { getListing } from "@/lib/api";
import type { Listing } from "@/lib/types";

function imageOf(l: Listing): string | undefined {
  return l.media?.find((m) => m.type !== "video")?.url || l.media?.[0]?.url;
}

function XIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="7" height="16" rx="1.4" />
      <rect x="14" y="4" width="7" height="16" rx="1.4" />
    </svg>
  );
}

export default function CompareBar() {
  const { ids, remove, clear } = useCompare();
  const router = useRouter();
  const [items, setItems] = useState<Record<string, Listing>>({});

  // Fetch a thumbnail/title for any newly-added id (cached so we never refetch).
  useEffect(() => {
    let alive = true;
    const missing = ids.filter((id) => !items[id]);
    if (missing.length === 0) return;
    Promise.all(
      missing.map((id) =>
        getListing(id)
          .then((l) => [id, l] as const)
          .catch(() => null)
      )
    ).then((pairs) => {
      if (!alive) return;
      setItems((prev) => {
        const next = { ...prev };
        for (const p of pairs) if (p) next[p[0]] = p[1];
        return next;
      });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  if (ids.length === 0) return null;

  return (
    <div className="cbar" role="region" aria-label="Compare tray">
      <div className="cbar-inner container-bs">
        <div className="cbar-label">
          <span className="cbar-title">Compare</span>
          <span className="cbar-count">{ids.length} selected</span>
        </div>

        <div className="cbar-thumbs">
          {ids.map((id) => {
            const l = items[id];
            const img = l ? imageOf(l) : undefined;
            return (
              <div key={id} className="cbar-thumb" title={l?.title || "Product"}>
                <div
                  className="cbar-thumb-img"
                  style={{
                    backgroundImage: img ? `url(${img})` : undefined,
                    background: img ? undefined : "var(--bg-subtle)",
                  }}
                  aria-hidden
                />
                <button
                  type="button"
                  className="cbar-thumb-x"
                  onClick={() => remove(id)}
                  aria-label={`Remove ${l?.title || "product"} from compare`}
                >
                  <XIcon />
                </button>
              </div>
            );
          })}
        </div>

        <div className="cbar-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
            Clear
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => router.push("/compare")}
          >
            <CompareIcon />
            Compare ({ids.length})
          </button>
        </div>
      </div>

      <style jsx>{`
        .cbar {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 100;
          background: var(--canvas);
          border-top: 1px solid var(--border);
          box-shadow: 0 -6px 20px rgba(16, 24, 40, 0.1);
        }
        .cbar-inner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding-top: 10px;
          padding-bottom: 10px;
          min-width: 0;
        }
        .cbar-label {
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          line-height: 1.2;
        }
        .cbar-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--ink);
        }
        .cbar-count {
          font-size: 12px;
          color: var(--faint);
        }
        .cbar-thumbs {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
          overflow-x: auto;
          padding: 2px 0;
        }
        .cbar-thumb {
          position: relative;
          flex-shrink: 0;
        }
        .cbar-thumb-img {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background-size: cover;
          background-position: center;
        }
        .cbar-thumb-x {
          position: absolute;
          top: -7px;
          right: -7px;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--canvas);
          color: var(--muted);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.12);
        }
        .cbar-thumb-x:hover {
          color: var(--ink);
          border-color: var(--border-strong);
        }
        .cbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        /* Keep the buttons clear of the floating chat bubble on small screens. */
        @media (max-width: 1024px) {
          .cbar-inner {
            padding-right: 80px;
          }
        }
        @media (max-width: 560px) {
          .cbar-label {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
