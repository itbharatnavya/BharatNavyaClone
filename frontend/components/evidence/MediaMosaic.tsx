import EvidenceMedia from "./EvidenceMedia";
import type { EvidenceAsset } from "@/lib/livingEvidence";

export default function MediaMosaic({ assets, label = "Visual evidence" }: { assets: EvidenceAsset[]; label?: string }) {
  return <div className="bn-media-mosaic" aria-label={label}>{assets.slice(0, 3).map((asset, index) => <EvidenceMedia key={`${asset.src}-${index}`} asset={asset} ratio={index === 0 ? "wide" : "landscape"} />)}</div>;
}
