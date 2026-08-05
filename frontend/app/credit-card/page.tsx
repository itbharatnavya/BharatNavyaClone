"use client";

// Credit Card — a "Coming soon" teaser product page in the BharatSource suite.
// No functionality: an on-brand hero, a "Coming soon" badge, a Notify/Talk-to-us
// mailto CTA and a route back to all products, all via the shared ComingSoon.

import React from "react";
import ComingSoon from "@/components/suite/ComingSoon";
import { PRODUCTS } from "@/components/suite/products";

const product = PRODUCTS.find((p) => p.key === "credit-card")!;

export default function CreditCardPage() {
  return <ComingSoon product={product} />;
}
