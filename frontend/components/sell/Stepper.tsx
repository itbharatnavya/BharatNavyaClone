"use client";

import React from "react";

export interface Step {
  key: string;
  label: string;
}

export default function Stepper({
  steps,
  current,
  onStepClick,
}: {
  steps: Step[];
  current: number; // 0-based index of the active step
  onStepClick?: (index: number) => void;
}) {
  return (
    <ol
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        listStyle: "none",
        margin: 0,
        padding: 0,
        flexWrap: "wrap",
      }}
    >
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const reachable = i <= current;
        return (
          <React.Fragment key={step.key}>
            <li>
              <button
                type="button"
                disabled={!reachable || !onStepClick}
                onClick={() => reachable && onStepClick?.(i)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "transparent",
                  border: "none",
                  cursor: reachable && onStepClick ? "pointer" : "default",
                  padding: "4px 2px",
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 600,
                    flexShrink: 0,
                    color: active || done ? "#fff" : "var(--muted)",
                    background: done
                      ? "var(--brand)"
                      : active
                      ? "var(--action)"
                      : "var(--bg-subtle)",
                    border:
                      active || done
                        ? "1px solid transparent"
                        : "1px solid var(--border-strong)",
                  }}
                >
                  {done ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    color: active
                      ? "var(--ink)"
                      : done
                      ? "var(--brand)"
                      : "var(--muted)",
                  }}
                >
                  {step.label}
                </span>
              </button>
            </li>
            {i < steps.length - 1 && (
              <li aria-hidden style={{ flex: 1, minWidth: 16 }}>
                <span
                  style={{
                    display: "block",
                    height: 1,
                    background: i < current ? "var(--brand)" : "var(--border)",
                  }}
                />
              </li>
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}
