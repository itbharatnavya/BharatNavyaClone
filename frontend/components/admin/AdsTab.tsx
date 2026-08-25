"use client";

// components/admin/AdsTab.tsx — ad inventory (slots) + campaign bookings.
//
// Bookings drive the public slider (routes/ads.js): the admin controls
//   • WHERE  — placementType (category_top / search_top / home_hero, or the
//              recruitment_* equivalents)   [dropdown]
//   • WHICH  — target category (Directory only; empty = all) + advertiser
//              (seller or employer, scoped by `product`) + listing (Directory only)
//              plus the creative (image, headline, click-through URL)
//   • HOW/WHEN — start/end date, priority, status (active / scheduled / paused)
//
// Scoped by `product`: Directory books against sellers/listings/categories exactly as
// before; Recruitment books against employers instead. No "advertise a specific job"
// picker — ad_bookings.listing_id has a DB foreign key straight to Directory's
// `listings` table (schema.sql), so a job id can't be stored there without a schema
// change; the existing free-text "Click-through URL" field already covers linking a
// specific job manually. Target category is likewise Directory-only (categories don't
// apply to Recruitment placements) and hidden for that product. See ADMIN-CONSOLE.md
// §Phase 5 for the full reasoning. Ad slots (inventory) aren't split — a slot is just
// a generic name+size+placementType, not tied to either product in the data model.
//
// All selection inputs are native dropdowns (mobile-friendly, non-technical
// admin). Bookings can be created and edited in place.

import React, { useEffect, useMemo, useState } from "react";
import {
  getAdSlots,
  createAdSlot,
  updateAdSlot,
  getAdBookings,
  createAdBooking,
  updateAdBooking,
  getCategories,
  getListings,
  adminSellers,
  adminGetEmployers,
  type AdSlotRow,
  type AdBookingRow,
} from "./adminApi";
import type { Category, Listing } from "@/lib/types";
import {
  SectionHeader,
  Panel,
  AdminTable,
  Row,
  Td,
  Pill,
  Toggle,
  LoadingState,
  ErrorState,
  EmptyState,
  fmtDate,
  money,
} from "./ui";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { useToast } from "@/components/Toast";

// Placement destinations the public serving layer understands, split by product.
const DIRECTORY_PLACEMENTS = [
  { value: "category_top", label: "Category top (category pages)" },
  { value: "search_top", label: "Search top (search results)" },
  { value: "home_hero", label: "Home hero (homepage)" },
];
const RECRUITMENT_PLACEMENTS = [
  { value: "recruitment_home", label: "Recruitment — home page" },
  { value: "recruitment_search_top", label: "Recruitment — job search top" },
];

// Serving statuses. Public /api/ads serves "active" + "scheduled" (within the
// date window); "paused" is the admin off-switch.
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "paused", label: "Paused" },
];

interface BookingForm {
  placementType: string;
  categorySlug: string; // "" = all categories
  sellerId: string;
  listingId: string;
  creativeImageUrl: string;
  headline: string;
  targetUrl: string;
  startDate: string;
  endDate: string;
  priority: string;
  amount: string;
  status: string;
}

function emptyBooking(placementType: string): BookingForm {
  return {
    placementType,
    categorySlug: "",
    sellerId: "",
    listingId: "",
    creativeImageUrl: "",
    headline: "",
    targetUrl: "",
    startDate: "",
    endDate: "",
    priority: "0",
    amount: "",
    status: "active",
  };
}

interface AdsTabProps {
  product?: "directory" | "recruitment";
}

