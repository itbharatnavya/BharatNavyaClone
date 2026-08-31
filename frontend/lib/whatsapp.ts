// whatsapp.ts — click-to-WhatsApp deep-link helpers.
//
// India is a WhatsApp-first market, so buyers reach sellers on WhatsApp far more
// than by call or form. These helpers build wa.me links that open the chat with a
// useful, PRE-FILLED enquiry message (not just the number) — used by the listing
// seller card and the seller-profile header.
//
// Convention: a bare 10-digit mobile with no country code is assumed Indian (+91).

export interface WaLinkInput {
  phone?: string | null;
  text: string;
}

/**
 * Normalize a phone to WhatsApp digits (country code + number, no symbols).
 * A 10-digit number with no country code is assumed to be Indian (+91).
 * Returns null when there are no usable digits.
 */
export function waDigits(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/**
 * Build a wa.me deep link that opens WhatsApp with `text` pre-filled.
 * Returns null when `phone` yields no usable digits (caller can hide the button).
 */
export function waLink({ phone, text }: WaLinkInput): string | null {
  const digits = waDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export interface EnquiryTextInput {
  productTitle: string;
  price?: number | string | null;
  unit?: string | null;
  moq?: number | string | null;
  sellerName?: string | null;
  url?: string | null;
}

/** Format a numeric price the Indian way (grouping); leave a string as-is. */
function formatPrice(price: number | string): string {
  if (typeof price === "number" && Number.isFinite(price)) {
    return `₹${new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(price)}`;
  }
  return String(price).trim();
}

/**
 * A concise, professional pre-filled enquiry for a specific listing — one short
 * plain-text paragraph (no emoji).
 *
 * e.g. Hi Acme Steels, I'm interested in "Mild Steel Rod" (listed at ₹55 / kg)
 *      on BharatSource. Could you please share your best quote for a minimum order
 *      of 100 kg? Link: https://…
 */
export function enquiryText({
  productTitle,
  price,
  unit,
  moq,
  sellerName,
  url,
}: EnquiryTextInput): string {
  const name = sellerName && sellerName.trim() ? sellerName.trim() : "";
  const greeting = name ? `Hi ${name}, ` : "Hi, ";

  const title =
    productTitle && productTitle.trim() ? `"${productTitle.trim()}"` : "your product";
  const unitLabel = unit && String(unit).trim() ? String(unit).trim() : "";

  const hasPrice =
    price !== undefined && price !== null && String(price).trim() !== "";
  const priceFrag = hasPrice
    ? ` (listed at ${formatPrice(price as number | string)}${
        unitLabel ? ` / ${unitLabel}` : ""
      })`
    : "";

  const hasMoq = moq !== undefined && moq !== null && String(moq).trim() !== "";
  const moqFrag = hasMoq
    ? ` for a minimum order of ${String(moq).trim()}${unitLabel ? ` ${unitLabel}` : ""}`
    : "";

  const linkFrag = url && String(url).trim() ? ` Link: ${String(url).trim()}` : "";

  return `${greeting}I'm interested in ${title}${priceFrag} on BharatSource. Could you please share your best quote${moqFrag}?${linkFrag}`;
}

export interface SellerReplyTextInput {
  buyerName?: string | null;
  productName?: string | null;
}

/**
 * A concise message a SELLER sends when reaching out about an RFQ delivered
 * to them (the "Connect" action) — the reverse direction from enquiryText()
 * above (seller -> buyer, not buyer -> seller).
 */
export function sellerReplyText({ buyerName, productName }: SellerReplyTextInput): string {
  const name = buyerName && buyerName.trim() ? buyerName.trim() : "there";
  const what =
    productName && productName.trim()
      ? `your requirement for "${productName.trim()}"`
      : "your requirement";
  return `Hi ${name}, I saw ${what} on BharatSource and wanted to connect.`;
}
