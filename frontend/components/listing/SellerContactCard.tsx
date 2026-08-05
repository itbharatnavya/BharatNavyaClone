"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Listing } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useConfig } from "@/lib/config";
import { useTr } from "@/components/discovery/hooks";
import { useToast } from "@/components/Toast";
import { createConversation, reportListing } from "@/lib/api";
import { waLink, enquiryText } from "@/lib/whatsapp";
import Avatar from "@/components/Avatar";
import Rating from "@/components/Rating";
import TrustBadges from "@/components/TrustBadges";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Textarea from "@/components/Textarea";

export interface ContactSeller {
  userId: string; // seller's user id (used to open a conversation / follow)
  name: string;
  slug?: string;
  city?: string;
  state?: string;
  logo?: string | null;
  rating?: number;
  reviewCount?: number;
  responseRate?: number;
  isVerified?: boolean;
  trustSealVerified?: boolean;
  gstNumber?: string | null;
  yearEstablished?: number | null;
  contactMobile?: string | null;
}

export interface SellerContactCardProps {
  listing: Listing;
  seller: ContactSeller;
}

function waNumber(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

// Inline WhatsApp glyph (speech-bubble + handset). SVG only — never the emoji.
function WhatsAppIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91a9.86 9.86 0 0 0-2.9-7.01zM12.05 20.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23a8.2 8.2 0 0 1 8.23 8.24c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
    </svg>
  );
}

const REPORT_REASONS = [
  "Prohibited or illegal item",
  "Spam or misleading listing",
  "Wrong category",
  "Counterfeit / IP violation",
  "Offensive or inappropriate content",
  "Other",
];

export default function SellerContactCard({ listing, seller }: SellerContactCardProps) {
  const router = useRouter();
  const t = useTr();
  const { user } = useAuth();
  const { addToast } = useToast();
  const cfg = useConfig();
  const flags: Record<string, boolean> = (cfg?.featureFlags as Record<string, boolean>) || {};
  const flagOn = (key: string, dflt: boolean) =>
    typeof flags[key] === "boolean" ? flags[key] : dflt;

  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [chatting, setChatting] = useState(false);

  const years = seller.yearEstablished
    ? new Date().getFullYear() - seller.yearEstablished
    : null;
  const wa = waNumber(seller.contactMobile);
  const profileHref = seller.slug ? `/seller/${seller.slug}` : undefined;

  const showWhatsApp = flagOn("whatsapp", true) && !!wa;
  const showCall = flagOn("call", true) && !!seller.contactMobile;
  const showShare = flagOn("share", true);

  const shareText = `Check out "${listing.title}" on BharatSource`;
  const shareUrl = () =>
    typeof window !== "undefined" ? window.location.href : `/listing/${listing.id}`;

  // Pre-filled WhatsApp enquiry drawn from THIS listing (title/price/unit/moq) +
  // the listing URL, so the seller opens WhatsApp to a ready-to-send message.
  const product = listing.product;
  const listingPrice =
    product?.price != null
      ? product.price
      : product?.priceTiers && product.priceTiers.length > 0
      ? product.priceTiers[0].price
      : null;
  const waHref = waLink({
    phone: seller.contactMobile,
    text: enquiryText({
      productTitle: listing.title,
      price: listingPrice,
      unit: product?.unitOfMeasure ?? null,
      moq: product?.moq ?? null,
      sellerName: seller.name,
      url: shareUrl(),
    }),
  });

  async function handleChat() {
    if (!user) {
      addToast("Please log in to chat with the seller", "info");
      router.push(`/login?next=/listing/${listing.id}`);
      return;
    }
    setChatting(true);
    try {
      const conv = await createConversation(listing.id, seller.userId);
      router.push(`/dashboard?tab=inbox&c=${conv.id}`);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not start chat", "error");
    } finally {
      setChatting(false);
    }
  }

  async function submitReport() {
    setSubmitting(true);
    try {
      await reportListing({ listingId: listing.id, reason, details: details.trim() || undefined });
      addToast("Report submitted. Thank you — our team will review it.", "success");
      setReportOpen(false);
      setDetails("");
      setReason(REPORT_REASONS[0]);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not submit report", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      addToast("Link copied to clipboard", "success");
      setShareOpen(false);
    } catch {
      addToast("Could not copy link", "error");
    }
  }

  return (
    <div className="card card-flat card-pad">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar src={seller.logo} name={seller.name} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {profileHref ? (
            <Link href={profileHref} style={{ textDecoration: "none" }} title={t("contact.viewProfile", "View seller profile")}>
              <h3 className="line-clamp-1" style={{ fontSize: 16, fontWeight: 700, color: "var(--brand)", cursor: "pointer" }}>
                {seller.name}
              </h3>
            </Link>
          ) : (
            <h3 className="line-clamp-1" style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
              {seller.name}
            </h3>
          )}
          {(seller.city || seller.state) && (
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
              {[seller.city, seller.state].filter(Boolean).join(", ")}
            </div>
          )}
          {typeof seller.rating === "number" && seller.rating > 0 && (
            <div style={{ marginTop: 6 }}>
              <Rating value={seller.rating} count={seller.reviewCount} size={14} />
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <TrustBadges
          verified={seller.isVerified}
          trustSeal={seller.trustSealVerified}
          gst={!!seller.gstNumber}
          years={years}
          responseRate={seller.responseRate}
          size="sm"
        />
      </div>

      <hr className="divider" style={{ margin: "16px 0" }} />

      {/* Primary action */}
      <Button variant="brand" block onClick={handleChat} disabled={chatting}>
        {chatting ? t("contact.chatting", "Starting chat…") : t("contact.chat", "Chat with seller")}
      </Button>

      {/* Call / WhatsApp */}
      {(showCall || showWhatsApp) && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {showCall && (
            <a
              href={`tel:${(seller.contactMobile || "").replace(/\s/g, "")}`}
              className="btn btn-secondary btn-block"
              style={{ flex: 1 }}
            >
              {t("common.call", "Call")}
            </a>
          )}
          {showWhatsApp && waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-block"
              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <WhatsAppIcon />
              {t("common.whatsapp", "WhatsApp")}
            </a>
          )}
        </div>
      )}

      {/* Secondary actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {showShare && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShareOpen(true)} style={{ flex: 1 }}>
            {t("common.share", "Share")}
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReportOpen(true)} style={{ flex: 1 }}>
          {t("common.report", "Report")}
        </button>
      </div>

      {profileHref && (
        <Link href={profileHref} className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }}>
          {t("contact.viewProfile", "View seller profile")} →
        </Link>
      )}

      {/* Report modal */}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={t("contact.reportTitle", "Report this listing")}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setReportOpen(false)}>
              {t("common.cancel", "Cancel")}
            </button>
            <button type="button" className="btn btn-danger" onClick={submitReport} disabled={submitting}>
              {submitting ? t("contact.submitting", "Submitting…") : t("contact.submitReport", "Submit report")}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="field-label" htmlFor="report-reason">
              {t("contact.reason", "Reason")}
            </label>
            <select
              id="report-reason"
              className="select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <Textarea
            label={t("contact.detailsOptional", "Details (optional)")}
            placeholder="Tell us what's wrong with this listing…"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>
      </Modal>

      {/* Share modal */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title={t("contact.shareTitle", "Share this listing")} size="sm">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${shareText} — ${shareUrl()}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-block"
            onClick={() => setShareOpen(false)}
          >
            {t("contact.shareWhatsApp", "Share on WhatsApp")}
          </a>
          <button type="button" className="btn btn-secondary btn-block" onClick={copyLink}>
            {t("contact.copyLink", "Copy link")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
