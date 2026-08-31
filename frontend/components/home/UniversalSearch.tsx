"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchDock } from "@/lib/searchDock";
import { classifyUniversalSearch, type SearchDestination, universalSearchHref } from "@/lib/productDesign";

const examples = ["GST consultant in Ahmedabad", "Operations manager jobs", "Food-safe packaging company", "Remote product design roles"];

function SearchIcon() { return <svg aria-hidden viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>; }
function ArrowIcon() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>; }

export default function UniversalSearch() {
  const router = useRouter();
  const dock = useSearchDock();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);

  function navigate(destination: SearchDestination, value = query) {
    const intent = { ...classifyUniversalSearch(value), destination };
    if (destination === "directory") dock.setQuery(intent.query);
    else dock.setRoleQuery(intent.query);
    dock.markSearchNav();
    router.push(universalSearchHref(intent));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const intent = classifyUniversalSearch(query);
    if (!intent.query) { setError("Tell us what you need or the role you are looking for."); return; }
    setError("");
    if (intent.confidence === "low") { setChoiceOpen(true); return; }
    navigate(intent.destination);
  }

  function chooseExample(value: string) {
    setQuery(value); setError("");
    const intent = classifyUniversalSearch(value);
    if (intent.confidence === "high") navigate(intent.destination, value);
    else setChoiceOpen(true);
  }

  return (
    <div className="bn-universal-search">
      <form onSubmit={submit} role="search" aria-label="Search Bharat Navya">
        <SearchIcon />
        <label className="sr-only" htmlFor="universal-search">Search companies, services or jobs</label>
        <input id="universal-search" value={query} onChange={(event) => { setQuery(event.target.value); setError(""); setChoiceOpen(false); }} placeholder="Try ‘GST consultant in Ahmedabad’ or ‘operations jobs’" aria-describedby={error ? "universal-search-error" : undefined} aria-invalid={Boolean(error)} />
        <button type="submit" aria-label="Search"><ArrowIcon /></button>
      </form>
      {error && <p id="universal-search-error" className="bn-search-error" role="alert">{error}</p>}
      {choiceOpen && <div className="bn-search-choice" role="group" aria-label="Choose where to search"><span>Where should we search?</span><button type="button" onClick={() => navigate("directory")}>Companies &amp; services</button><button type="button" onClick={() => navigate("recruitment")}>Jobs &amp; hiring</button></div>}
      <div className="bn-search-examples" aria-label="Example searches"><span>Try</span>{examples.map((example) => <button key={example} type="button" onClick={() => chooseExample(example)}>{example}</button>)}</div>
    </div>
  );
}
