"use client";

// Leaflet + OpenStreetMap map of listing locations. No API key.
// Leaflet is imported dynamically inside the effect so it never touches the
// server (it references `window` on load); markers use HTML divIcons so we avoid
// the classic broken default-marker-image problem with bundlers.

import React, { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Listing } from "@/lib/types";
import { coordsForCity } from "./cityCoords";

export interface MapViewProps {
  listings: Listing[];
  height?: number;
}

type LatLng = [number, number];

function fmtINR(n: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

function priceLabel(l: Listing): string {
  if (l.type === "service") {
    const r = l.service?.rateCard?.[0];
    return r ? `₹${fmtINR(r.price)}` : "Enquire";
  }
  const p = l.product;
  if (p?.price != null) return `₹${fmtINR(p.price)}`;
  if (p?.priceTiers && p.priceTiers[0]) return `₹${fmtINR(p.priceTiers[0].price)}`;
  return "Ask Price";
}

function coordsFor(l: Listing): LatLng | null {
  const loc = (l.location || {}) as { city?: string; lat?: number; lng?: number };
  if (typeof loc.lat === "number" && typeof loc.lng === "number") {
    return [loc.lat, loc.lng];
  }
  return coordsForCity(loc.city);
}

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c];
  });
}

export default function MapView({ listings, height = 520 }: MapViewProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;

      map = L.map(ref.current, { scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const points: LatLng[] = [];
      listings.forEach((l) => {
        const c = coordsFor(l);
        if (!c) return;
        const icon = L.divIcon({
          className: "bs-map-pin",
          html:
            `<div style="background:#2563eb;color:#fff;font-size:11px;font-weight:700;` +
            `padding:4px 9px;border-radius:999px;box-shadow:0 2px 6px rgba(15,23,42,.35);` +
            `white-space:nowrap;transform:translate(-50%,-100%)">${esc(priceLabel(l))}</div>`,
          iconSize: [1, 1],
          iconAnchor: [0, 0],
        });
        const marker = L.marker(c, { icon }).addTo(map!);
        marker.bindPopup(
          `<div style="font-size:13px;max-width:220px;line-height:1.4">` +
            `<a href="/listing/${l.id}" style="color:#2563eb;font-weight:600;text-decoration:none">${esc(
              l.title
            )}</a>` +
            `<div style="color:#475569;margin-top:3px">${esc(priceLabel(l))}${
              l.location?.city ? " · " + esc(l.location.city) : ""
            }</div></div>`
        );
        points.push(c);
      });

      if (points.length > 0) {
        map.fitBounds(points, { padding: [40, 40], maxZoom: 12 });
      } else {
        map.setView([22.9734, 78.6569], 4); // geographic center of India
      }
      // ensure correct sizing after the container settles
      setTimeout(() => map && map.invalidateSize(), 80);
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [listings]);

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Map of listings"
      style={{
        height,
        maxHeight: "72vh",
        width: "100%",
        maxWidth: "100%",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--bg-subtle)",
        zIndex: 0,
      }}
    />
  );
}
