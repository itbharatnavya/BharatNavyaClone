"use client";

import React, { useEffect, useState } from "react";
import type { User, Blog, BlogStatus } from "@/lib/types";
import { getBlogs, createBlog, updateBlog, deleteBlog } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Textarea from "@/components/Textarea";
import Select from "@/components/Select";
import { PanelHeader, EmptyState, Loading, Icon, formatDate, useTr } from "./shared";

interface Props {
  user: User;
}

interface DraftState {
  id?: string;
  title: string;
  excerpt: string;
  body: string;
  tags: string;
  coverImage: string;
  status: BlogStatus;
}

const EMPTY: DraftState = {
  title: "",
  excerpt: "",
  body: "",
  tags: "",
  coverImage: "",
  status: "draft",
};

export default function BlogsTab({ user }: Props) {
  const tr = useTr();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [deleting, setDeleting] = useState<Blog | null>(null);
  const [busy, setBusy] = useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await getBlogs({ sellerId: user.id });
      setBlogs(list);
    } catch (e) {
      addToast((e as Error).message || "Failed to load blogs", "error");
    } finally {
      setLoading(false);
    }
  }, [user.id, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  function openNew() {
    setDraft({ ...EMPTY });
  }
  function openEdit(b: Blog) {
    setDraft({
      id: b.id,
      title: b.title,
      excerpt: b.excerpt || "",
      body: b.body || "",
      tags: (b.tags || []).join(", "),
      coverImage: b.coverImage || "",
      status: b.status,
    });
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const body: Partial<Blog> = {
        title: draft.title.trim(),
        excerpt: draft.excerpt.trim() || undefined,
        body: draft.body,
        coverImage: draft.coverImage.trim() || undefined,
        status: draft.status,
        tags: draft.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (draft.id) {
        const updated = await updateBlog(draft.id, body);
        setBlogs((prev) => prev.map((b) => (b.id === draft.id ? { ...b, ...updated } : b)));
        addToast(tr("dashboard.blogs.updated", "Blog updated"), "success");
      } else {
        const created = await createBlog(body);
        setBlogs((prev) => [created, ...prev]);
        addToast(tr("dashboard.blogs.created", "Blog created"), "success");
      }
      setDraft(null);
    } catch (e) {
      addToast((e as Error).message || "Save failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteBlog(deleting.id);
      setBlogs((prev) => prev.filter((b) => b.id !== deleting.id));
      addToast(tr("dashboard.blogs.deleted", "Blog deleted"), "success");
      setDeleting(null);
    } catch (e) {
      addToast((e as Error).message || "Delete failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.blogs.title", "My blogs")}
        subtitle={tr("dashboard.blogs.subtitle", "Publish articles to build authority and pull in buyers.")}
        actions={
          <Button variant="primary" onClick={openNew} leftIcon={<Icon name="plus" size={16} />}>
            {tr("dashboard.blogs.new", "New post")}
          </Button>
        }
      />

      {loading ? (
        <Loading />
      ) : blogs.length === 0 ? (
        <EmptyState
          icon={<Icon name="blogs" size={22} />}
          title={tr("dashboard.blogs.empty", "No blog posts yet")}
          subtitle={tr("dashboard.blogs.emptyHint", "Write your first article — supports Markdown.")}
          action={
            <Button variant="primary" onClick={openNew} leftIcon={<Icon name="plus" size={16} />}>
              {tr("dashboard.blogs.write", "Write a post")}
            </Button>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {blogs.map((b) => (
            <div
              key={b.id}
              className="card card-flat"
              style={{ padding: 16, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}
            >
              <div style={{ minWidth: 200, flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 15 }}>{b.title}</span>
                  <Badge variant={b.status === "published" ? "new" : "neutral"}>{b.status}</Badge>
                </div>
                <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 4 }}>
                  {b.publishedAt ? formatDate(b.publishedAt) : formatDate(b.createdAt)}
                  {typeof b.views === "number" ? ` · ${b.views} views` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Button size="sm" variant="secondary" leftIcon={<Icon name="edit" size={14} />} onClick={() => openEdit(b)}>
                  {tr("common.edit", "Edit")}
                </Button>
                <Button size="sm" variant="danger" leftIcon={<Icon name="trash" size={14} />} onClick={() => setDeleting(b)}>
                  {tr("common.delete", "Delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor modal */}
      <Modal
        open={!!draft}
        onClose={() => (busy ? undefined : setDraft(null))}
        size="lg"
        title={draft?.id ? tr("dashboard.blogs.editTitle", "Edit post") : tr("dashboard.blogs.newTitle", "New post")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
              {tr("common.cancel", "Cancel")}
            </Button>
            <Button variant="primary" onClick={save} disabled={busy || !draft?.title.trim()}>
              {busy ? tr("common.saving", "Saving…") : tr("common.save", "Save")}
            </Button>
          </>
        }
      >
        {draft && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input
              label={tr("dashboard.blogs.fieldTitle", "Title")}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <Input
              label={tr("dashboard.blogs.fieldExcerpt", "Excerpt")}
              value={draft.excerpt}
              onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
              hint={tr("dashboard.blogs.excerptHint", "Short summary shown in listings.")}
            />
            <Textarea
              label={tr("dashboard.blogs.fieldBody", "Body (Markdown)")}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={12}
              placeholder={"# Heading\n\nWrite your article in **Markdown**…"}
              style={{ fontFamily: "var(--font-mono, monospace)", minHeight: 220 }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Input
                label={tr("dashboard.blogs.fieldTags", "Tags")}
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                hint={tr("dashboard.blogs.tagsHint", "Comma separated")}
              />
              <Select
                label={tr("dashboard.blogs.fieldStatus", "Status")}
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as BlogStatus })}
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "published", label: "Published" },
                ]}
              />
            </div>
            <Input
              label={tr("dashboard.blogs.fieldCover", "Cover image URL")}
              value={draft.coverImage}
              onChange={(e) => setDraft({ ...draft, coverImage: e.target.value })}
              placeholder="https://…"
            />
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleting}
        onClose={() => (busy ? undefined : setDeleting(null))}
        size="sm"
        title={tr("dashboard.blogs.deleteTitle", "Delete post?")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={busy}>
              {tr("common.cancel", "Cancel")}
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={busy}>
              {busy ? tr("common.deleting", "Deleting…") : tr("common.delete", "Delete")}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: "var(--muted)" }}>
          {tr("dashboard.blogs.deleteConfirm", `"${deleting?.title || ""}" will be permanently deleted.`)}
        </p>
      </Modal>
    </div>
  );
}
