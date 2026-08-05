"use client";

// components/admin/CollectionsTab.tsx — curate "Concepts" (merchandising collections).
//
// A collection groups listings the admin picks by hand (listingIds) and/or auto-fills
// by category (categorySlugs) or brand (brandSlugs). This tab lists collections and
// offers a create/edit form: title, subtitle, cover (ImageUpload), a searchable listing
// multi-picker, native multi-selects for categories + brands, status and order.
// Matches CategoriesTab styling. No emojis (inline SVG only).

import React, { useEffect, useMemo, useState } from "react";
import type { Category, Listing } from "@/lib/types";
import type { Brand, Collection } from "@/lib/api";
import { getCategories, getBrands, getListings } from "@/lib/api";
import {
  adminGetCollections,
  adminCreateCollection,
  adminUpdateCollection,
  adminDeleteCollection,
  type CollectionInput,
} from "./adminApi";
import {
  SectionHeader,
  Pill,
  LoadingState,
  ErrorState,
  EmptyState,
  AdminTable,
  Row,
  Td,
} from "./ui";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import ImageUpload from "@/components/ImageUpload";
import { useToast } from "@/components/Toast";

type ModalMode = { kind: "create" } | { kind: "edit"; collection: Collection } | null;

interface FormState {
  title: string;
  subtitle: string;
  coverImage: string | null;
  listingIds: string[];
  categorySlugs: string[];
  brandSlugs: string[];
  status: "draft" | "published";
  order: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  subtitle: "",
  coverImage: null,
  listingIds: [],
  categorySlugs: [],
  brandSlugs: [],
  status: "draft",
  order: "0",
};

/** Read selected values out of a native multi-select change event. */
function multiValues(e: React.ChangeEvent<HTMLSelectElement>): string[] {
  return Array.from(e.target.selectedOptions).map((o) => o.value);
}

function listingImage(l: Listing): string | undefined {
  return l.media?.find((m) => m.type !== "video")?.url || l.media?.[0]?.url;
}
function listingSeller(l: Listing): string {
  return l.seller?.companyName || l.seller?.name || l.sellerName || "Seller";
}

