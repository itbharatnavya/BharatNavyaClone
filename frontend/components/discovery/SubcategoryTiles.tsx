"use client";

// SubcategoryTiles: "Browse related categories" on a category page. One photo tile
// per child category (shared resolver in lib/categoryImages, so every tile has a
// photo), name and listing count underneath rather than over the picture.
// Renders nothing when there are no children.

import Link from "next/link";
import type { Category } from "@/lib/types";
import { imgFor } from "@/lib/categoryImages";

export default function SubcategoryTiles({ items }: { items: Category[] }) {
  if (!items || items.length === 0) return null;

  return (
    <section className="bn-sub counter-category-module counter-subcategory-module" aria-labelledby="bn-sub-title">
      <h2 id="bn-sub-title">Browse related categories</h2>
      <ul className="bn-sub-grid">
        {items.map((category, index) => (
          <li key={category.id || category.slug}>
            <Link href={`/${category.slug}`} className="bn-sub-tile">
              <span className="bn-sub-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/demo/${imgFor(category, index)}.jpg`} alt="" loading="lazy" />
              </span>
              <span className="bn-sub-copy">
                <strong>{category.name}</strong>
                {typeof category.listingCount === "number" && category.listingCount > 0 && <small>{category.listingCount} {category.listingCount === 1 ? "listing" : "listings"}</small>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
