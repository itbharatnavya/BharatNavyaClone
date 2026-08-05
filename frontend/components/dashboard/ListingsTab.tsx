"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User, Listing, ListingStatus } from "@/lib/types";
import { getMyListings, updateListing, deleteListing, markListingSold } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Textarea from "@/components/Textarea";
import Select from "@/components/Select";
import { PanelHeader, EmptyState, Loading, Icon, formatINR, useTr } from "./shared";

interface Props {
  user: User;
}

function priceLabel(l: Listing): string {
  if (l.type === "service") {
    const first = l.service?.rateCard?.[0];
    if (first) return `${formatINR(first.price)}${first.unit ? " / " + first.unit : ""}`;
    return "Quote";
  }
  if (l.product?.price != null) return formatINR(l.product.price);
  const tier = l.product?.priceTiers?.[0];
  if (tier) return `${formatINR(tier.price)}${tier.unit ? " / " + tier.unit : ""}`;
  return "Ask price";
}

const STATUS_VARIANT: Record<string, "verified" | "new" | "neutral" | "sponsored"> = {
  active: "new",
  sold: "sponsored",
  draft: "neutral",
  inactive: "neutral",
  pending: "neutral",
};

export default function ListingsTab({ user }: Props) {
  const tr = useTr();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [deleting, setDeleting] = useState<Listing | null>(null);
  const [busy, setBusy] = useState(false);

  // edit form
  const [fTitle, setFTitle] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fStatus, setFStatus] = useState<ListingStatus>("active");
  const [fPrice, setFPrice] = useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setListings(await getMyListings());
    } catch (e) {
      addToast((e as Error).message || "Failed to load listings", "error");
    } finally {
      setLoading(false);
    }
  }, [user.id, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const mine = useMemo(
    () =>
      [...listings].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [listings]
  );

  function openEdit(l: Listing) {
    setEditing(l);
    setFTitle(l.title);
    setFDesc(l.description || "");
    setFStatus(l.status);
    setFPrice(l.product?.price != null ? String(l.product.price) : "");
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    try {
      const body: Partial<Listing> = {
        title: fTitle.trim(),
        description: fDesc.trim(),
        status: fStatus,
      };
      if (editing.type === "product" && fPrice.trim() !== "") {
        const price = Number(fPrice);
        if (!Number.isNaN(price)) {
          body.product = { ...(editing.product || {}), price } as Listing["product"];
        }
      }
      const updated = await updateListing(editing.id, body);
      setListings((prev) => prev.map((l) => (l.id === editing.id ? { ...l, ...updated } : l)));
      addToast(tr("dashboard.listings.saved", "Listing updated"), "success");
      setEditing(null);
    } catch (e) {
      addToast((e as Error).message || "Update failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteListing(deleting.id);
      setListings((prev) => prev.filter((l) => l.id !== deleting.id));
      addToast(tr("dashboard.listings.deleted", "Listing deleted"), "success");
      setDeleting(null);
    } catch (e) {
      addToast((e as Error).message || "Delete failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function markSold(l: Listing) {
    setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, status: "sold" } : x)));
    try {
      await markListingSold(l.id);
      addToast(tr("dashboard.listings.markedSold", "Marked as sold"), "success");
    } catch (e) {
      // rollback on failure
      setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, status: l.status } : x)));
      addToast((e as Error).message || "Could not mark sold", "error");
    }
  }

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.listings.title", "My listings")}
        subtitle={tr("dashboard.listings.subtitle", "Edit, mark sold, or remove your products & services.")}
        actions={
          <Button href="/sell" variant="primary" leftIcon={<Icon name="plus" size={16} />}>
            {tr("dashboard.postNew", "Post new")}
          </Button>
        }
      />

      {loading ? (
        <Loading />
      ) : mine.length === 0 ? (
        <EmptyState
          icon={<Icon name="listings" size={22} />}
          title={tr("dashboard.listings.empty", "You have no listings yet")}
          subtitle={tr("dashboard.listings.emptyHint", "Post your first product or service to start getting leads.")}
          action={
            <Button href="/sell" variant="primary" leftIcon={<Icon name="plus" size={16} />}>
              {tr("dashboard.listings.postFirst", "Post your first listing")}
            </Button>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mine.map((l) => {
            const img = l.media?.find((m) => m.type !== "video")?.url || l.media?.[0]?.url;
            return (
              <div
                key={l.id}
                className="card card-flat"
                style={{ display: "flex", gap: 14, padding: 14, alignItems: "center", flexWrap: "wrap" }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
                    background: "var(--bg-subtle)",
                    flexShrink: 0,
                    overflow: "hidden",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--faint)",
                  }}
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Icon name="listings" size={22} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Link
                      href={`/listing/${l.id}`}
                      style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}
                    >
                      {l.title}
                    </Link>
                    <Badge variant={STATUS_VARIANT[l.status] || "neutral"}>{l.status}</Badge>
                    <Badge variant="neutral">{l.type}</Badge>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                    {priceLabel(l)}
                    {l.location?.city ? ` · ${l.location.city}` : ""}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Button size="sm" variant="secondary" leftIcon={<Icon name="edit" size={14} />} onClick={() => openEdit(l)}>
                    {tr("common.edit", "Edit")}
                  </Button>
                  {l.status !== "sold" && (
                    <Button
                      size="sm"
                      variant="brand"
                      leftIcon={<Icon name="check" size={14} />}
                      onClick={() => markSold(l)}
                    >
                      {tr("dashboard.listings.markSold", "Mark sold")}
                    </Button>
                  )}
                  <Button size="sm" variant="danger" leftIcon={<Icon name="trash" size={14} />} onClick={() => setDeleting(l)}>
                    {tr("common.delete", "Delete")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      <Modal
        open={!!editing}
        onClose={() => (busy ? undefined : setEditing(null))}
        title={tr("dashboard.listings.editTitle", "Edit listing")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
              {tr("common.cancel", "Cancel")}
            </Button>
            <Button variant="primary" onClick={saveEdit} disabled={busy || !fTitle.trim()}>
              {busy ? tr("common.saving", "Saving…") : tr("common.save", "Save changes")}
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input
            label={tr("dashboard.listings.fieldTitle", "Title")}
            value={fTitle}
            onChange={(e) => setFTitle(e.target.value)}
          />
          <Textarea
            label={tr("dashboard.listings.fieldDesc", "Description")}
            value={fDesc}
            onChange={(e) => setFDesc(e.target.value)}
            rows={5}
          />
          {editing?.type === "product" && (
            <Input
              label={tr("dashboard.listings.fieldPrice", "Price (₹)")}
              type="number"
              value={fPrice}
              onChange={(e) => setFPrice(e.target.value)}
              hint={tr("dashboard.listings.priceHint", "Leave blank to keep as 'Ask price'.")}
            />
          )}
          <Select
            label={tr("dashboard.listings.fieldStatus", "Status")}
            value={fStatus}
            onChange={(e) => setFStatus(e.target.value as ListingStatus)}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "draft", label: "Draft" },
              { value: "sold", label: "Sold" },
            ]}
          />
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleting}
        onClose={() => (busy ? undefined : setDeleting(null))}
        title={tr("dashboard.listings.deleteTitle", "Delete listing?")}
        size="sm"
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
          {tr(
            "dashboard.listings.deleteConfirm",
            `"${deleting?.title || ""}" will be permanently removed. This cannot be undone.`
          )}
        </p>
      </Modal>
    </div>
  );
}