export default function CollectionsTab() {
  const { addToast } = useToast();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Option sources for the form.
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingSearch, setListingSearch] = useState("");

  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Collection | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setCollections(await adminGetCollections());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load collections");
    } finally {
      setLoading(false);
    }
  }

  async function loadOptions() {
    try {
      const [cats, brs, listResp] = await Promise.all([
        getCategories(),
        getBrands(),
        getListings({ limit: 200 }),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setBrands(Array.isArray(brs) ? brs : []);
      setListings(listResp?.listings || []);
    } catch {
      // Non-fatal: the list still works; the form just has fewer options.
      setCategories([]);
      setBrands([]);
      setListings([]);
    }
  }

  useEffect(() => {
    void load();
    void loadOptions();
  }, []);

  const catOptions = useMemo(
    () =>
      categories
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.slug, label: `${c.name} · /${c.slug}` })),
    [categories]
  );

  const filteredListings = useMemo(() => {
    const q = listingSearch.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        listingSeller(l).toLowerCase().includes(q)
    );
  }, [listings, listingSearch]);

  function openCreate() {
    setForm({ ...EMPTY_FORM, order: String(collections.length) });
    setListingSearch("");
    setModal({ kind: "create" });
  }
  function openEdit(c: Collection) {
    setForm({
      title: c.title,
      subtitle: c.subtitle || "",
      coverImage: c.coverImage || null,
      listingIds: c.listingIds || [],
      categorySlugs: c.categorySlugs || [],
      brandSlugs: c.brandSlugs || [],
      status: c.status === "published" ? "published" : "draft",
      order: String(c.order ?? 0),
    });
    setListingSearch("");
    setModal({ kind: "edit", collection: c });
  }

  function toggleListing(id: string) {
    setForm((f) => ({
      ...f,
      listingIds: f.listingIds.includes(id)
        ? f.listingIds.filter((x) => x !== id)
        : [...f.listingIds, id],
    }));
  }

  async function save() {
    if (!modal) return;
    const title = form.title.trim();
    if (!title) return;
    setSaving(true);
    const body: CollectionInput = {
      title,
      subtitle: form.subtitle.trim(),
      coverImage: form.coverImage,
      listingIds: form.listingIds,
      categorySlugs: form.categorySlugs,
      brandSlugs: form.brandSlugs,
      status: form.status,
      order: Number(form.order) || 0,
    };
    try {
      if (modal.kind === "create") {
        await adminCreateCollection(body);
        addToast("Collection created", "success");
      } else {
        await adminUpdateCollection(modal.collection.id, body);
        addToast("Collection updated", "success");
      }
      setModal(null);
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await adminDeleteCollection(confirmDel.id);
      addToast("Collection deleted", "success");
      setConfirmDel(null);
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  }

  const autoCount = form.categorySlugs.length + form.brandSlugs.length;

  return (
    <div>
      <SectionHeader
        title="Collections"
        subtitle="Curated “Concepts” — themed groups of listings for buyers to browse at /collections. Hand-pick listings and/or auto-fill by category and brand."
        actions={
          <Button variant="brand" onClick={openCreate}>
            + New collection
          </Button>
        }
      />

      {loading ? (
        <LoadingState label="Loading collections…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : collections.length === 0 ? (
        <EmptyState
          title="No collections yet"
          hint="Create your first collection — e.g. “Monsoon-ready gear” or “Best of Electricals”."
        />
      ) : (
        <AdminTable columns={["Collection", "Status", "Items", "Order", ""]}>
          {collections.map((c) => (
            <Row key={c.id}>
              <Td>
                <div className="font-medium text-ink">{c.title}</div>
                <div className="text-xs text-faint">/collection/{c.slug}</div>
              </Td>
              <Td>
                <Pill status={c.status === "published" ? "active" : "planned"}>
                  {c.status === "published" ? "Published" : "Draft"}
                </Pill>
              </Td>
              <Td>
                {c.itemCount} {c.itemCount === 1 ? "listing" : "listings"}
              </Td>
              <Td>{c.order ?? 0}</Td>
              <Td className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-error"
                    onClick={() => setConfirmDel(c)}
                  >
                    Delete
                  </Button>
                </div>
              </Td>
            </Row>
          ))}
        </AdminTable>
      )}

      {/* Create / edit modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        size="lg"
        title={modal?.kind === "edit" ? `Edit — ${modal.collection.title}` : "New collection"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button variant="brand" disabled={saving || !form.title.trim()} onClick={save}>
              {saving ? "Saving…" : "Save collection"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Monsoon-ready gear"
            required
          />
          <Input
            label="Subtitle (optional)"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            placeholder="Everything to stay dry and productive this season"
          />

          <div>
            <label className="field-label">Cover image (optional)</label>
            <ImageUpload
              value={form.coverImage || undefined}
              onChange={(url) => setForm({ ...form, coverImage: url })}
              label="Upload cover"
            />
            {form.coverImage && (
              <button
                type="button"
                onClick={() => setForm({ ...form, coverImage: null })}
                className="mt-2 text-xs text-error"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Remove cover
              </button>
            )}
          </div>

          {/* Hand-picked listings */}
          <div>
            <label className="field-label">
              Hand-picked listings{" "}
              <span className="text-faint">({form.listingIds.length} selected)</span>
            </label>
            <Input
              placeholder="Search listings by title or seller…"
              value={listingSearch}
              onChange={(e) => setListingSearch(e.target.value)}
              containerClassName="mb-2"
            />
            <div
              className="rounded-lg border border-border"
              style={{ maxHeight: 240, overflowY: "auto" }}
            >
              {filteredListings.length === 0 ? (
                <p className="p-3 text-sm text-muted">No listings match that search.</p>
              ) : (
                filteredListings.map((l) => {
                  const checked = form.listingIds.includes(l.id);
                  const img = listingImage(l);
                  return (
                    <label
                      key={l.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 last:border-b-0 hover:bg-bg-subtle"
                      style={{ minWidth: 0 }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleListing(l.id)}
                        style={{ flexShrink: 0 }}
                      />
                      <span
                        aria-hidden
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          flexShrink: 0,
                          border: "1px solid var(--border)",
                          background: img ? `center/cover no-repeat url(${img})` : "var(--bg-subtle)",
                        }}
                      />
                      <span style={{ minWidth: 0 }}>
                        <span className="line-clamp-1 block text-sm font-medium text-ink">
                          {l.title}
                        </span>
                        <span className="block text-xs text-faint">
                          {listingSeller(l)}
                          {l.type === "service" ? " · Service" : ""}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Auto-fill by category + brand (native multi selects) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="col-cats">
                Auto-include categories
              </label>
              <select
                id="col-cats"
                multiple
                className="select"
                style={{ height: 150, paddingTop: 8, paddingBottom: 8 }}
                value={form.categorySlugs}
                onChange={(e) => setForm({ ...form, categorySlugs: multiValues(e) })}
              >
                {catOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="field-hint">Cmd/Ctrl-click to select several. Includes descendants.</p>
            </div>
            <div>
              <label className="field-label" htmlFor="col-brands">
                Auto-include brands
              </label>
              <select
                id="col-brands"
                multiple
                className="select"
                style={{ height: 150, paddingTop: 8, paddingBottom: 8 }}
                value={form.brandSlugs}
                onChange={(e) => setForm({ ...form, brandSlugs: multiValues(e) })}
              >
                {brands.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name} ({b.count})
                  </option>
                ))}
              </select>
              <p className="field-hint">Active listings of these brands are added automatically.</p>
            </div>
          </div>

          {autoCount > 0 && (
            <p className="text-xs text-muted">
              Resolved items = your {form.listingIds.length} hand-picked listing
              {form.listingIds.length === 1 ? "" : "s"} plus every active listing in the selected
              categories/brands (de-duplicated).
            </p>
          )}

          {/* Status + order */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Status"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as "draft" | "published" })
              }
              options={[
                { value: "draft", label: "Draft (hidden)" },
                { value: "published", label: "Published (live)" },
              ]}
            />
            <Input
              label="Order"
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: e.target.value })}
            />
          </div>

          {modal?.kind === "create" && (
            <p className="text-xs text-faint">Slug is auto-generated from the title on the server.</p>
          )}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Delete collection"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDel(null)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={deleting} onClick={doDelete}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Delete <b>{confirmDel?.title}</b>? This removes the collection and its landing page. The
          underlying listings are not affected.
        </p>
      </Modal>
    </div>
  );
}
