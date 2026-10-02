"use client";

// Bharat Navya — Bulk catalog upload.
// A non-technical seller adds many products at once: download a CSV template, fill it
// in (Excel users "Save As CSV"), upload it, preview + validate every row in the
// browser, then create them all in one call. CSV is parsed by a small hand-written
// parser here — NO third-party library.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User, Category } from "@/lib/types";
import { getCategories, bulkCreateListings, type BulkUploadResult } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Button from "@/components/Button";
import { PanelHeader, Icon, useTr } from "./shared";

interface Props {
  user: User;
}

// The template column order (also the CSV header row).
const COLUMNS = [
  "title",
  "type",
  "category_slug",
  "price",
  "unit",
  "moq",
  "brand",
  "description",
  "city",
  "state",
  "pan_india",
] as const;
type Column = (typeof COLUMNS)[number];

const MAX_ROWS = 200; // must match the backend cap
const PREVIEW_LIMIT = 20;

// Header aliases keyed by an alphanumeric-only normalization of the header cell, so
// "Category Slug", "category_slug" and "categorySlug" all map to the same column.
const HEADER_ALIASES: Record<string, Column> = {
  title: "title",
  name: "title",
  type: "type",
  listingtype: "type",
  categoryslug: "category_slug",
  category: "category_slug",
  categoryid: "category_slug",
  price: "price",
  unit: "unit",
  uom: "unit",
  moq: "moq",
  minorderquantity: "moq",
  minorderqty: "moq",
  brand: "brand",
  description: "description",
  desc: "description",
  city: "city",
  state: "state",
  panindia: "pan_india",
};

function normHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Minimal, dependency-free CSV parser. Handles: quoted fields containing commas,
 * escaped quotes ("" inside a quoted field), CRLF or LF line endings, and a leading
 * UTF-8 BOM. Returns an array of rows (each a string[] of raw cell values).
 */
