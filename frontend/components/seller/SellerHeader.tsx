"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BadgeVariant } from "@/components/Badge";
import type { Conversation } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useConfig } from "@/lib/config";
import { useTr } from "@/components/discovery/hooks";
import { useToast } from "@/components/Toast";
import { followUser, unfollowUser, getFollowStatus, createConversation } from "@/lib/api";
import { waLink } from "@/lib/whatsapp";
import Avatar from "@/components/Avatar";
import Rating from "@/components/Rating";
import TrustBadges from "@/components/TrustBadges";
import Badge from "@/components/Badge";
import ContactAuthModal from "@/components/auth/ContactAuthModal";
import ChatModal from "@/components/chat/ChatModal";

export interface SellerHeaderProps {
  userId: string; // seller's user id (follow target)
  companyName: string;
  city?: string;
  state?: string;
  logo?: string | null;
  coverImage?: string | null;
  badges?: string[]; // badge keys from the API
  isVerified?: boolean;
  trustSealVerified?: boolean;
  gstNumber?: string | null;
  yearEstablished?: number | null;
  rating?: number;
  reviewCount?: number;
  contactMobile?: string | null;
  /** Called after a logged-out visitor completes login/register in the
   * contact gate, so the parent can refetch the seller profile (which now
   * includes contactMobile) and pass the real number back down. */
  onContactUnlocked?: () => void;
}

const BADGE_VARIANTS: Record<string, BadgeVariant> = {
  top_rated: "new",
  fast_responder: "sponsored",
  verified: "verified",
  trusted: "premium",
};

