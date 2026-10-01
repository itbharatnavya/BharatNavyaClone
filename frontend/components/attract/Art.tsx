// Small decorative illustrations for feature cards. Pure SVG; every animation is CSS
// (transform, opacity, stroke-dashoffset) and runs only once the card has the
// `is-live` class (added by FeatureCards when it scrolls into view) so reduced motion
// and no-JS get the still frame. Styles: .art-* in app/counter-soft-system.css.

export type ArtName = "radar" | "tracker" | "funnel" | "shield" | "fanout";

const FALL = [52, 76, 100, 124, 148, 172, 196];
const ROWS = [34, 60, 86, 112];
const CHIPS = ["Applied", "Viewed", "Shortlisted", "Hired"];
const BOXES = [24, 66, 108];

export default function Art({ name }: { name: ArtName }) {
  return <svg className={`art art-${name}`} viewBox="0 0 240 150" aria-hidden focusable="false">
    {name === "radar" && <>
      <defs><linearGradient id="art-sweep" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2556c8" stopOpacity="0.05" /><stop offset="1" stopColor="#2556c8" stopOpacity="0.4" /></linearGradient></defs>
      {[20, 40, 60].map((r) => <circle key={r} cx="120" cy="75" r={r} className="art-ring" />)}
      <line x1="60" y1="75" x2="180" y2="75" className="art-ring" /><line x1="120" y1="15" x2="120" y2="135" className="art-ring" />
      <g className="art-sweep"><path d="M120 75 L120 15 A60 60 0 0 1 172 45 Z" fill="url(#art-sweep)" /></g>
      <circle cx="152" cy="52" r="5" fill="#ffbe2e" className="art-blink" style={{ animationDelay: "0.2s" }} />
      <circle cx="92" cy="52" r="4" fill="#2556c8" className="art-blink" style={{ animationDelay: "1.4s" }} />
      <circle cx="146" cy="100" r="4" fill="#2556c8" className="art-blink" style={{ animationDelay: "2.2s" }} />
      <circle cx="98" cy="98" r="4" fill="#2556c8" className="art-blink" style={{ animationDelay: "3s" }} />
      <circle cx="120" cy="75" r="7" fill="#1b3fa0" /><circle cx="120" cy="75" r="7" className="art-ping" />
    </>}
    {name === "tracker" && <>
      <rect x="22" y="12" width="136" height="126" rx="12" fill="#fff" stroke="#b9cce6" />
      {ROWS.map((y, i) => <g key={y}>
        <circle cx="42" cy={y} r="6" fill="#dbe4fb" />
        <circle cx="42" cy={y} r="6" fill="#1b3fa0" className="art-step" style={{ animationDelay: `${i * 0.9}s` }} />
        <rect x="56" y={y - 4} width={[84, 64, 76, 52][i]} height="8" rx="4" fill="#dbe4fb" />
      </g>)}
      <rect x="28" y="24" width="124" height="2" rx="1" fill="#2556c8" className="art-scan" />
      {CHIPS.map((label, i) => <g key={label} className="art-chip" style={{ animationDelay: `${i * 0.9}s` }}>
        <rect x="150" y={ROWS[i] - 11} width="76" height="22" rx="11" fill="#dbe4fb" stroke="#9db8ff" />
        <text x="188" y={ROWS[i] + 4} textAnchor="middle" className="art-text">{label}</text>
      </g>)}
    </>}
    {name === "funnel" && <>
      <path d="M32 32 H208 L144 88 V120 H96 V88 Z" fill="#dbe4fb" fillOpacity="0.6" stroke="#9db8ff" strokeLinejoin="round" />
      {FALL.map((x, i) => <circle key={x} cx={x} cy="16" r="6" fill={i === 2 || i === 5 ? "#ffbe2e" : "#9db8ff"} className="art-fall" style={{ ["--dx" as string]: `${120 - x}px`, animationDelay: `${i * 0.32}s` }} />)}
      <rect x="64" y="134" width="112" height="6" rx="3" fill="#dbe4fb" />
      <rect x="64" y="134" width="112" height="6" rx="3" fill="#1b3fa0" className="art-fill" />
    </>}
    {name === "shield" && <>
      <circle cx="120" cy="78" r="50" className="art-ping is-slow" />
      <path d="M120 18 L176 38 V80 C176 108 152 128 120 140 C88 128 64 108 64 80 V38 Z" fill="#dbe4fb" stroke="#1b3fa0" strokeWidth="2" strokeLinejoin="round" />
      <path d="M95 80 l17 17 l33 -37" pathLength="100" fill="none" stroke="#1b3fa0" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" className="art-draw" />
      <g className="art-doc" style={{ animationDelay: "0s" }}><rect x="14" y="42" width="34" height="44" rx="6" fill="#fff" stroke="#b9cce6" /><rect x="21" y="52" width="20" height="4" rx="2" fill="#9db8ff" /><rect x="21" y="62" width="14" height="4" rx="2" fill="#dbe4fb" /></g>
      <g className="art-doc" style={{ animationDelay: "0.6s" }}><rect x="192" y="60" width="34" height="44" rx="6" fill="#fff" stroke="#b9cce6" /><rect x="199" y="70" width="20" height="4" rx="2" fill="#9db8ff" /><rect x="199" y="80" width="14" height="4" rx="2" fill="#dbe4fb" /></g>
    </>}
    {name === "fanout" && <>
      {BOXES.map((y, i) => <g key={y}>
        <line x1="62" y1="75" x2="186" y2={y + 17} className="art-wire" />
        <line x1="62" y1="75" x2="186" y2={y + 17} pathLength="100" className="art-signal" style={{ animationDelay: `${i * 0.5}s` }} />
        <rect x="186" y={y} width="40" height="34" rx="9" fill="#fff" stroke="#b9cce6" />
        <rect x="193" y={y + 9} width="18" height="4" rx="2" fill="#9db8ff" /><rect x="193" y={y + 18} width="12" height="4" rx="2" fill="#dbe4fb" />
        <g className="art-tick" style={{ animationDelay: `${0.9 + i * 0.5}s` }}><circle cx="222" cy={y + 2} r="8" fill="#ffbe2e" /><path d={`m218 ${y + 2} 3 3 5 -6`} fill="none" stroke="#12141b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
      </g>)}
      <circle cx="44" cy="75" r="22" fill="#fff" stroke="#1b3fa0" strokeWidth="2" />
      <circle cx="44" cy="69" r="6" fill="#1b3fa0" /><path d="M32 90 a12 10 0 0 1 24 0z" fill="#1b3fa0" />
    </>}
  </svg>;
}
