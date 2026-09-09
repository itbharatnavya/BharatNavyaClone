export interface TimelineItem {
  label: string;
  detail: string;
  state?: "complete" | "current" | "pending";
}

export default function StatusTimeline({ items, label = "Hiring process" }: { items: TimelineItem[]; label?: string }) {
  return <ol className="bn-status-timeline" aria-label={label}>{items.map((item) => <li key={item.label} className={`is-${item.state || "pending"}`}><span aria-hidden /><div><strong>{item.label}</strong><p>{item.detail}</p></div></li>)}</ol>;
}
