"use client";

import React from "react";
import type { User } from "@/lib/types";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { PanelHeader, StatCard, EmptyState, Icon, formatDate, formatINR, useTr } from "./shared";

interface Props {
  user: User;
}

const TIER_LABEL: Record<string, string> = {
  free: "Free",
  silver: "Silver",
  gold: "Gold",
};

export default function SubscriptionTab({ user }: Props) {
  const tr = useTr();
  const sp = user.sellerProfile;

  if (!sp) {
    return (
      <div>
        <PanelHeader
          title={tr("dashboard.subscription.title", "Subscription")}
          subtitle={tr("dashboard.subscription.subtitle", "Manage your plan and lead quota.")}
        />
        <EmptyState
          icon={<Icon name="subscription" size={22} />}
          title={tr("dashboard.subscription.noSeller", "You're not a seller yet")}
          subtitle={tr(
            "dashboard.subscription.noSellerHint",
            "Set up a seller profile from the Profile tab to unlock plans."
          )}
        />
      </div>
    );
  }

  const tier = sp.planTier || "free";

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.subscription.title", "Subscription")}
        subtitle={tr("dashboard.subscription.subtitle", "Manage your plan and lead quota.")}
      />

      <div
        className="card card-flat"
        style={{
          padding: 22,
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          background: "linear-gradient(180deg, var(--brand-tint), #fff)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--r-sm)",
              background: "var(--brand)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="subscription" size={24} />
          </div>
          <div>
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {tr("dashboard.subscription.current", "Current plan")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: "var(--fs-xl)", fontWeight: 700, color: "var(--ink)" }}>
                {TIER_LABEL[tier] || tier}
              </span>
              {sp.planStatus && (
                <Badge variant={sp.planStatus === "active" ? "new" : "neutral"}>{sp.planStatus}</Badge>
              )}
            </div>
          </div>
        </div>
        {sp.planEndDate && (
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
            {tr("dashboard.subscription.renews", "Valid till")} <strong>{formatDate(sp.planEndDate)}</strong>
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label={tr("dashboard.subscription.listingLimit", "Listing limit")}
          value={sp.listingLimit ?? "∞"}
          icon={<Icon name="listings" size={18} />}
        />
        <StatCard
          label={tr("dashboard.subscription.leadQuota", "Lead quota")}
          value={
            sp.leadQuotaPerCycle != null
              ? `${sp.leadsConsumed}/${sp.leadQuotaPerCycle}`
              : String(sp.leadsConsumed ?? 0)
          }
          accent="var(--success)"
          hint={sp.leadQuotaResetDate ? `Resets ${formatDate(sp.leadQuotaResetDate)}` : undefined}
          icon={<Icon name="leads" size={18} />}
        />
        <StatCard
          label={tr("dashboard.subscription.featuredCredits", "Featured credits")}
          value={sp.featuredCredits ?? 0}
          accent="var(--action)"
          icon={<Icon name="stories" size={18} />}
        />
        {sp.perLeadPrice != null && (
          <StatCard
            label={tr("dashboard.subscription.perLead", "Per-lead price")}
            value={formatINR(sp.perLeadPrice)}
            icon={<Icon name="subscription" size={18} />}
          />
        )}
      </div>
    </div>
  );
}