export default function AdsTab({ product = "directory" }: AdsTabProps) {
  const { addToast } = useToast();
  const isRecruitment = product === "recruitment";
  const placementOptions = isRecruitment ? RECRUITMENT_PLACEMENTS : DIRECTORY_PLACEMENTS;

  const [slots, setSlots] = useState<AdSlotRow[]>([]);
  const [bookings, setBookings] = useState<AdBookingRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [advertisers, setAdvertisers] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // slot modal
  const [slotOpen, setSlotOpen] = useState(false);
  const [slotForm, setSlotForm] = useState({
    name: "",
    placementType: "banner",
    defaultSize: "",
    isActive: true,
  });
  const [savingSlot, setSavingSlot] = useState(false);

  // booking modal
  const [bookOpen, setBookOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bookForm, setBookForm] = useState<BookingForm>(emptyBooking(placementOptions[0].value));
  const [savingBook, setSavingBook] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (isRecruitment) {
        const [s, b, emps] = await Promise.all([getAdSlots(), getAdBookings(), adminGetEmployers("approved")]);
        setSlots(s);
        setBookings(b);
        setAdvertisers(emps.map((e) => ({ id: e.id, label: e.companyName })));
        setCategories([]);
        setListings([]);
        setLoading(false);
        return;
      }
      const [s, b, cats, sel, lst] = await Promise.all([
        getAdSlots(),
        getAdBookings(),
        getCategories(),
        adminSellers(),
        getListings({ limit: 500 }),
      ]);
      setSlots(s);
      setBookings(b);
      setCategories(cats);
      setAdvertisers(sel.map((u) => ({ id: u.id, label: u.sellerProfile?.companyName || u.name || u.id })));
      setListings(lst.listings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ads");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  async function toggleSlot(slot: AdSlotRow) {
    try {
      await updateAdSlot(slot.id, { isActive: !slot.isActive });
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  async function saveSlot() {
    setSavingSlot(true);
    try {
      await createAdSlot({
        name: slotForm.name.trim(),
        placementType: slotForm.placementType,
        defaultSize: slotForm.defaultSize,
        isActive: slotForm.isActive,
      });
      addToast("Ad slot created", "success");
      setSlotOpen(false);
      setSlotForm({ name: "", placementType: "banner", defaultSize: "", isActive: true });
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setSavingSlot(false);
    }
  }

  function openNewBooking() {
    setEditingId(null);
    setBookForm(emptyBooking(placementOptions[0].value));
    setBookOpen(true);
  }

  function openEditBooking(b: AdBookingRow) {
    setEditingId(b.id);
    setBookForm({
      placementType: b.placementType || placementOptions[0].value,
      categorySlug: (b.categoryIds && b.categoryIds[0]) || b.categoryId || "",
      sellerId: b.sellerId || "",
      listingId: b.listingId || "",
      creativeImageUrl: b.creativeImageUrl || "",
      headline: b.headline || "",
      targetUrl: b.targetUrl || "",
      startDate: b.startDate ? b.startDate.slice(0, 10) : "",
      endDate: b.endDate ? b.endDate.slice(0, 10) : "",
      priority: String(b.priority ?? 0),
      amount: b.amount != null ? String(b.amount) : "",
      status: b.status || "active",
    });
    setBookOpen(true);
  }

  async function saveBooking() {
    setSavingBook(true);
    try {
      const payload = {
        placementType: bookForm.placementType || null,
        sellerId: bookForm.sellerId || null,
        listingId: bookForm.listingId || null,
        categoryIds: bookForm.categorySlug ? [bookForm.categorySlug] : [],
        creativeImageUrl: bookForm.creativeImageUrl.trim() || null,
        headline: bookForm.headline.trim() || null,
        targetUrl: bookForm.targetUrl.trim() || null,
        startDate: bookForm.startDate || null,
        endDate: bookForm.endDate || null,
        priority: Number(bookForm.priority) || 0,
        amount: bookForm.amount.trim() === "" ? null : Number(bookForm.amount),
        status: bookForm.status,
      };
      if (editingId) {
        await updateAdBooking(editingId, payload);
        addToast("Booking updated", "success");
      } else {
        await createAdBooking(payload);
        addToast("Booking created", "success");
      }
      setBookOpen(false);
      setEditingId(null);
      setBookForm(emptyBooking(placementOptions[0].value));
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setSavingBook(false);
    }
  }

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...[...categories]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.slug, label: c.name })),
    ],
    [categories]
  );

  const sellerOptions = useMemo(
    () => [
      { value: "", label: "— No advertiser —" },
      ...advertisers.map((a) => ({ value: a.id, label: a.label })),
    ],
    [advertisers]
  );

  // Advertise-a-listing picker, scoped to the chosen advertiser when set.
  const listingOptions = useMemo(() => {
    const scoped = bookForm.sellerId
      ? listings.filter((l) => l.sellerId === bookForm.sellerId)
      : listings;
    return [
      { value: "", label: "— No listing —" },
      ...scoped.map((l) => ({ value: l.id, label: l.title })),
    ];
  }, [listings, bookForm.sellerId]);

  const slotName = (id?: string | null) =>
    slots.find((s) => s.id === id)?.name || id || "—";
  const sellerName = (id?: string | null) =>
    (id && advertisers.find((a) => a.id === id)?.label) || id || "—";
  const catName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name || slug;
  const targetingLabel = (b: AdBookingRow) => {
    const ids = b.categoryIds && b.categoryIds.length ? b.categoryIds : [];
    if (ids.length === 0) return "All categories";
    return ids.map(catName).join(", ");
  };

  if (loading) return <LoadingState label="Loading ad inventory…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <SectionHeader
        title="Ads"
        subtitle={
          isRecruitment
            ? "Sponsored placement bookings on Recruitment pages."
            : "Ad slot inventory and sponsored placement bookings."
        }
      />

      <div className="space-y-6">
        {/* Ad slots */}
        <Panel
          title="Ad slots"
          desc="Placements available across the site."
          right={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSlotOpen(true)}
            >
              + New slot
            </Button>
          }
        >
          {slots.length === 0 ? (
            <EmptyState title="No ad slots" />
          ) : (
            <AdminTable columns={["Slot", "Placement", "Size", "Active"]}>
              {slots.map((s) => (
                <Row key={s.id}>
                  <Td>
                    <span className="font-semibold text-ink">{s.name}</span>
                    <span className="ml-1 text-xs text-faint">({s.id})</span>
                  </Td>
                  <Td>
                    <Pill tone="blue">{s.placementType || "—"}</Pill>
                  </Td>
                  <Td className="text-muted">{s.defaultSize || "—"}</Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => toggleSlot(s)}
                      className="cursor-pointer"
                    >
                      <Pill status={s.isActive ? "on" : "off"}>
                        {s.isActive ? "Active" : "Inactive"}
                      </Pill>
                    </button>
                  </Td>
                </Row>
              ))}
            </AdminTable>
          )}
        </Panel>

        {/* Bookings */}
        <Panel
          title="Ad bookings"
          desc="Sponsored campaigns that run in the on-site ad slider."
          right={
            <Button size="sm" variant="brand" onClick={openNewBooking}>
              + New booking
            </Button>
          }
        >
          {bookings.length === 0 ? (
            <EmptyState title="No bookings yet" />
          ) : (
            <AdminTable
              columns={[
                "Placement",
                "Advertiser",
                "Targeting",
                "Dates",
                "Priority",
                "Amount",
                "Status",
                "",
              ]}
            >
              {bookings.map((b) => (
                <Row key={b.id}>
                  <Td>
                    <Pill tone="blue">{b.placementType || slotName(b.adSlotId || b.slotId)}</Pill>
                  </Td>
                  <Td className="text-muted">{sellerName(b.sellerId)}</Td>
                  <Td className="text-muted">{targetingLabel(b)}</Td>
                  <Td className="whitespace-nowrap text-muted">
                    {fmtDate(b.startDate)} → {fmtDate(b.endDate)}
                  </Td>
                  <Td className="text-muted">{b.priority}</Td>
                  <Td className="text-muted">{money(b.amount)}</Td>
                  <Td>
                    <Pill status={b.status}>{b.status}</Pill>
                  </Td>
                  <Td>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openEditBooking(b)}
                    >
                      Edit
                    </Button>
                  </Td>
                </Row>
              ))}
            </AdminTable>
          )}
        </Panel>
      </div>

      {/* New slot modal */}
      <Modal
        open={slotOpen}
        onClose={() => setSlotOpen(false)}
        title="New ad slot"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSlotOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              disabled={savingSlot || !slotForm.name.trim()}
              onClick={saveSlot}
            >
              {savingSlot ? "Saving…" : "Create slot"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Slot name"
            value={slotForm.name}
            onChange={(e) => setSlotForm({ ...slotForm, name: e.target.value })}
            placeholder="Homepage Banner"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Placement type"
              value={slotForm.placementType}
              onChange={(e) =>
                setSlotForm({ ...slotForm, placementType: e.target.value })
              }
              options={[
                { value: "banner", label: "Banner" },
                { value: "sponsored_row", label: "Sponsored row" },
                { value: "sidebar", label: "Sidebar" },
              ]}
            />
            <Input
              label="Default size"
              value={slotForm.defaultSize}
              onChange={(e) =>
                setSlotForm({ ...slotForm, defaultSize: e.target.value })
              }
              placeholder="1200x300"
            />
          </div>
          <Toggle
            label="Active"
            checked={slotForm.isActive}
            onChange={(v) => setSlotForm({ ...slotForm, isActive: v })}
          />
        </div>
      </Modal>

      {/* New / edit booking modal */}
      <Modal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        title={editingId ? "Edit ad booking" : "New ad booking"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBookOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              disabled={savingBook || !bookForm.creativeImageUrl.trim()}
              onClick={saveBooking}
            >
              {savingBook
                ? "Saving…"
                : editingId
                ? "Save changes"
                : "Create booking"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* WHERE + WHICH (dropdowns) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Where (placement)"
              value={bookForm.placementType}
              onChange={(e) =>
                setBookForm({ ...bookForm, placementType: e.target.value })
              }
              hint="Which slot this ad runs in."
              options={placementOptions}
            />
            {!isRecruitment && (
              <Select
                label="Target category"
                value={bookForm.categorySlug}
                onChange={(e) =>
                  setBookForm({ ...bookForm, categorySlug: e.target.value })
                }
                hint="Leave on “All categories” to run everywhere."
                options={categoryOptions}
              />
            )}
            <Select
              label={isRecruitment ? "Advertiser (employer)" : "Advertiser (seller)"}
              value={bookForm.sellerId}
              onChange={(e) =>
                setBookForm({
                  ...bookForm,
                  sellerId: e.target.value,
                  listingId: "",
                })
              }
              options={sellerOptions}
            />
            {!isRecruitment && (
              <Select
                label="Advertise a listing (optional)"
                value={bookForm.listingId}
                onChange={(e) =>
                  setBookForm({ ...bookForm, listingId: e.target.value })
                }
                hint={
                  bookForm.sellerId
                    ? "Listings from the selected advertiser."
                    : "Pick an advertiser to narrow this list."
                }
                options={listingOptions}
              />
            )}
          </div>
          {isRecruitment && (
            <p className="text-xs text-faint">
              To promote a specific job, paste its page link into “Click-through URL” below.
            </p>
          )}

          {/* Creative */}
          <Input
            label="Creative image URL"
            value={bookForm.creativeImageUrl}
            onChange={(e) =>
              setBookForm({ ...bookForm, creativeImageUrl: e.target.value })
            }
            placeholder="/demo/steel-2.jpg or https://…"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Headline"
              value={bookForm.headline}
              onChange={(e) =>
                setBookForm({ ...bookForm, headline: e.target.value })
              }
              placeholder="Bulk SS/MS/TMT at factory rates"
            />
            <Input
              label="Click-through URL"
              value={bookForm.targetUrl}
              onChange={(e) =>
                setBookForm({ ...bookForm, targetUrl: e.target.value })
              }
              placeholder="/seller/… or https://…"
            />
          </div>

          {/* HOW / WHEN */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start date"
              type="date"
              value={bookForm.startDate}
              onChange={(e) =>
                setBookForm({ ...bookForm, startDate: e.target.value })
              }
            />
            <Input
              label="End date"
              type="date"
              value={bookForm.endDate}
              onChange={(e) =>
                setBookForm({ ...bookForm, endDate: e.target.value })
              }
            />
            <Input
              label="Priority"
              type="number"
              value={bookForm.priority}
              onChange={(e) =>
                setBookForm({ ...bookForm, priority: e.target.value })
              }
              hint="Higher = shown first."
            />
            <Input
              label="Amount (₹)"
              type="number"
              value={bookForm.amount}
              onChange={(e) =>
                setBookForm({ ...bookForm, amount: e.target.value })
              }
            />
            <Select
              label="Status"
              value={bookForm.status}
              onChange={(e) =>
                setBookForm({ ...bookForm, status: e.target.value })
              }
              hint="Active & scheduled serve; paused is off."
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
