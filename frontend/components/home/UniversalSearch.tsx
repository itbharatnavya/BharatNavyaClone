"use client";

import { FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchDock } from "@/lib/searchDock";
import { classifyUniversalSearch, type SearchDestination, universalSearchHref } from "@/lib/productDesign";
import Modal from "@/components/Modal";

const examples = ["GST consultant in Ahmedabad", "Operations manager jobs", "Food-safe packaging company", "Remote product design roles"];

function SearchIcon() { return <svg aria-hidden viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>; }
function ArrowIcon() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>; }

export default function UniversalSearch({ onSubmitted }: { onSubmitted?: () => void } = {}) {
  const router = useRouter();
  const dock = useSearchDock();
  const queryId = useId();
  const errorId = `${queryId}-error`;
  const query = dock.universalQuery;
  const setQuery = dock.setUniversalQuery;
  const [error, setError] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);

  function navigate(destination: SearchDestination, value = query) {
    const intent = { ...classifyUniversalSearch(value), destination };
    if (destination === "directory") dock.setQuery(intent.query);
    else dock.setRoleQuery(intent.query);
    dock.markSearchNav();
    onSubmitted?.();
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
        <label className="sr-only" htmlFor={queryId}>Search companies, services or jobs</label>
        <input id={queryId} value={query} onChange={(event) => { setQuery(event.target.value); setError(""); setChoiceOpen(false); }} placeholder="Try ‘GST consultant in Ahmedabad’ or ‘operations jobs’" aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} />
        <button type="submit" aria-label="Search"><ArrowIcon /></button>
      </form>
      {error && <p id={errorId} className="bn-search-error" role="alert">{error}</p>}
      {choiceOpen && <div className="bn-search-choice" role="group" aria-label="Choose where to search"><span>Where should we search?</span><button type="button" onClick={() => navigate("directory")}>Companies &amp; services</button><button type="button" onClick={() => navigate("recruitment")}>Jobs &amp; hiring</button></div>}
      <div className="bn-search-examples" aria-label="Example searches"><span>Try</span>{examples.map((example) => <button key={example} type="button" onClick={() => chooseExample(example)}>{example}</button>)}</div>
    </div>
  );
}

export function UniversalDockedSearch() {
  const router = useRouter();
  const dock = useSearchDock();
  const compactId = useId();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [needsChoice, setNeedsChoice] = useState(false);
  const summary = dock.universalQuery.trim() || "Search Bharat Navya";

  function navigate(destination: SearchDestination) {
    const intent = { ...classifyUniversalSearch(dock.universalQuery), destination };
    if (destination === "directory") dock.setQuery(intent.query);
    else dock.setRoleQuery(intent.query);
    dock.markSearchNav();
    setDrawerOpen(false);
    setNeedsChoice(false);
    router.push(universalSearchHref(intent));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const intent = classifyUniversalSearch(dock.universalQuery);
    if (!intent.query || intent.confidence === "low") {
      setNeedsChoice(Boolean(intent.query));
      setDrawerOpen(true);
      return;
    }
    navigate(intent.destination);
  }

  return <>
    <div className="bn-header-search" data-section="home">
      <div className="bn-header-search-desktop">
        <form className="bn-universal-compact" role="search" aria-label="Search Bharat Navya" onSubmit={submit}>
          <SearchIcon />
          <label className="sr-only" htmlFor={compactId}>Search companies, services or jobs</label>
          <input id={compactId} value={dock.universalQuery} onChange={(event) => dock.setUniversalQuery(event.target.value)} placeholder="Search companies or jobs" />
          <button type="submit" aria-label="Search"><ArrowIcon /></button>
        </form>
      </div>
      <button type="button" className="bn-header-search-mobile" onClick={() => { setNeedsChoice(false); setDrawerOpen(true); }} aria-label={`Edit ${summary}`}><SearchIcon /><span><strong>{summary}</strong><small>Companies and jobs</small></span><ArrowIcon /></button>
    </div>
    <Modal open={drawerOpen} onClose={() => { setDrawerOpen(false); setNeedsChoice(false); }} title="Search Bharat Navya" size="lg" className="bn-universal-search-modal">
      <UniversalSearch onSubmitted={() => setDrawerOpen(false)} />
      {needsChoice && <div className="bn-search-choice" role="group" aria-label="Choose where to search"><span>Where should we search?</span><button type="button" onClick={() => navigate("directory")}>Companies &amp; services</button><button type="button" onClick={() => navigate("recruitment")}>Jobs &amp; hiring</button></div>}
    </Modal>
  </>;
}
