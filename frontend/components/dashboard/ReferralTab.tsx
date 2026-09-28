"use client";

import React, { useEffect, useState } from "react";
import type { User } from "@/lib/types";
import { getReferralCode, redeemReferral } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { PanelHeader, StatCard, Loading, Icon, useTr, type ReferralInfo } from "./shared";

interface Props {
  user: User;
}

export default function ReferralTab({ user }: Props) {
  void user;
  const tr = useTr();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [redeem, setRedeem] = useState("");
  const [busy, setBusy] = useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = (await getReferralCode()) as unknown as ReferralInfo;
      setInfo(res);
    } catch (e) {
      addToast((e as Error).message || "Failed to load referral", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const code = info?.code || "";
  const shareUrl =
    info?.shareUrl ||
    (typeof window !== "undefined" && code
      ? `${window.location.origin}/register?ref=${encodeURIComponent(code)}`
      : "");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      addToast(tr("dashboard.referral.copied", "Code copied"), "success");
    } catch {
      addToast(tr("dashboard.referral.copyFail", "Could not copy"), "error");
    }
  }

  function share() {
    const text = tr(
      "dashboard.referral.shareText",
      `Join me on Bharat Navya — use my code ${code}`
    );
    const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`)}`;
    window.open(wa, "_blank", "noopener,noreferrer");
  }

  async function submitRedeem() {
    const c = redeem.trim();
    if (!c) return;
    setBusy(true);
    try {
      await redeemReferral(c);
      addToast(tr("dashboard.referral.redeemed", "Referral redeemed!"), "success");
      setRedeem("");
      void load();
    } catch (e) {
      addToast((e as Error).message || "Redeem failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.referral.title", "Refer & earn")}
        subtitle={tr("dashboard.referral.subtitle", "Share your code and earn credits when friends join.")}
      />

      {loading ? (
        <Loading />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            <StatCard
              label={tr("dashboard.referral.credits", "Your credits")}
              value={info?.credits ?? 0}
              accent="var(--success)"
              icon={<Icon name="referral" size={18} />}
            />
            {typeof info?.referredCount === "number" && (
              <StatCard
                label={tr("dashboard.referral.referred", "Friends referred")}
                value={info.referredCount}
                icon={<Icon name="profile" size={18} />}
              />
            )}
          </div>

          <div className="card card-flat" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
              {tr("dashboard.referral.yourCode", "Your referral code")}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
              <code
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "var(--brand)",
                  background: "var(--brand-tint)",
                  border: "1px dashed #bfdbfe",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {code || "—"}
              </code>
              <Button variant="secondary" onClick={copyCode} disabled={!code} leftIcon={<Icon name="copy" size={15} />}>
                {tr("common.copy", "Copy")}
              </Button>
              <Button variant="brand" onClick={share} disabled={!code} leftIcon={<Icon name="share" size={15} />}>
                {tr("common.share", "Share")}
              </Button>
            </div>
          </div>

          <div className="card card-flat" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginBottom: 10 }}>
              {tr("dashboard.referral.haveCode", "Have a referral code?")}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <Input
                containerClassName="grow"
                value={redeem}
                onChange={(e) => setRedeem(e.target.value)}
                placeholder={tr("dashboard.referral.enterCode", "Enter code")}
              />
              <Button variant="primary" onClick={submitRedeem} disabled={busy || !redeem.trim()}>
                {busy ? tr("common.redeeming", "Redeeming…") : tr("dashboard.referral.redeem", "Redeem")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
