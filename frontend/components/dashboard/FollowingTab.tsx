"use client";

// FollowingTab — the list of sellers the current user follows. Visible to
// every logged-in user (buyer or seller) — following a seller is a buyer
// action either kind of account can do. GET /api/follow/me already existed
// and worked (getFollowing() in lib/api.ts); this tab is simply the first
// UI to actually call it.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@/lib/types";
import { getFollowing, unfollowUser, type FollowingEntry } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Avatar from "@/components/Avatar";
import { PanelHeader, EmptyState, Loading, Icon, formatDate, useTr } from "./shared";

interface Props {
  user: User;
}

export default function FollowingTab({ user }: Props) {
  void user;
  const tr = useTr();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<FollowingEntry[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getFollowing();
        if (alive) setEntries(Array.isArray(res.following) ? res.following : []);
      } catch (e) {
        addToast((e as Error).message || "Failed to load who you follow", "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [addToast]);

  async function handleUnfollow(followingId: string) {
    setBusyId(followingId);
    try {
      await unfollowUser(followingId);
      setEntries((prev) => prev.filter((e) => e.followingId !== followingId));
    } catch (e) {
      addToast((e as Error).message || "Could not unfollow", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.following.title", "Following")}
        subtitle={tr("dashboard.following.subtitle", "Sellers you follow — new listings and updates from them.")}
      />

      {loading ? (
        <Loading />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<Icon name="profile" size={22} />}
          title={tr("dashboard.following.empty", "You're not following any sellers yet")}
          subtitle={tr(
            "dashboard.following.emptyHint",
            "Follow a seller from their profile page to see their updates here."
          )}
          action={
            <Link href="/directory" className="btn btn-primary">
              {tr("dashboard.following.browse", "Browse Directory")}
            </Link>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {entries.map((e) => {
            const seller = e.user;
            const companyName = seller?.sellerProfile?.companyName || seller?.name || "Seller";
            const slug = seller?.sellerProfile?.slug;
            const location = [seller?.city, seller?.state].filter(Boolean).join(", ");
            return (
              <div
                key={e.followingId}
                className="card card-flat"
                style={{
                  padding: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <Avatar src={seller?.sellerProfile?.logo || seller?.avatarUrl} name={companyName} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {slug ? (
                    <Link
                      href={`/seller/${slug}`}
                      className="line-clamp-1"
                      style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--ink)" }}
                    >
                      {companyName}
                    </Link>
                  ) : (
                    <span className="line-clamp-1" style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--ink)" }}>
                      {companyName}
                    </span>
                  )}
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--faint)", marginTop: 2 }}>
                    {location && <span>{location} · </span>}
                    {tr("dashboard.following.since", "Following since")} {formatDate(e.createdAt)}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleUnfollow(e.followingId)}
                  disabled={busyId === e.followingId}
                  style={{ flexShrink: 0 }}
                >
                  {busyId === e.followingId
                    ? tr("dashboard.following.unfollowing", "Unfollowing…")
                    : tr("dashboard.following.unfollow", "Unfollow")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
