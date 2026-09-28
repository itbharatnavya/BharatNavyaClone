"use client";

// The homepage's featured module. Bharat Agent has no live destination yet, so
// this is a large, non-clickable preview panel rather than a card in a grid —
// it earns its prominence through scale and the animated chat-mock signature,
// not a button. The mock is a two-line exchange (never a functional input) that
// shows what the agent will do: read intent, route it across the suite.

import React from "react";
import Reveal from "@/components/Reveal";
import { AgentIcon } from "./icons";

export default function BharatAgentPanel() {
  return (
    <div
      className="card card-flat"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 20,
        borderColor: "#e8ecf3",
        padding: "clamp(24px, 4vw, 40px)",
        background:
          "radial-gradient(120% 140% at 100% 0%, var(--action-tint) 0%, rgba(255,247,237,0) 55%)," +
          "radial-gradient(120% 140% at 0% 100%, var(--brand-tint) 0%, rgba(239,246,255,0) 55%)," +
          "var(--canvas)",
      }}
    >
      <div className="agent-panel-grid">
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <span
              aria-hidden
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#ffffff",
                border: "1px solid var(--border)",
                color: "var(--action)",
                boxShadow: "var(--shadow-card)",
                flexShrink: 0,
              }}
            >
              <AgentIcon size={22} />
            </span>
            <span
              className="badge"
              style={{ background: "var(--action-tint)", color: "var(--action-hover)", borderColor: "#fed7aa" }}
            >
              In development
            </span>
          </div>

          <h2
            style={{
              fontSize: "clamp(24px, 3.2vw, 32px)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              lineHeight: 1.12,
            }}
          >
            Bharat Agent
          </h2>
          <p style={{ fontSize: 15.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.65, maxWidth: 440 }}>
            One assistant for the whole suite. Tell it what you&apos;re trying to get done and it works out whether that&apos;s a supplier to source, a role to fill, or an expert to hire — then takes you straight there.
          </p>
          <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 16 }}>
            Launching in stages across Bharat Navya.
          </p>
        </div>

        <ChatMock />
      </div>
    </div>
  );
}

function ChatMock() {
  return (
    <Reveal delay={120}>
      <div aria-hidden style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          className="chat-bubble"
          style={{
            alignSelf: "flex-end",
            maxWidth: "88%",
            background: "#ffffff",
            border: "1px solid var(--border)",
            borderRadius: "14px 14px 4px 14px",
            padding: "10px 14px",
            fontSize: 13.5,
            color: "var(--ink)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          Find a GST consultant in Pune
        </div>
        <div
          className="chat-bubble"
          style={{
            animationDelay: "220ms",
            alignSelf: "flex-start",
            maxWidth: "92%",
            background: "var(--brand-tint)",
            border: "1px solid #d3e2f7",
            borderRadius: "14px 14px 14px 4px",
            padding: "10px 14px",
            fontSize: 13.5,
            color: "var(--brand-hover)",
          }}
        >
          Matching you with 12 verified experts near you…
        </div>
        <div className="chat-bubble" style={{ animationDelay: "420ms", alignSelf: "flex-start", display: "inline-flex", gap: 4, padding: "6px 14px" }}>
          <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--faint)" }} />
          <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--faint)", animationDelay: "0.15s" }} />
          <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--faint)", animationDelay: "0.3s" }} />
        </div>
      </div>
    </Reveal>
  );
}
