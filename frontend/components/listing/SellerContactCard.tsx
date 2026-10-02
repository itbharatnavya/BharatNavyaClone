"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { Listing, Conversation } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useConfig } from "@/lib/config";
import { useTr } from "@/components/discovery/hooks";
import { useToast } from "@/components/Toast";
import { reportListing, createConversation } from "@/lib/api";
import { waLink, enquiryText } from "@/lib/whatsapp";
import Avatar from "@/components/Avatar";
import Rating from "@/components/Rating";
import TrustBadges from "@/components/TrustBadges";
import Modal from "@/components/Modal";
import Textarea from "@/components/Textarea";
import ContactAuthModal from "@/components/auth/ContactAuthModal";
import ChatModal from "@/components/chat/ChatModal";
import ProductInboxModal from "@/components/chat/ProductInboxModal";

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
  /** Called after a logged-out visitor completes login/register in the
   * contact gate, so the parent can refetch the seller profile (which now
   * includes contactMobile) and pass the real number back down. */
  onContactUnlocked?: () => void;
}

function waNumber(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="M8.3 10.7l7.4-4.2M8.3 13.3l7.4 4.2" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M5 3v18" />
      <path d="M5 4h13l-2.5 4L18 12H5" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

// Inline phone glyph — line-glyph only, pairs with Call so all three buttons
// share the icon-above-label layout (fixes label wrap at 3-button width).
function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 3a2 2 0 0 1-.4 2.1L8 10.3a16 16 0 0 0 6 6l1.5-1.5a2 2 0 0 1 2-.4c1 .3 2 .5 3 .7a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}

// Inline chat-bubble glyph — line-glyph only, matches Share/Report/WhatsApp icons.
function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.7 8.7 0 0 1-4-.9L3 20l1-3.5a8.4 8.4 0 0 1-1-4A8.4 8.4 0 0 1 11.5 4h.5A8.4 8.4 0 0 1 21 11.5Z" />
    </svg>
  );
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

// Icon-above-label layout for the Call/WhatsApp/Chat row — at 3-button width
// a side-by-side icon+label ("WhatsApp") wraps mid-word, so each button
// stacks its icon over a small nowrap label instead.
const contactBtnStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 56,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  padding: "8px 4px",
};
const contactBtnLabelStyle: React.CSSProperties = {
  fontSize: "var(--fs-xs)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "100%",
};

const REPORT_REASONS = [
  "Prohibited or illegal item",
  "Spam or misleading listing",
  "Wrong category",
  "Counterfeit / IP violation",
  "Offensive or inappropriate content",
  "Other",
];

