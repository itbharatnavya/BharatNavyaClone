"use client";

// CategoryStrip — the Directory's persistent second nav row:
// a dark strip directly under the main header holding only the "All
// Categories" trigger (CategoryMegaMenu's left-rail + hover subcategory
// flyout). Previously also rendered a handful of top-level categories as
// separate inline links next to the trigger — dropped per product direction:
// "All Categories" is the single entry point, all categories (including
// sub-categories on hover) live inside that one menu. Replaces the old
// row-1 CategoryMegaMenu placement — see Navbar.tsx and
// frontend-design-guide.md. Desktop-only (>=900px, the "nav:" breakpoint);
// mobile keeps MobileCategoryAccordion inside the hamburger menu, which has
// always been the mobile-appropriate pattern here.

import React from "react";
import CategoryMegaMenu from "@/components/CategoryMegaMenu";

export default function CategoryStrip() {
  return (
    <div className="hidden nav:block category-strip">
      <div className="container-bs category-strip-row">
        <CategoryMegaMenu />
      </div>
    </div>
  );
}
