"use client";

// AdControls — the same controls on every ad slot: previous / next arrows on the sides of the
// picture, and one small pill with the position + a pause button. The pill never grows with the
// number of ads: up to 5 ads it shows dots, beyond that a fixed-width "3 / 24" counter with a
// thin position bar (so 6 ads and 600 ads take exactly the same room).

interface Props {
  count: number;
  index: number;
  paused: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (i: number) => void;
  onTogglePause: () => void;
}

export const AD_DOTS_MAX = 5;

const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

export default function AdControls({ count, index, paused, onPrev, onNext, onGoTo, onTogglePause }: Props) {
  if (count <= 1) return null;
  return (
    <>
      <button type="button" className="bn-ad-arrow is-prev" aria-label="Previous promotion" onClick={onPrev}>
        <Svg><path d="M15 18l-6-6 6-6" /></Svg>
      </button>
      <button type="button" className="bn-ad-arrow is-next" aria-label="Next promotion" onClick={onNext}>
        <Svg><path d="M9 18l6-6-6-6" /></Svg>
      </button>
      <div className="bn-ad-dots bn-ad-ctrl" role="group" aria-label="Promotion controls">
        {count <= AD_DOTS_MAX ? (
          <span className="bn-ad-dotrow">
            {Array.from({ length: count }, (_, i) => (
              <button key={i} type="button" aria-label={`Show promotion ${i + 1} of ${count}`} aria-pressed={i === index} onClick={() => onGoTo(i)} />
            ))}
          </span>
        ) : (
          <span className="bn-ad-count" aria-label={`Promotion ${index + 1} of ${count}`}>
            {index + 1} / {count}
            <i style={{ width: `${((index + 1) / count) * 100}%` }} />
          </span>
        )}
        <button type="button" className="bn-ad-pause" aria-label={paused ? "Resume rotation" : "Pause rotation"} aria-pressed={paused} onClick={onTogglePause}>
          {paused ? <Svg><path d="M8 5l11 7-11 7z" /></Svg> : <Svg><path d="M9 5v14M15 5v14" /></Svg>}
        </button>
      </div>
    </>
  );
}