export default function SellerContactCard({ listing, seller, onContactUnlocked }: SellerContactCardProps) {
  const t = useTr();
  const { user } = useAuth();
  const { addToast } = useToast();
  const cfg = useConfig();
  const flags: Record<string, boolean> = (cfg?.featureFlags as Record<string, boolean>) || {};
  const flagOn = (key: string, dflt: boolean) =>
    typeof flags[key] === "boolean" ? flags[key] : dflt;

  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"contact" | "chat" | null>(null);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [chatConvo, setChatConvo] = useState<Conversation | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [productInboxOpen, setProductInboxOpen] = useState(false);

  const years = seller.yearEstablished
    ? new Date().getFullYear() - seller.yearEstablished
    : null;
  const wa = waNumber(seller.contactMobile);
  const profileHref = seller.slug ? `/seller/${seller.slug}` : undefined;
  const isOwnListing = !!user && user.id === seller.userId;

  // Call/WhatsApp are admin-flag gated as before; once flag-enabled, a
  // logged-out visitor still sees the buttons (so the option is discoverable)
  // but clicking opens the login/register gate instead of a tel:/wa.me link —
  // the backend never sends contactMobile to an unauthenticated request, so
  // there's nothing to link to here yet anyway. A seller viewing their own
  // listing never sees these — calling/WhatsApp-ing yourself makes no sense.
  const showWhatsApp = !isOwnListing && flagOn("whatsapp", true) && (user ? !!wa : true);
  const showCall = !isOwnListing && flagOn("call", true) && (user ? !!seller.contactMobile : true);
  // Chat is the one exception shown on your OWN listing too — not to message
  // yourself, but to see every buyer's messages about this product
  // (ProductInboxModal) instead of starting/joining a single thread.
  const showChat = flagOn("chat", true);
  const showShare = flagOn("share", true);

  const shareText = `Check out "${listing.title}" on Bharat Navya`;
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

  function handleContactClick() {
    if (!user) {
      setPendingAction("contact");
      setAuthOpen(true);
    }
    // When logged in, the tel:/wa.me <a> below handles the click directly.
  }

  async function startChat() {
    if (isOwnListing) return;
    setStartingChat(true);
    try {
      const convo = await createConversation(listing.id, seller.userId);
      setChatConvo(convo);
      setChatOpen(true);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not start chat", "error");
    } finally {
      setStartingChat(false);
    }
  }

  function handleChatClick() {
    if (isOwnListing) {
      setProductInboxOpen(true);
      return;
    }
    if (!user) {
      setPendingAction("chat");
      setAuthOpen(true);
      return;
    }
    void startChat();
  }

  function handleAuthSuccess() {
    const action = pendingAction;
    setPendingAction(null);
    if (action === "chat") {
      void startChat();
    } else {
      onContactUnlocked?.();
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
    <div className="card card-flat" style={{ padding: 0, overflow: "hidden" }}>
      {/* Top accent — reads as a distinct "profile" surface rather than a
          plain content block dropped into the sidebar. */}
      <div style={{ height: 4, background: "linear-gradient(90deg, var(--brand) 0%, var(--brand-hover) 100%)" }} />

      <div style={{ padding: "18px 20px 0" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Avatar src={seller.logo} name={seller.name} size={48} ring />
          <div style={{ flex: 1, minWidth: 0 }}>
            {profileHref ? (
              <Link href={profileHref} style={{ textDecoration: "none" }} title={t("contact.viewProfile", "View seller profile")}>
                <h3 className="line-clamp-1" style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--brand)", cursor: "pointer" }}>
                  {seller.name}
                </h3>
              </Link>
            ) : (
              <h3 className="line-clamp-1" style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--ink)" }}>
                {seller.name}
              </h3>
            )}
            {(seller.city || seller.state) && (
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: 2 }}>
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
      </div>

      {/* Trust strip — a tinted band so verification signals read as their
          own "credentials" zone instead of blending into the plain card. */}
      <div style={{ margin: "16px 0 0", padding: "10px 20px", background: "var(--bg-subtle)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <TrustBadges
          verified={seller.isVerified}
          trustSeal={seller.trustSealVerified}
          gst={!!seller.gstNumber}
          years={years}
          responseRate={seller.responseRate}
          size="sm"
        />
      </div>

      <div style={{ padding: "16px 20px 20px" }}>
      {/* Call / WhatsApp / Chat — three equal contact channels. Logged out:
          buttons open the login/register gate. Logged in: real tel:/wa.me
          links with a pre-filled enquiry, or a chat thread tagged to this
          listing (get-or-create conversation, opened in-page). */}
      {(showCall || showWhatsApp || showChat) && (
        <div style={{ display: "flex", gap: 8 }}>
          {showCall &&
            (user ? (
              <a
                href={`tel:${(seller.contactMobile || "").replace(/\s/g, "")}`}
                className="btn btn-brand btn-block"
                style={contactBtnStyle}
              >
                <PhoneIcon />
                <span style={contactBtnLabelStyle}>{t("common.call", "Call")}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={handleContactClick}
                className="btn btn-brand btn-block"
                style={contactBtnStyle}
              >
                <PhoneIcon />
                <span style={contactBtnLabelStyle}>{t("common.call", "Call")}</span>
              </button>
            ))}
          {showWhatsApp &&
            (user && waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-block"
                style={contactBtnStyle}
              >
                <WhatsAppIcon />
                <span style={contactBtnLabelStyle}>{t("common.whatsapp", "WhatsApp")}</span>
              </a>
            ) : !user ? (
              <button
                type="button"
                onClick={handleContactClick}
                className="btn btn-secondary btn-block"
                style={contactBtnStyle}
              >
                <WhatsAppIcon />
                <span style={contactBtnLabelStyle}>{t("common.whatsapp", "WhatsApp")}</span>
              </button>
            ) : null)}
          {showChat && (
            <button
              type="button"
              onClick={handleChatClick}
              disabled={startingChat}
              className="btn btn-secondary btn-block"
              style={contactBtnStyle}
            >
              <ChatIcon />
              <span style={contactBtnLabelStyle}>
                {isOwnListing ? t("common.messages", "Messages") : t("common.chat", "Chat")}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Secondary actions — bordered as one unit with a divider between,
          instead of two loose ghost buttons floating in whitespace. */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          marginTop: 12,
          border: "1px solid var(--border)",
          borderRadius: "var(--r-sm)",
          overflow: "hidden",
        }}
      >
          {showShare && (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              style={{
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                minHeight: 44,
                padding: "9px 10px",
                fontSize: "var(--fs-xs)",
                fontWeight: 600,
                color: "var(--muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <ShareIcon />
              {t("common.share", "Share")}
            </button>
          )}
          {showShare && <span aria-hidden style={{ width: 1, background: "var(--border)" }} />}
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              minHeight: 44,
              padding: "9px 10px",
              fontSize: "var(--fs-xs)",
              fontWeight: 600,
              color: "var(--muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <FlagIcon />
            {t("common.report", "Report")}
          </button>
        </div>
      </div>

      {profileHref && (
        <Link
          href={profileHref}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            minHeight: 44,
            padding: "13px 20px",
            background: "var(--brand-tint)",
            color: "var(--brand-hover)",
            fontWeight: 700,
            fontSize: "var(--fs-sm)",
            borderTop: "1px solid var(--border)",
            textDecoration: "none",
          }}
        >
          {t("contact.viewProfile", "View seller profile")}
          <ArrowIcon />
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

      {/* Login/register gate — opened when a logged-out visitor taps Call/WhatsApp/Chat */}
      <ContactAuthModal
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          setPendingAction(null);
        }}
        onSuccess={handleAuthSuccess}
      />

      {chatConvo && (
        <ChatModal
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          conversationId={chatConvo.id}
          meId={user?.id || ""}
          otherUserName={seller.name}
          listingTitle={listing.title}
        />
      )}

      {isOwnListing && (
        <ProductInboxModal
          open={productInboxOpen}
          onClose={() => setProductInboxOpen(false)}
          listingId={listing.id}
          listingTitle={listing.title}
          meId={user?.id || ""}
        />
      )}
    </div>
  );
}
