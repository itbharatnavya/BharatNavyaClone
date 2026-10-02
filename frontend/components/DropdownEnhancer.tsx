"use client";

// Replaces the browser's own popup for every <select> on the platform with a
// themed list (white card, line border, tinted hover, tick on the chosen row, a
// filter box when there are many options). The <select> itself stays in the DOM as
// the source of truth: its value is set through the native setter and a bubbling
// `change` event is dispatched, so React `onChange` handlers, forms and labels keep
// working untouched. Mounted once in the root layout. Add data-native to a select
// to opt out; multi-selects and listboxes (size > 1) are left alone.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Option { value: string; label: string; disabled: boolean; group?: string }
interface OpenState { select: HTMLSelectElement; rect: DOMRect }

const SEARCH_THRESHOLD = 10;
const EDGE = 8;

function readOptions(select: HTMLSelectElement): Option[] {
  const options: Option[] = [];
  const add = (node: HTMLOptionElement, group?: string) => options.push({ value: node.value, label: node.textContent?.trim() || node.value, disabled: node.disabled, group });
  Array.from(select.children).forEach((node) => {
    if (node instanceof HTMLOptGroupElement) Array.from(node.children).forEach((child) => child instanceof HTMLOptionElement && add(child, node.label));
    else if (node instanceof HTMLOptionElement) add(node);
  });
  return options;
}

function chooseNative(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function Popover({ state, onClose }: { state: OpenState; onClose: () => void }) {
  const { select, rect } = state;
  const options = useMemo(() => readOptions(select), [select]);
  const searchable = options.length > SEARCH_THRESHOLD;
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const visible = useMemo(() => options.filter((option) => !term || option.label.toLowerCase().includes(term)), [options, term]);
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((option) => option.value === select.value)));
  const [place, setPlace] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const width = Math.min(Math.max(rect.width, 224), window.innerWidth - EDGE * 2);
    const left = Math.min(Math.max(rect.left, EDGE), window.innerWidth - width - EDGE);
    const below = window.innerHeight - rect.bottom - EDGE - 6;
    const above = rect.top - EDGE - 6;
    const flip = below < 240 && above > below;
    setPlace(flip
      ? { left, width, bottom: window.innerHeight - rect.top + 6, maxHeight: Math.min(352, above) }
      : { left, width, top: rect.bottom + 6, maxHeight: Math.min(352, below) });
  }, [rect]);

  useEffect(() => {
    if (!place) return;
    (searchable ? rootRef.current?.querySelector("input") : rootRef.current)?.focus({ preventScroll: true });
  }, [place, searchable]);

  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [active, place]);

  useEffect(() => { setActive(visible.findIndex((option) => !option.disabled)); }, [term]); // eslint-disable-line react-hooks/exhaustive-deps

  function pick(option?: Option) {
    if (!option || option.disabled) return;
    chooseNative(select, option.value);
    onClose();
    select.focus({ preventScroll: true });
  }

  function step(direction: 1 | -1) {
    if (!visible.length) return;
    let next = active;
    for (let count = 0; count < visible.length; count += 1) {
      next = (next + direction + visible.length) % visible.length;
      if (!visible[next].disabled) break;
    }
    setActive(next);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") { event.preventDefault(); step(1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); step(-1); }
    else if (event.key === "Home") { event.preventDefault(); setActive(visible.findIndex((option) => !option.disabled)); }
    else if (event.key === "End") { event.preventDefault(); setActive(visible.length - 1); }
    else if (event.key === "Enter" || (event.key === " " && !searchable)) { event.preventDefault(); pick(visible[active]); }
    else if (event.key === "Escape" || event.key === "Tab") { event.preventDefault(); onClose(); select.focus({ preventScroll: true }); }
    else if (!searchable && event.key.length === 1 && /\S/.test(event.key)) {
      const lower = event.key.toLowerCase();
      const from = visible.findIndex((option, index) => index > active && option.label.toLowerCase().startsWith(lower));
      const found = from >= 0 ? from : visible.findIndex((option) => option.label.toLowerCase().startsWith(lower));
      if (found >= 0) setActive(found);
    }
  }

  let lastGroup: string | undefined;
  return createPortal(
    <div
      ref={rootRef}
      className="bn-dd"
      data-dd-popover
      tabIndex={-1}
      style={place ? { left: place.left, width: place.width, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight, visibility: "visible" } : { visibility: "hidden" }}
      onKeyDown={onKeyDown}
    >
      {searchable && <label className="bn-dd-search">
        <svg aria-hidden viewBox="0 0 24 24"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" /><path d="m20 20-4-4" /></svg>
        <span className="sr-only">Filter options</span>
        <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" autoComplete="off" aria-controls="bn-dd-list" />
      </label>}
      <div id="bn-dd-list" ref={listRef} className="bn-dd-list" role="listbox" aria-label={select.getAttribute("aria-label") || undefined}>
        {visible.length === 0 && <p className="bn-dd-empty">No matches</p>}
        {visible.map((option, index) => {
          const heading = option.group && option.group !== lastGroup ? option.group : null;
          lastGroup = option.group;
          const selected = option.value === select.value;
          return <div key={`${option.group || ""}-${option.value}-${index}`}>
            {heading && <p className="bn-dd-group">{heading}</p>}
            <div
              role="option"
              aria-selected={selected}
              aria-disabled={option.disabled || undefined}
              data-index={index}
              className={`bn-dd-option${index === active ? " is-active" : ""}${selected ? " is-selected" : ""}${option.disabled ? " is-disabled" : ""}`}
              onMouseEnter={() => !option.disabled && setActive(index)}
              onMouseDown={(event) => { event.preventDefault(); pick(option); }}
            >
              <span>{option.label}</span>
              {selected && <svg aria-hidden viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>}
            </div>
          </div>;
        })}
      </div>
    </div>,
    document.body,
  );
}

export default function DropdownEnhancer() {
  const [open, setOpen] = useState<OpenState | null>(null);
  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    const enhanced = (target: EventTarget | null) => {
      const select = (target as Element | null)?.closest?.("select") as HTMLSelectElement | null;
      return select && !select.multiple && select.size <= 1 && !select.disabled && !select.hasAttribute("data-native") ? select : null;
    };
    const toggle = (select: HTMLSelectElement) => setOpen((current) => current?.select === select ? null : { select, rect: select.getBoundingClientRect() });

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const target = event.target as Element | null;
      if (target?.closest?.("[data-dd-popover]")) return;
      const select = enhanced(target);
      if (select) { event.preventDefault(); select.focus({ preventScroll: true }); toggle(select); return; }
      setOpen(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const select = enhanced(event.target);
      if (select && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key) && !event.altKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        toggle(select);
      }
    };
    const onViewportChange = (event: Event) => {
      if ((event.target as Element | null)?.closest?.("[data-dd-popover]")) return;
      setOpen(null);
    };
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("resize", onViewportChange);
    return () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", onViewportChange, true);
      window.removeEventListener("resize", onViewportChange);
    };
  }, []);

  return open ? <Popover key={open.select.id || "dd"} state={open} onClose={close} /> : null;
}
