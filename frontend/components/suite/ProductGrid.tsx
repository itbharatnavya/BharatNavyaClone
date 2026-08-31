"use client";

// The centrepiece of the suite homepage: the four BharatSource products as a
// clean, responsive card grid. auto-fit + minmax keeps it 4-up on
// desktop and gracefully collapses to 1-up at 390px with zero horizontal spill.

import React from "react";
import ProductCard from "./ProductCard";
import { PRODUCTS } from "./products";

export default function ProductGrid() {
  return (
    <div
      style={{
        display: "grid",
        gap: "clamp(16px, 2.4vw, 24px)",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      }}
    >
      {PRODUCTS.map((p) => (
        <ProductCard key={p.key} product={p} />
      ))}
    </div>
  );
}