function parseCsv(input: string): string[][] {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1; // skip the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\r") {
      // ignore — the \n that follows (or EOF) closes the row
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  // flush the trailing field/row (file may not end in a newline)
  row.push(field);
  rows.push(row);

  // Drop rows that are entirely empty (e.g. blank trailing lines).
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

interface ParsedRow {
  csvLine: number; // 1-based data-row number (header excluded) — what the seller sees
  data: Record<Column, string>;
  errors: string[];
}

// Flatten the (possibly nested) category tree into the set of valid slugs.
function collectSlugs(cats: Category[], out: Set<string>): void {
  for (const c of cats) {
    if (c.slug) out.add(String(c.slug).toLowerCase());
    if (Array.isArray(c.children) && c.children.length) collectSlugs(c.children, out);
  }
}

// Pick up to `n` example category slugs (prefer specific child slugs) for the template.
function exampleSlugs(cats: Category[], n: number): string[] {
  const leaves: string[] = [];
  const tops: string[] = [];
  const walk = (list: Category[]) => {
    for (const c of list) {
      if (Array.isArray(c.children) && c.children.length) {
        tops.push(c.slug);
        walk(c.children);
      } else if (c.slug) {
        leaves.push(c.slug);
      }
    }
  };
  walk(cats);
  const pool = [...leaves, ...tops];
  const picked = pool.slice(0, n);
  while (picked.length < n) picked.push("textiles-fabrics-yarn");
  return picked;
}

// CSV-escape a single cell (quote when it contains a comma, quote or newline).
function csvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export default function BulkUploadTab({ user }: Props) {
  const tr = useTr();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [catsLoading, setCatsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [slugSet, setSlugSet] = useState<Set<string>>(new Set());

  const [fileName, setFileName] = useState<string>("");
  const [parseError, setParseError] = useState<string>("");
  const [rows, setRows] = useState<ParsedRow[] | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  // Map a backend error's 1-based index (into the array we sent) → the seller's CSV row.
  const [sentLines, setSentLines] = useState<number[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cats = await getCategories();
        if (!alive) return;
        setCategories(cats);
        const set = new Set<string>();
        collectSlugs(cats, set);
        setSlugSet(set);
      } catch (e) {
        addToast((e as Error).message || "Failed to load categories", "error");
      } finally {
        if (alive) setCatsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [addToast]);

  const validateRow = useCallback(
    (data: Record<Column, string>): string[] => {
      const errs: string[] = [];
      if (!data.title.trim()) errs.push("Missing title");
      const price = data.price.trim();
      if (!price) errs.push("Missing price");
      else if (Number.isNaN(Number(price))) errs.push(`Price "${price}" is not a number`);
      const slug = data.category_slug.trim().toLowerCase();
      if (!slug) errs.push("Missing category_slug");
      else if (slugSet.size > 0 && !slugSet.has(slug))
        errs.push(`Unknown category "${slug}"`);
      return errs;
    },
    [slugSet]
  );

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setResult(null);
    setParseError("");
    setRows(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onerror = () => setParseError(tr("bulk.readError", "Could not read that file."));
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const grid = parseCsv(text);
        if (grid.length === 0) {
          setParseError(tr("bulk.empty", "That file looks empty."));
          return;
        }
        // Header → column index map.
        const header = grid[0];
        const colIndex: Partial<Record<Column, number>> = {};
        header.forEach((cell, j) => {
          const canon = HEADER_ALIASES[normHeader(cell)];
          if (canon && colIndex[canon] === undefined) colIndex[canon] = j;
        });
        if (colIndex.title === undefined || colIndex.category_slug === undefined) {
          setParseError(
            tr(
              "bulk.badHeader",
              "Couldn't find the expected columns. Use the template header row (title, type, category_slug, price, …)."
            )
          );
          return;
        }

        const dataRows = grid.slice(1);
        const parsed: ParsedRow[] = dataRows.map((cells, idx) => {
          const data = {} as Record<Column, string>;
          for (const col of COLUMNS) {
            const j = colIndex[col];
            data[col] = j === undefined ? "" : String(cells[j] ?? "").trim();
          }
          return { csvLine: idx + 1, data, errors: validateRow(data) };
        });

        if (parsed.length === 0) {
          setParseError(tr("bulk.noRows", "No data rows found under the header."));
          return;
        }
        setRows(parsed);
      } catch {
        setParseError(tr("bulk.parseError", "Could not parse that CSV. Please check the format."));
      }
    };
    reader.readAsText(file);
  }

  function reset() {
    setRows(null);
    setResult(null);
    setParseError("");
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function downloadTemplate() {
    const [s1, s2] = exampleSlugs(categories, 2);
    const example: Record<Column, string>[] = [
      {
        title: "Stainless Steel Sheet 304 (2mm)",
        type: "product",
        category_slug: s1,
        price: "120",
        unit: "kg",
        moq: "50",
        brand: "Jindal",
        description: "Cold-rolled 2mm SS 304 sheet, quality-checked for bulk orders",
        city: "Mumbai",
        state: "Maharashtra",
        pan_india: "no",
      },
      {
        title: "Office Housekeeping Service (Monthly)",
        type: "service",
        category_slug: s2,
        price: "8000",
        unit: "month",
        moq: "1",
        brand: "",
        description: "Trained staff, supplies included, serviced across India",
        city: "",
        state: "",
        pan_india: "yes",
      },
    ];
    const lines = [
      COLUMNS.join(","),
      ...example.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(",")),
    ];
    const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bharatsource-catalog-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const validRows = useMemo(() => (rows ? rows.filter((r) => r.errors.length === 0) : []), [rows]);
  const invalidCount = rows ? rows.length - validRows.length : 0;
  const overCap = validRows.length > MAX_ROWS;

  async function submit() {
    if (validRows.length === 0) return;
    const toSend = validRows.slice(0, MAX_ROWS);
    setSubmitting(true);
    setResult(null);
    try {
      const res = await bulkCreateListings(toSend.map((r) => r.data));
      setSentLines(toSend.map((r) => r.csvLine));
      setResult(res);
      if (res.created > 0) {
        addToast(
          tr("bulk.createdToast", `Created ${res.created} listing${res.created === 1 ? "" : "s"}`),
          "success"
        );
      }
      if (res.errors.length > 0 && res.created === 0) {
        addToast(tr("bulk.noneCreated", "No listings were created — see the errors below"), "error");
      }
    } catch (e) {
      addToast((e as Error).message || "Bulk upload failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ---- render helpers ----
  const cellStyle: React.CSSProperties = {
    padding: "8px 10px",
    fontSize: "var(--fs-xs)",
    color: "var(--ink)",
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap",
  };
  const headStyle: React.CSSProperties = {
    ...cellStyle,
    color: "var(--muted)",
    fontWeight: 600,
    background: "var(--bg-subtle)",
    position: "sticky",
    top: 0,
  };

  return (
    <div>
      <PanelHeader
        title={tr("bulk.title", "Bulk upload")}
        subtitle={tr(
          "bulk.subtitle",
          "Add many products at once from a spreadsheet — download the template, fill it in, and upload."
        )}
        actions={
          <Button href="/dashboard?tab=listings" variant="secondary" leftIcon={<Icon name="listings" size={16} />}>
            {tr("bulk.myListings", "My listings")}
          </Button>
        }
      />

      {/* Step 1 — instructions + template download */}
      <div className="card card-flat" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--ink)" }}>
              {tr("bulk.step1", "1. Download the template")}
            </div>
            <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>
              {tr(
                "bulk.step1Hint",
                "The template has one row per product. Fill in a title, a category slug, and a price for each — the rest is optional."
              )}
            </p>
            <ul style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: 8, paddingLeft: 18, lineHeight: 1.7 }}>
              <li>
                <strong style={{ color: "var(--ink)" }}>title</strong>, <strong style={{ color: "var(--ink)" }}>category_slug</strong> and{" "}
                <strong style={{ color: "var(--ink)" }}>price</strong> {tr("bulk.required", "are required")}.
              </li>
              <li>
                <strong style={{ color: "var(--ink)" }}>type</strong> — {tr("bulk.typeHint", "product or service (defaults to product)")}.
              </li>
              <li>
                <strong style={{ color: "var(--ink)" }}>pan_india</strong> — {tr("bulk.panHint", "yes to serve all of India (city/state are then ignored)")}.
              </li>
            </ul>
          </div>
          <Button variant="primary" onClick={downloadTemplate} leftIcon={<DownloadIcon size={16} />}>
            {tr("bulk.downloadTemplate", "Download CSV template")}
          </Button>
        </div>

        {/* Excel note */}
        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: "var(--fs-xs)",
            color: "var(--muted)",
            background: "var(--brand-tint)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-sm)",
            padding: "8px 12px",
          }}
        >
          <Icon name="external" size={14} style={{ color: "var(--brand)", flexShrink: 0 }} />
          <span>
            {tr("bulk.excelNote", "Using Excel or Google Sheets? Fill in the template, then choose “Save As / Download as CSV”, and upload that file below.")}
          </span>
        </div>
      </div>

      {/* Step 2 — file input */}
      <div className="card card-flat" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
          {tr("bulk.step2", "2. Upload your filled-in CSV")}
        </div>
        <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginBottom: 12 }}>
          {tr("bulk.step2Hint", `Up to ${MAX_ROWS} products per file. We'll preview and check every row before anything is created.`)}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="input"
          style={{ maxWidth: 420, cursor: "pointer" }}
          disabled={catsLoading}
        />
        {catsLoading && (
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--faint)", marginTop: 8 }}>
            {tr("bulk.loadingCats", "Loading categories for validation…")}
          </div>
        )}
        {fileName && !parseError && (
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: 8 }}>
            {tr("bulk.selected", "Selected file:")} <strong style={{ color: "var(--ink)" }}>{fileName}</strong>
          </div>
        )}
        {parseError && (
          <div
            style={{
              marginTop: 10,
              fontSize: "var(--fs-xs)",
              color: "var(--error)",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "var(--r-sm)",
              padding: "8px 12px",
            }}
          >
            {parseError}
          </div>
        )}
      </div>

      {/* Result summary (after submit) */}
      {result && (
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-grid",
                placeItems: "center",
                width: 34,
                height: 34,
                borderRadius: "var(--r-sm)",
                background: result.created > 0 ? "#dcfce7" : "#fef2f2",
                color: result.created > 0 ? "var(--success)" : "var(--error)",
              }}
            >
              <Icon name={result.created > 0 ? "check" : "trash"} size={18} />
            </span>
            <div style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--ink)" }}>
              {tr("bulk.resultTitle", `Created ${result.created} product${result.created === 1 ? "" : "s"}`)}
              {result.errors.length > 0
                ? tr("bulk.resultErrs", ` · ${result.errors.length} skipped`)
                : ""}
            </div>
          </div>

          {result.errors.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
                {tr("bulk.skippedRows", "Rows that were skipped")}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                {result.errors.map((er, i) => (
                  <li key={i} style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                    <strong style={{ color: "var(--ink)" }}>
                      {tr("bulk.rowLabel", "Row")} {sentLines[er.row - 1] ?? er.row}
                    </strong>
                    : {er.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {result.created > 0 && (
              <Button href="/dashboard?tab=listings" variant="brand" leftIcon={<Icon name="listings" size={16} />}>
                {tr("bulk.viewListings", "View my listings")}
              </Button>
            )}
            <Button variant="secondary" onClick={reset} leftIcon={<DownloadIcon size={16} rotate />}>
              {tr("bulk.uploadAnother", "Upload another file")}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — preview + validate + create */}
      {rows && !result && (
        <div className="card card-flat" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--ink)" }}>
                {tr("bulk.step3", "3. Preview & confirm")}
              </div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="badge badge-new">{tr("bulk.readyN", `${validRows.length} ready`)}</span>
                {invalidCount > 0 && (
                  <span className="badge badge-neutral" style={{ color: "var(--error)" }}>
                    {tr("bulk.invalidN", `${invalidCount} with issues`)}
                  </span>
                )}
                <span style={{ color: "var(--faint)" }}>
                  {tr("bulk.totalN", `${rows.length} rows total`)}
                  {rows.length > PREVIEW_LIMIT
                    ? tr("bulk.showingN", ` · showing first ${PREVIEW_LIMIT}`)
                    : ""}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button variant="secondary" onClick={reset} disabled={submitting}>
                {tr("common.cancel", "Cancel")}
              </Button>
              <Button variant="primary" onClick={submit} disabled={submitting || validRows.length === 0}>
                {submitting
                  ? tr("bulk.creating", "Creating…")
                  : tr("bulk.createN", `Create ${Math.min(validRows.length, MAX_ROWS)} product${Math.min(validRows.length, MAX_ROWS) === 1 ? "" : "s"}`)}
              </Button>
            </div>
          </div>

          {overCap && (
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--action)", marginBottom: 10 }}>
              {tr("bulk.overCap", `Only the first ${MAX_ROWS} valid rows will be uploaded. Split the rest into another file.`)}
            </div>
          )}
          {invalidCount > 0 && (
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginBottom: 10 }}>
              {tr("bulk.invalidHint", "Rows with issues are skipped automatically — fix them in your sheet and re-upload to add them.")}
            </div>
          )}

          <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 860 }}>
              <thead>
                <tr>
                  <th style={{ ...headStyle, width: 52 }}>#</th>
                  <th style={{ ...headStyle, width: 120 }}>{tr("bulk.colStatus", "Status")}</th>
                  <th style={headStyle}>{tr("bulk.colTitle", "Title")}</th>
                  <th style={headStyle}>{tr("bulk.colType", "Type")}</th>
                  <th style={headStyle}>{tr("bulk.colCategory", "Category")}</th>
                  <th style={headStyle}>{tr("bulk.colPrice", "Price")}</th>
                  <th style={headStyle}>{tr("bulk.colUnit", "Unit")}</th>
                  <th style={headStyle}>{tr("bulk.colMoq", "MOQ")}</th>
                  <th style={headStyle}>{tr("bulk.colBrand", "Brand")}</th>
                  <th style={headStyle}>{tr("bulk.colLocation", "Location")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, PREVIEW_LIMIT).map((r) => {
                  const ok = r.errors.length === 0;
                  const pan = ["yes", "y", "true", "1"].includes(r.data.pan_india.toLowerCase());
                  const loc = pan
                    ? "PAN India"
                    : [r.data.city, r.data.state].filter(Boolean).join(", ") || "—";
                  return (
                    <tr key={r.csvLine} style={{ background: ok ? "transparent" : "#fff7f7" }}>
                      <td style={{ ...cellStyle, color: "var(--faint)" }}>{r.csvLine}</td>
                      <td style={cellStyle}>
                        {ok ? (
                          <span className="badge badge-new">{tr("bulk.ok", "Ready")}</span>
                        ) : (
                          <span
                            title={r.errors.join("; ")}
                            style={{ color: "var(--error)", fontSize: "var(--fs-xs)", fontWeight: 600, whiteSpace: "normal", display: "inline-block", maxWidth: 220 }}
                          >
                            {r.errors.join("; ")}
                          </span>
                        )}
                      </td>
                      <td style={{ ...cellStyle, whiteSpace: "normal", minWidth: 180, color: r.data.title ? "var(--ink)" : "var(--error)" }}>
                        {r.data.title || tr("bulk.missing", "(missing)")}
                      </td>
                      <td style={cellStyle}>{r.data.type || "product"}</td>
                      <td style={{ ...cellStyle, color: r.errors.some((e) => e.includes("category")) ? "var(--error)" : "var(--ink)" }}>
                        {r.data.category_slug || tr("bulk.missing", "(missing)")}
                      </td>
                      <td style={{ ...cellStyle, color: r.errors.some((e) => e.toLowerCase().includes("price")) ? "var(--error)" : "var(--ink)" }}>
                        {r.data.price || tr("bulk.missing", "(missing)")}
                      </td>
                      <td style={cellStyle}>{r.data.unit || "—"}</td>
                      <td style={cellStyle}>{r.data.moq || "—"}</td>
                      <td style={cellStyle}>{r.data.brand || "—"}</td>
                      <td style={cellStyle}>{loc}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length > PREVIEW_LIMIT && (
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--faint)", marginTop: 10 }}>
              {tr("bulk.moreRows", `+ ${rows.length - PREVIEW_LIMIT} more row${rows.length - PREVIEW_LIMIT === 1 ? "" : "s"} not shown (all will be processed).`)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Download / upload arrow icon (kept local — shared.tsx's icon set is a shared contract).
function DownloadIcon({ size = 16, rotate = false }: { size?: number; rotate?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={rotate ? { transform: "rotate(180deg)" } : undefined}
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
