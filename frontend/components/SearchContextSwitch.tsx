"use client";

import Link from "next/link";

export default function SearchContextSwitch({ destination, query, city }: { destination: "directory" | "recruitment"; query: string; city?: string }) {
  if (!query.trim()) return null;
  const params = new URLSearchParams({ q: query, source: "context-switch" });
  if (city) params.set("city", city);
  const directory = destination === "directory";
  return <aside className="bn-context-switch" aria-label="Search in the other section"><span>{directory ? "Looking for a company or service instead?" : "Looking for a role or hiring opportunity instead?"}</span><Link href={`${directory ? "/search" : "/recruitment/jobs"}?${params.toString()}`}>Search {directory ? "Directory" : "Recruitment"}</Link></aside>;
}
