import type { Metadata } from "next";
import EmptyState from "@/components/discovery/EmptyState";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="container-bs section-pad">
      <EmptyState
        headingLevel="h1"
        title="We couldn't find that page"
        message="The link may be wrong, or the page has moved. Search the Directory or go back home."
        actionLabel="Go to the Directory"
        actionHref="/directory"
      />
    </div>
  );
}
