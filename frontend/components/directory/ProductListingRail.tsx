"use client";

import { useEffect, useState } from "react";
import ListingCard from "@/components/ListingCard";
import { getListings } from "@/lib/api";
import type { Listing } from "@/lib/types";

export default function ProductListingRail() {
  const [products, setProducts] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getListings({ type: "product", sort: "newest", limit: 8 })
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
      <div className="bn-product-grid is-loading" aria-label="Loading product listings">
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
    <ul className="bn-product-grid" role="list">
      {products.map((listing) => <li key={listing.id}><ListingCard listing={listing} /></li>)}
    </ul>
  );
}
