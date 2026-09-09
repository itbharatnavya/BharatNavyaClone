import Link from "next/link";
import Avatar from "@/components/Avatar";
import EvidenceMedia from "./EvidenceMedia";
import type { EvidenceAsset } from "@/lib/livingEvidence";

export default function EvidenceRecord({ href, title, meta, detail, logo, media, label }: { href: string; title: string; meta: string; detail?: string; logo?: string | null; media?: EvidenceAsset; label?: string }) {
  return <Link href={href} className="le-evidence-record">{media ? <EvidenceMedia asset={media} ratio="wide" /> : <Avatar src={logo || undefined} name={title} size={48} />}<span>{label && <small>{label}</small>}<strong>{title}</strong><span>{meta}</span>{detail && <p>{detail}</p>}</span><b aria-hidden>→</b></Link>;
}
