"use client";

// Recruitment — a "Coming soon" teaser page, same pattern as /credit-card and
// /mutual. Defined locally rather than added to components/suite/products.tsx
// on purpose: that PRODUCTS array also drives the Navbar and Footer product
// lists, and Recruitment is a homepage-only module for now, not a suite-wide
// nav entry.

import React from "react";
import ComingSoon from "@/components/suite/ComingSoon";
import type { SuiteProduct } from "@/components/suite/products";
import { RecruitmentIcon } from "@/components/home/icons";

const product: SuiteProduct = {
  key: "recruitment",
  name: "Recruitment",
  fullName: "BharatSource Recruitment",
  href: "/recruitment",
  tagline: "Post roles and connect with vetted candidates across India.",
  status: "soon",
  Icon: RecruitmentIcon,
};

export default function RecruitmentPage() {
  return <ComingSoon product={product} />;
}
