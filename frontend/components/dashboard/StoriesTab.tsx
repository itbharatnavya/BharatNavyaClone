"use client";

import React, { useEffect, useState } from "react";
import type { User, Story } from "@/lib/types";
import { getStories, postStory, highlightStory } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import { PanelHeader, EmptyState, Loading, Icon, timeAgo, useTr } from "./shared";

interface Props {
  user: User;
}

export default function StoriesTab({ user }: Props) {
  const tr = useTr();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<Story[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // form
  const [url, setUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [linkListingId, setLinkListingId] = useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const groups = await getStories();
      const mine = groups.find((g) => g.sellerId === user.id);
      setStories(mine?.stories || []);
    } catch (e) {
      addToast((e as Error).message || "Failed to load stories", "error");
    } finally {
      setLoading(false);
    }
  }, [user.id, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const created = await postStory({
        media: { type: mediaType, url: url.trim() },
        caption: caption.trim() || undefined,
        linkListingId: linkListingId.trim() || undefined,
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

  async function pin(s: Story) {
    try {
      await highlightStory(s.id);
      addToast(tr("dashboard.stories.highlighted", "Pinned to Highlights"), "success");
    } catch (e) {
      addToast((e as Error).message || "Could not highlight", "error");
    }
  }

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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 14,
          }}
        >
          {stories.map((s) => (
            <div key={s.id} className="card card-flat" style={{ overflow: "hidden", padding: 0 }}>
              <div style={{ position: "relative", aspectRatio: "9 / 14", background: "var(--bg-subtle)" }}>
                {s.media?.type === "video" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={s.media.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.media?.url} alt={s.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "rgba(15,23,42,.7)",
                    color: "#fff",
                    fontSize: 11,
                    borderRadius: 999,
                    padding: "2px 8px",
                  }}
                >
                  {s.views ?? 0} views
                </div>
              </div>
              <div style={{ padding: 10 }}>
                {s.caption && (
                  <div className="line-clamp-2" style={{ fontSize: 13, color: "var(--ink)" }}>
                    {s.caption}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 4 }}>
                  {timeAgo(s.createdAt)}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  block
                  leftIcon={<Icon name="pin" size={14} />}
                  onClick={() => pin(s)}
                  className="mt-2"
                >
                  {tr("dashboard.stories.highlight", "Highlight")}
                </Button>
              </div>
            </div>
          ))}
        </div>
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
          <Input
            label={tr("dashboard.stories.mediaUrl", "Media URL")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
          <Select
            label={tr("dashboard.stories.mediaType", "Media type")}
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value as "image" | "video")}
            options={[
              { value: "image", label: "Image" },
              { value: "video", label: "Video" },
            ]}
          />
          <Textarea
            label={tr("dashboard.stories.caption", "Caption")}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
          />
          <Input
            label={tr("dashboard.stories.linkListing", "Link a listing (optional)")}
            value={linkListingId}
            onChange={(e) => setLinkListingId(e.target.value)}
            hint={tr("dashboard.stories.linkHint", "Listing ID to promote with this story.")}
          />
        </div>
      </Modal>
    </div>
  );
}
