"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { User, Story, StoryGroup } from "@/lib/types";
import { getStories, getHighlights, postStory, highlightStory, deleteStory } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import StoryViewer from "@/components/StoryViewer";
import { PanelHeader, EmptyState, Loading, Icon, timeAgo, useTr } from "./shared";

interface Props {
  user: User;
  // Which dashboard this is mounted in — Directory (default) or Recruitment. Scopes
  // the story list to that product's own posts; a user can hold both a sellerProfile
  // and an employerProfile, and their content must stay separated between the two
  // dashboards (see backend/routes/stories.js's authorType field).
  product?: "directory" | "recruitment";
}

// Page size per section — a seller's highlights never expire, so that list is the
// one most likely to grow past what's comfortable in a single grid (see PAGE_SIZE
// usage below). Active stories self-limit to whatever was posted in the last 24h,
// but get the same treatment for consistency.
const PAGE_SIZE = 12;
// Below this many stories total, the search box just adds noise — hide it.
const SEARCH_THRESHOLD = 8;

// Local because shared.tsx's icon set is a shared contract; matches Icon's render
// conventions (viewBox 0 0 24 24, stroke).
function EyeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

// Reveals more of a section as the user scrolls near its end, instead of making
// them hunt for and click a "Show more" button — the sentinel div sits just past
// the last visible card and pulls in the next batch once it nears the viewport.
function useInfiniteReveal(hasMore: boolean, revealMore: () => void) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) revealMore();
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, revealMore]);
  return sentinelRef;
}

