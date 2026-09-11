"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getListings } from "@/lib/api";
import type { Listing } from "@/lib/types";

function formatPrice(listing: Listing) {
  const price = listing.product?.price ?? listing.product?.priceTiers?.[0]?.price;
  if (price == null) return "Ask price";
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(price)}`;
}

function sellerName(listing: Listing) {
  return listing.seller?.companyName || listing.seller?.name || listing.sellerName || "Listed company";
}

function locationLabel(listing: Listing) {
  if (listing.panIndia) return "Pan India";
  return [listing.location?.city, listing.location?.state].filter(Boolean).join(", ") || "India";
}

export default function ProductListingRail() {
  const [products, setProducts] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getListings({ type: "product", sort: "newest", limit: 7 })
      .then((result) => {
        if (active) setProducts((result.listings || []).filter((listing) => listing.type === "product"));
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="counter-product-loading" aria-label="Loading product listings">
        {Array.from({ length: 4 }).map((_, index) => <span key={index} />)}
      </div>
    );
  }

  if (error || products.length === 0) {
    return (
      <div className="le-empty">
        Product listings are temporarily unavailable. Company and service discovery remains ready.
      </div>
    );
  }

  return (
    <ul className="counter-product-list" role="list">
      {products.map((listing, index) => {
        const image = listing.media?.find((item) => item.type !== "video")?.url || listing.media?.[0]?.url;
        const unit = listing.product?.unitOfMeasure;
        const moq = listing.product?.moq;
        return (
          <li key={listing.id} className={index === 0 ? "is-featured" : undefined}>
            <Link className="counter-product-card" href={`/listing/${listing.id}`}>
              <div className="counter-product-media">
                {image ? <img src={image} alt="" loading="lazy" /> : <span aria-hidden>Product</span>}
                <span className="counter-product-type">Product listing</span>
              </div>
              <div className="counter-product-copy">
                <div>
                  <h3>{listing.title}</h3>
                  <p>{sellerName(listing)} · {locationLabel(listing)}</p>
                </div>
                <dl>
                  <div><dt>Price</dt><dd>{formatPrice(listing)}{unit && listing.product?.price != null ? ` / ${unit}` : ""}</dd></div>
                  <div><dt>Minimum</dt><dd>{moq != null ? `${moq} ${unit || "units"}` : "Confirm with seller"}</dd></div>
                </dl>
                <span className="counter-product-action">Inspect listing <span aria-hidden>→</span></span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
