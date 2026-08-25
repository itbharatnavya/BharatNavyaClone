"use client";

// components/admin/ModerationTab.tsx — content moderation for vendor blogs and
// stories. Approve / Hide / Delete. Hiding sets status "hidden", which the public
// site reads already exclude, so the content disappears from the site immediately.
// Reviews are NOT moderated — they publish immediately (see routes/reviews.js).
//
// Scoped by `product`: Directory sees Blogs+Stories authored by sellers; Recruitment
// sees Blogs only (authorType=employer) — stories are a seller-only feature today, not
// extended here. Same component/API either way; ADMIN-CONSOLE.md §3 has the story
// behind the authorType split (a real "Unknown author" bug on the Recruitment side).

import React, { useEffect, useState } from "react";
import {
  adminGetContent,
  adminModerate,
  type ModerationItem,
  type ModerationType,
  type ModerationAction,
} from "./adminApi";
import {
  SectionHeader,
  AdminTable,
  Row,
  Td,
  Pill,
  LoadingState,
  ErrorState,
  EmptyState,
  fmtDate,
} from "./ui";
import Button from "@/components/Button";
import Select from "@/components/Select";
import { useToast } from "@/components/Toast";

const DIRECTORY_TYPE_OPTIONS: { value: ModerationType; label: string }[] = [
  { value: "blog", label: "Blogs" },
  { value: "story", label: "Stories" },
];
const RECRUITMENT_TYPE_OPTIONS: { value: ModerationType; label: string }[] = [
  { value: "blog", label: "Blogs" },
];

// Public (live) statuses per type — everything else is off the site.
const PUBLIC_STATUSES = new Set(["published", "approved"]);

function statusTone(status: string): "green" | "amber" | "red" | "gray" {
  if (PUBLIC_STATUSES.has(status)) return "green";
  if (status === "hidden") return "red";
  if (status === "pending" || status === "draft") return "amber";
  return "gray";
}

export default function ModerationTab({ product = "directory" as "directory" | "recruitment" } = {}) {
  const { addToast } = useToast();
  const typeOptions = product === "recruitment" ? RECRUITMENT_TYPE_OPTIONS : DIRECTORY_TYPE_OPTIONS;
  const authorType = product === "recruitment" ? "employer" : "seller";
  const [type, setType] = useState<ModerationType>("blog");
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await adminGetContent(type, authorType));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load content");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, product]);

  async function moderate(item: ModerationItem, action: ModerationAction) {
    if (action === "delete" && !window.confirm("Delete this permanently?")) return;
    setBusyId(item.id);
    try {
      await adminModerate(type, item.id, action);
      const verb =
        action === "hide" ? "hidden" : action === "approve" ? "approved" : "deleted";
      addToast(
        `Content ${verb}`,
        action === "delete" || action === "hide" ? "info" : "success"
      );
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setBusyId(null);
    }
  }

  const typeLabel =
    typeOptions.find((t) => t.value === type)?.label.toLowerCase() || "items";

  return (
    <div>
      <SectionHeader
        title="Content"
        subtitle={
          product === "recruitment"
            ? "Approve, hide or remove employer blog posts. Hidden content is removed from the public site immediately."
            : "Approve, hide or remove seller blogs and stories. Hidden content is removed from the public site immediately."
        }
        actions={<span className="text-sm text-muted">{items.length} item(s)</span>}
      />

      <div className="mb-4 max-w-[220px]">
        <Select
          label="Content type"
          value={type}
          onChange={(e) => setType(e.target.value as ModerationType)}
          options={typeOptions}
        />
      </div>

      {loading ? (
        <LoadingState label="Loading content…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState title="Nothing here" hint={`No ${typeLabel} to moderate.`} />
      ) : (
        <AdminTable columns={["Content", "Author", "Status", "Date", "Actions"]}>
          {items.map((it) => {
            const busy = busyId === it.id;
            const isPublic = PUBLIC_STATUSES.has(it.status);
            const title = it.href ? (
              <a
                href={it.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand hover:underline"
              >
                {it.title}
              </a>
            ) : (
              <span className="font-semibold text-ink">{it.title}</span>
            );
            return (
              <Row key={it.id}>
                <Td className="max-w-[360px]">
                  <div className="truncate">{title}</div>
                  {it.target && (
                    <div className="text-xs text-faint">for {it.target}</div>
                  )}
                  {it.snippet && (
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted">
                      {it.snippet}
                    </div>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-muted">{it.author}</Td>
                <Td>
                  <Pill tone={statusTone(it.status)}>{it.status}</Pill>
                </Td>
                <Td className="whitespace-nowrap text-muted">{fmtDate(it.date)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {!isPublic && (
                      <Button
                        size="sm"
                        variant="brand"
                        disabled={busy}
                        onClick={() => moderate(it, "approve")}
                      >
                        Approve
                      </Button>
                    )}
                    {it.status !== "hidden" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => moderate(it, "hide")}
                      >
                        Hide
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() => moderate(it, "delete")}
                    >
                      Delete
                    </Button>
                  </div>
                </Td>
              </Row>
            );
          })}
        </AdminTable>
      )}
    </div>
  );
}