function prettify(key: string): string {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function waNumber(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

// Inline chat-bubble glyph — line-glyph only, matches the Call/WhatsApp icons.
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

export default function SellerHeader(props: SellerHeaderProps) {
  const {
    userId,
    companyName,
    city,
    state,
    logo,
    coverImage,
    badges = [],
    isVerified,
    trustSealVerified,
    gstNumber,
    yearEstablished,
    rating,
    reviewCount,
    contactMobile,
    onContactUnlocked,
  } = props;

  const router = useRouter();
  const t = useTr();
  const { user } = useAuth();
  const { addToast } = useToast();
  const cfg = useConfig();

  const badgeLabel = (key: string) => {
    const map: Record<string, string> = {
      top_rated: t("badge.topRated", "Top Rated"),
      fast_responder: t("badge.fastResponder", "Fast Responder"),
      verified: t("badge.verified", "Verified"),
      trusted: t("badge.trusted", "Trusted"),
    };
    return map[key] || prettify(key);
  };
  const flags: Record<string, boolean> = (cfg?.featureFlags as Record<string, boolean>) || {};
  const flagOn = (key: string, dflt: boolean) =>
    typeof flags[key] === "boolean" ? flags[key] : dflt;

  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"contact" | "chat" | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [chatConvo, setChatConvo] = useState<Conversation | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const followEnabled = flagOn("follow", false);
  const wa = waNumber(contactMobile);
  const isOwnProfile = !!user && user.id === userId;
  // Buttons stay visible (flag-gated) for logged-out visitors too — the
  // backend omits contactMobile until authenticated, so there's no number to
  // link to yet; the click opens the login/register gate instead. A seller
  // viewing their own profile never sees these — calling/WhatsApp-ing
  // yourself makes no sense.
  const showWhatsApp = !isOwnProfile && flagOn("whatsapp", true) && (user ? !!wa : true);
  const showCall = !isOwnProfile && flagOn("call", true) && (user ? !!contactMobile : true);
  const showChat = !isOwnProfile && flagOn("chat", true);

  const years = yearEstablished ? new Date().getFullYear() - yearEstablished : null;

  // General profile-level enquiry (not tied to one listing) — pre-filled on wa.me.
  const waHref = waLink({
    phone: contactMobile,
    text: `Hi ${companyName}, I found you on Bharat Navya and would like to enquire about your products/services.`,
  });

  useEffect(() => {
    let cancelled = false;
    if (followEnabled && user && userId) {
      getFollowStatus(userId)
        .then((r) => {
          if (!cancelled) setFollowing(!!r.following);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [followEnabled, user, userId]);

  async function toggleFollow() {
    if (!user) {
      addToast("Please log in to follow this seller", "info");
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setFollowBusy(true);
    try {
      const r = following ? await unfollowUser(userId) : await followUser(userId);
      setFollowing(!!r.following);
      addToast(r.following ? "Following" : "Unfollowed", "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not update follow", "error");
    } finally {
      setFollowBusy(false);
    }
  }

  function handleContactClick() {
    if (!user) {
      setPendingAction("contact");
      setAuthOpen(true);
    }
    // When logged in, the tel:/wa.me <a> below handles the click directly.
  }

  async function startChat() {
    if (isOwnProfile) return;
    setStartingChat(true);
    try {
      const convo = await createConversation(undefined, userId);
      setChatConvo(convo);
      setChatOpen(true);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not start chat", "error");
    } finally {
      setStartingChat(false);
    }
  }

  function handleChatClick() {
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

  return (
    <div className="card card-flat" style={{ overflow: "hidden" }}>
      {/* Cover — renders sellerProfile.coverImage; responsive height */}
      <div
        className="sh-cover"
        style={{
          background: coverImage
            ? `center/cover no-repeat url(${coverImage})`
            : "linear-gradient(120deg, var(--brand-tint), var(--action-tint))",
          borderBottom: "1px solid var(--border)",
        }}
      />

      <div style={{ padding: 20 }}>
        <div className="sh-row">
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", minWidth: 0 }}>
            <div style={{ marginTop: -52 }}>
              <Avatar src={logo} name={companyName} size={84} ring />
            </div>
            <div style={{ minWidth: 0, paddingTop: 4 }}>
              <h1 className="line-clamp-2" style={{ fontSize: "var(--fs-xl)", fontWeight: 800, color: "var(--ink)", lineHeight: 1.25 }}>
                {companyName}
              </h1>
              {(city || state) && (
                <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: 4 }}>
                  {[city, state].filter(Boolean).join(", ")}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                {typeof rating === "number" && rating > 0 && (
                  <Rating value={rating} count={reviewCount} size={15} />
                )}
              </div>
            </div>
          </div>

          {/* Actions — Call/WhatsApp are the only contact channels (no in-app
              chat); logged out, they open the login/register gate instead of
              a real tel:/wa.me link. */}
          <div className="sh-actions">
            {showCall &&
              (user ? (
                <a href={`tel:${(contactMobile || "").replace(/\s/g, "")}`} className="btn btn-brand">
                  {t("common.call", "Call")}
                </a>
              ) : (
                <button type="button" onClick={handleContactClick} className="btn btn-brand">
                  {t("common.call", "Call")}
                </button>
              ))}
            {showWhatsApp &&
              (user && waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <WhatsAppIcon />
                  {t("common.whatsapp", "WhatsApp")}
                </a>
              ) : !user ? (
                <button
                  type="button"
                  onClick={handleContactClick}
                  className="btn btn-secondary"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <WhatsAppIcon />
                  {t("common.whatsapp", "WhatsApp")}
                </button>
              ) : null)}
            {showChat && (
              <button
                type="button"
                onClick={handleChatClick}
                disabled={startingChat}
                className="btn btn-secondary"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <ChatIcon />
                {t("common.chat", "Chat")}
              </button>
            )}
            {followEnabled && (
              <button
                type="button"
                className={following ? "btn btn-secondary" : "btn btn-primary"}
                onClick={toggleFollow}
                disabled={followBusy}
              >
                {following ? t("common.following", "Following") : t("common.follow", "Follow")}
              </button>
            )}
          </div>
        </div>

        {/* Badges + trust */}
        {(badges.length > 0 || isVerified || trustSealVerified || gstNumber || years) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 16 }}>
            {/* "verified" is excluded here — TrustBadges below already shows
                a distinct Verified pill, so this only carries badges TrustBadges
                doesn't cover (top rated, fast responder, 25+ reviews "trusted"). */}
            {badges
              .filter((key) => key !== "verified")
              .map((key) => (
                <Badge key={key} variant={BADGE_VARIANTS[key] || "neutral"}>
                  {badgeLabel(key)}
                </Badge>
              ))}
            <TrustBadges
              verified={isVerified}
              trustSeal={trustSealVerified}
              gst={!!gstNumber}
              years={years}
              size="sm"
            />
          </div>
        )}
      </div>

      <style jsx>{`
        .sh-cover {
          height: 176px;
        }
        .sh-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .sh-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        @media (max-width: 768px) {
          .sh-cover {
            height: 140px;
          }
        }
        @media (max-width: 560px) {
          .sh-cover {
            height: 110px;
          }
          .sh-actions {
            width: 100%;
          }
          .sh-actions :global(.btn) {
            flex: 1;
          }
        }
      `}</style>

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
          otherUserName={companyName}
        />
      )}
    </div>
  );
}