function sortByNewest(list: Story[]): Story[] {
  return list.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

interface StoryCardProps {
  story: Story;
  tr: (key: string, fallback: string) => string;
  onPreview: () => void;
  onToggleHighlight: () => void;
  onDelete: () => void;
}

function StoryCard({ story: s, tr, onPreview, onToggleHighlight, onDelete }: StoryCardProps) {
  return (
    <div className="card card-flat" style={{ overflow: "hidden", padding: 0 }}>
      <button
        type="button"
        className="story-card bs-story-thumb"
        onClick={onPreview}
        aria-label={tr("dashboard.stories.previewAria", "Preview story")}
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          aspectRatio: "9 / 14",
          background: "var(--bg-subtle)",
          border: "none",
          padding: 0,
          margin: 0,
          cursor: "pointer",
        }}
      >
        {s.media?.type === "video" ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={s.media.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.media?.url} alt={s.caption || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}

        {/* hover-only "expand to preview" affordance — see .bs-story-thumb rule in StoriesTab */}
        <span
          className="bs-story-thumb-hint"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            background: "rgba(15,23,42,.4)",
            opacity: 0,
            transition: "opacity 160ms ease",
          }}
        >
          <EyeIcon size={22} />
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{tr("dashboard.stories.preview", "Preview")}</span>
        </span>

        <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(15,23,42,.7)", color: "#fff", fontSize: 12, borderRadius: 999, padding: "2px 8px" }}>
          {s.views ?? 0} views
        </div>
        {s.isHighlight && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "var(--brand)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 999,
              padding: "2px 8px",
            }}
          >
            <Icon name="pin" size={11} />
            {tr("dashboard.stories.highlightedBadge", "Highlighted")}
          </div>
        )}
      </button>

      <div style={{ padding: 10 }}>
        {s.caption && (
          <div className="line-clamp-2" style={{ fontSize: 13, color: "var(--ink)", minHeight: 34 }}>
            {s.caption}
          </div>
        )}
        <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 4 }}>{timeAgo(s.createdAt)}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <Button size="sm" variant={s.isHighlight ? "ghost" : "secondary"} leftIcon={<Icon name="pin" size={14} />} onClick={onToggleHighlight} style={{ flex: 1, minWidth: 0 }}>
            {s.isHighlight ? tr("dashboard.stories.removeHighlight", "Remove") : tr("dashboard.stories.highlight", "Highlight")}
          </Button>
          <Button
            size="sm"
            variant="danger"
            aria-label={tr("dashboard.stories.deleteAria", "Delete story")}
            title={tr("dashboard.stories.deleteAria", "Delete story")}
            onClick={onDelete}
            style={{ flexShrink: 0, paddingLeft: 10, paddingRight: 10 }}
          >
            <Icon name="trash" size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function StoriesTab({ user, product = "directory" }: Props) {
  const tr = useTr();
  const { addToast } = useToast();
  const authorType = product === "recruitment" ? "employer" : "seller";
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<Story[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewList, setPreviewList] = useState<Story[] | null>(null);
  const [previewAt, setPreviewAt] = useState(0);
  const [deleting, setDeleting] = useState<Story | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [visibleHighlighted, setVisibleHighlighted] = useState(PAGE_SIZE);
  const [visibleActive, setVisibleActive] = useState(PAGE_SIZE);

  // form
  const [url, setUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [linkListingId, setLinkListingId] = useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      // GET /api/stories only returns stories still inside their 24h window (an
      // expired highlight drops out of it — see backend/routes/stories.js). The
      // seller still needs to see/unpin/delete their own highlights after they
      // expire, so merge in GET /highlights, which never applies the expiry filter.
      const [groups, highlights] = await Promise.all([getStories(authorType), getHighlights(user.id, authorType)]);
      const mine = groups.find((g) => g.sellerId === user.id);
      const byId = new Map<string, Story>((mine?.stories || []).map((s) => [s.id, s]));
      for (const h of highlights) byId.set(h.id, h);
      setStories(Array.from(byId.values()));
    } catch (e) {
      addToast((e as Error).message || "Failed to load stories", "error");
    } finally {
      setLoading(false);
    }
  }, [user.id, authorType, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  // A new search resets how much of each (now-shorter) result set is revealed.
  useEffect(() => {
    setVisibleHighlighted(PAGE_SIZE);
    setVisibleActive(PAGE_SIZE);
  }, [search]);

  async function submit() {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const created = await postStory({
        media: { type: mediaType, url: url.trim() },
        caption: caption.trim() || undefined,
        linkListingId: linkListingId.trim() || undefined,
        authorType,
      });
      setStories((prev) => [created, ...prev]);
      addToast(tr("dashboard.stories.posted", "Story posted"), "success");
      setOpen(false);
      setUrl("");
      setCaption("");
      setLinkListingId("");
      setMediaType("image");
    } catch (e) {
      addToast((e as Error).message || "Could not post story", "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleHighlight(s: Story) {
    const next = !s.isHighlight;
    try {
      const updated = await highlightStory(s.id, next);
      setStories((prev) => prev.map((story) => (story.id === s.id ? updated : story)));
      addToast(
        next ? tr("dashboard.stories.highlighted", "Pinned to Highlights") : tr("dashboard.stories.unhighlighted", "Removed from Highlights"),
        "success"
      );
    } catch (e) {
      addToast((e as Error).message || "Could not update highlight", "error");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteStory(deleting.id);
      setStories((prev) => prev.filter((s) => s.id !== deleting.id));
      addToast(tr("dashboard.stories.deleted", "Story deleted"), "success");
      setDeleting(null);
    } catch (e) {
      addToast((e as Error).message || "Delete failed", "error");
    } finally {
      setDeleteBusy(false);
    }
  }

  function openPreview(list: Story[], story: Story) {
    setPreviewList(list);
    setPreviewAt(Math.max(0, list.findIndex((x) => x.id === story.id)));
  }

  const trimmedSearch = search.trim().toLowerCase();
  const filtered = trimmedSearch ? stories.filter((s) => (s.caption || "").toLowerCase().includes(trimmedSearch)) : stories;
  const highlighted = sortByNewest(filtered.filter((s) => s.isHighlight));
  const active = sortByNewest(filtered.filter((s) => !s.isHighlight));
  const allByNewest = sortByNewest(stories); // preview swipes through everything, unaffected by search

  const hasMoreHighlighted = highlighted.length > visibleHighlighted;
  const hasMoreActive = active.length > visibleActive;
  const revealMoreHighlighted = useCallback(
    () => setVisibleHighlighted((n) => Math.min(n + PAGE_SIZE, highlighted.length)),
    [highlighted.length]
  );
  const revealMoreActive = useCallback(() => setVisibleActive((n) => Math.min(n + PAGE_SIZE, active.length)), [active.length]);
  const highlightedSentinelRef = useInfiniteReveal(hasMoreHighlighted, revealMoreHighlighted);
  const activeSentinelRef = useInfiniteReveal(hasMoreActive, revealMoreActive);

  const previewGroup: StoryGroup | null = previewList
    ? {
        sellerId: user.id,
        sellerName: user.name,
        sellerSlug: product === "recruitment" ? undefined : user.sellerProfile?.slug,
        avatarUrl: user.avatarUrl,
        isVerified: product === "recruitment" ? user.employerProfile?.isVerified : user.sellerProfile?.isVerified,
        stories: previewList,
      }
    : null;

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.stories.title", "Stories")}
        subtitle={tr("dashboard.stories.subtitle", "Share 24-hour updates. Pin the best to your profile Highlights.")}
        actions={
          <Button variant="primary" onClick={() => setOpen(true)} leftIcon={<Icon name="plus" size={16} />}>
            {tr("dashboard.stories.post", "Post story")}
          </Button>
        }
      />

      {loading ? (
        <Loading />
      ) : stories.length === 0 ? (
        <EmptyState
          icon={<Icon name="stories" size={22} />}
          title={tr("dashboard.stories.empty", "No active stories")}
          subtitle={tr("dashboard.stories.emptyHint", "Stories disappear after 24 hours — post one to stay visible.")}
          action={
            <Button variant="primary" onClick={() => setOpen(true)} leftIcon={<Icon name="plus" size={16} />}>
              {tr("dashboard.stories.post", "Post story")}
            </Button>
          }
        />
      ) : (
        <>
          {stories.length > SEARCH_THRESHOLD && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                {tr("dashboard.stories.count", `${stories.length} stories · ${stories.filter((s) => s.isHighlight).length} highlighted`)}
              </div>
              <div style={{ marginLeft: "auto", width: "100%", maxWidth: 280 }}>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tr("dashboard.stories.searchPlaceholder", "Search captions…")}
                  leftIcon={<SearchIcon />}
                  aria-label={tr("dashboard.stories.searchPlaceholder", "Search captions…")}
                  style={{ paddingLeft: 38 }}
                />
              </div>
            </div>
          )}

          {highlighted.length === 0 && active.length === 0 ? (
            <div className="card card-flat" style={{ textAlign: "center", padding: 28, color: "var(--muted)", fontSize: 14 }}>
              {tr("dashboard.stories.noMatches", "No stories match your search.")}{" "}
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{ color: "var(--brand)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
              >
                {tr("dashboard.stories.clearSearch", "Clear search")}
              </button>
            </div>
          ) : (
            <>
              {highlighted.length > 0 && (
                <section style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{tr("dashboard.stories.highlightedSection", "Highlighted")}</h3>
                    <span style={{ fontSize: 13, color: "var(--faint)" }}>({highlighted.length})</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
                    {highlighted.slice(0, visibleHighlighted).map((s) => (
                      <StoryCard
                        key={s.id}
                        story={s}
                        tr={tr}
                        onPreview={() => openPreview(allByNewest, s)}
                        onToggleHighlight={() => toggleHighlight(s)}
                        onDelete={() => setDeleting(s)}
                      />
                    ))}
                  </div>
                  {hasMoreHighlighted && (
                    <div ref={highlightedSentinelRef} style={{ textAlign: "center", padding: "18px 0 4px", fontSize: 12, color: "var(--faint)" }}>
                      {tr("dashboard.stories.scrollForMore", `Scroll for more (${highlighted.length - visibleHighlighted} left)`)}
                    </div>
                  )}
                </section>
              )}

              {active.length > 0 && (
                <section>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{tr("dashboard.stories.activeSection", "Active")}</h3>
                    <span style={{ fontSize: 13, color: "var(--faint)" }}>({active.length})</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
                    {active.slice(0, visibleActive).map((s) => (
                      <StoryCard
                        key={s.id}
                        story={s}
                        tr={tr}
                        onPreview={() => openPreview(allByNewest, s)}
                        onToggleHighlight={() => toggleHighlight(s)}
                        onDelete={() => setDeleting(s)}
                      />
                    ))}
                  </div>
                  {hasMoreActive && (
                    <div ref={activeSentinelRef} style={{ textAlign: "center", padding: "18px 0 4px", fontSize: 12, color: "var(--faint)" }}>
                      {tr("dashboard.stories.scrollForMore", `Scroll for more (${active.length - visibleActive} left)`)}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </>
      )}

      {/* hover reveal for the preview hint — plain <style> tag, same pattern as shared.tsx's Loading spinner */}
      <style>{`.bs-story-thumb:hover .bs-story-thumb-hint{opacity:1}`}</style>

      {previewGroup && (
        <StoryViewer groups={[previewGroup]} startIndex={0} startStoryIndex={previewAt} onClose={() => setPreviewList(null)} />
      )}

      <Modal
        open={open}
        onClose={() => (busy ? undefined : setOpen(false))}
        title={tr("dashboard.stories.postTitle", "Post a story")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              {tr("common.cancel", "Cancel")}
            </Button>
            <Button variant="primary" onClick={submit} disabled={busy || !url.trim()}>
              {busy ? tr("common.posting", "Posting…") : tr("dashboard.stories.post", "Post story")}
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label={tr("dashboard.stories.mediaUrl", "Media URL")} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          <Select
            label={tr("dashboard.stories.mediaType", "Media type")}
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value as "image" | "video")}
            options={[
              { value: "image", label: "Image" },
              { value: "video", label: "Video" },
            ]}
          />
          <Textarea label={tr("dashboard.stories.caption", "Caption")} value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} />
          <Input
            label={tr("dashboard.stories.linkListing", "Link a listing (optional)")}
            value={linkListingId}
            onChange={(e) => setLinkListingId(e.target.value)}
            hint={tr("dashboard.stories.linkHint", "Listing ID to promote with this story.")}
          />
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleting}
        onClose={() => (deleteBusy ? undefined : setDeleting(null))}
        size="sm"
        title={tr("dashboard.stories.deleteTitle", "Delete story?")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              {tr("common.cancel", "Cancel")}
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleteBusy}>
              {deleteBusy ? tr("common.deleting", "Deleting…") : tr("common.delete", "Delete")}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: "var(--muted)" }}>
          {tr("dashboard.stories.deleteConfirm", "This story will be permanently deleted and removed from your profile.")}
        </p>
      </Modal>
    </div>
  );
}
