"use client";

import { useState } from "react";

export type DecisionJourneyStep = {
  label: string;
  detail: string;
};

type DecisionJourneyProps = {
  id: string;
  title: string;
  context: "directory" | "recruitment";
  steps: DecisionJourneyStep[];
};

export default function DecisionJourney({ id, title, context, steps }: DecisionJourneyProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStep = steps[activeIndex];

  if (!activeStep) return null;

  return (
    <section className={`bn-decision-journey is-${context}`} aria-labelledby={id}>
      <div className="le-shell">
        <header className="bn-decision-journey-head">
          <h2 id={id}>{title}</h2>
          <span aria-hidden>
            {String(activeIndex + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
          </span>
        </header>

        <div className="bn-decision-journey-track" aria-label={`${title} stages`}>
          {steps.map((step, index) => (
            <button
              type="button"
              key={step.label}
              aria-pressed={activeIndex === index}
              aria-controls={`${id}-detail`}
              onClick={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <b>{String(index + 1).padStart(2, "0")}</b>
              <span>{step.label}</span>
            </button>
          ))}
        </div>

        <article id={`${id}-detail`} className="bn-decision-journey-focus" aria-live="polite">
          <span className="bn-decision-journey-mark" aria-hidden>
            {String(activeIndex + 1).padStart(2, "0")}
          </span>
          <div>
            <h3>{activeStep.label}</h3>
            <p>{activeStep.detail}</p>
          </div>
          <svg aria-hidden viewBox="0 0 64 24">
            <path d="M1 12h59M49 2l11 10-11 10" />
          </svg>
        </article>
      </div>
    </section>
  );
}
