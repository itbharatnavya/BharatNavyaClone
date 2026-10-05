// When a row expands in place, the row that was open above it collapses and everything shifts, so the
// newly opened item can end up above the visible screen. Bring it back under the floating header.
// A second pass corrects any drift once the collapse and image loads have settled.
export function scrollToExpanded(el: Element | null | undefined, headerOffset = 96) {
  if (!el || typeof window === "undefined") return;
  let moved = false;
  window.setTimeout(() => {
    const top = el.getBoundingClientRect().top;
    if (top < headerOffset - 4 || top > window.innerHeight * 0.6) {
      moved = true;
      window.scrollTo({ top: window.scrollY + top - headerOffset, behavior: "smooth" });
    }
  }, 60);
  window.setTimeout(() => {
    if (!moved) return;
    const top = el.getBoundingClientRect().top;
    if (Math.abs(top - headerOffset) > 24) window.scrollTo({ top: window.scrollY + top - headerOffset, behavior: "instant" as ScrollBehavior });
  }, 800);
}
