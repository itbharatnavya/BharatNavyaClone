// Shared client-side form state for the /sell create-listing flow.
// These are the *editing* shapes (strings for number inputs); the sell page
// maps them into the API's ProductDetail / ServiceDetail on submit.

import type { PriceTier, RateCardItem, PricingModel } from "@/lib/types";

export type ProductCondition = "new" | "used" | "refurbished";

export interface ProductFormState {
  price: string;
  currency: string;
  unitOfMeasure: string;
  moq: string;
  condition: ProductCondition;
  priceTiers: PriceTier[];
  specifications: Record<string, string>;
}

export interface ServiceFormState {
  pricingModel: PricingModel;
  rateCard: RateCardItem[];
  serviceArea: string[];
  credentials: string[];
  experienceYears: string;
  availabilitySchedule: string;
}

export const initialProduct = (): ProductFormState => ({
  price: "",
  currency: "INR",
  unitOfMeasure: "",
  moq: "",
  condition: "new",
  priceTiers: [],
  specifications: {},
});

export const initialService = (): ServiceFormState => ({
  pricingModel: "quote",
  rateCard: [],
  serviceArea: [],
  credentials: [],
  experienceYears: "",
  availabilitySchedule: "",
});
