import Papa from "papaparse";
import categoryList from "../data/honours.json";

// Load every honours CSV as raw text at build time.
const files = import.meta.glob("/src/data/honours/*.csv", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export type HonourCategory = {
  slug: string;
  title: string;
  description: string;
  headers: string[];
  rows: string[][];
};

function parseCategory(
  path: string,
  raw: string,
  meta: { slug: string; title: string; description: string }
): HonourCategory {
  const parsed = Papa.parse<string[]>(raw.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
    delimitersToGuess: [";", ","],
  });

  const [headerRow, ...body] = parsed.data;
  if (!headerRow) {
    throw new Error(`${path}: the file is empty. It needs at least a header row.`);
  }

  const headers = headerRow.map((h) => h.trim());
  if (headers[0].toLowerCase() !== "year") {
    throw new Error(`${path}: the first column must be "Year" (found "${headers[0]}").`);
  }

  const rows = body.map((row, i) => {
    if (row.length > headers.length) {
      throw new Error(
        `${path}: row ${i + 2} has ${row.length} columns but the header has ${headers.length}.`
      );
    }
    const cells = headers.map((_, c) => (row[c] ?? "").trim());
    if (!/^\d{4}/.test(cells[0])) {
      throw new Error(
        `${path}: row ${i + 2} has "${cells[0]}" as its year. It must start with a four-digit year, such as 1998.`
      );
    }
    return cells;
  });

  // Newest year first. The sort is stable, so rows from the same year
  // stay in the order they were typed in the CSV.
  rows.sort((a, b) => Number(b[0].slice(0, 4)) - Number(a[0].slice(0, 4)));

  return {
    ...meta,
    headers,
    rows: rows.map((r) => r.map((cell) => (cell === "" ? "–" : cell))),
  };
}

let cache: HonourCategory[] | undefined;

export function getHonours(): HonourCategory[] {
  if (cache) return cache;

  // Every CSV must belong to a listed category (this catches misspelt file names).
  for (const path of Object.keys(files)) {
    const slug = path.match(/honours\/([^/]+)\.csv$/)?.[1];
    if (!slug || !categoryList.some((c) => c.slug === slug)) {
      throw new Error(`${path}: "${slug}" is not listed in src/data/honours.json`);
    }
  }

  // A listed category with no CSV yet simply shows as empty.
  cache = categoryList.map((meta) => {
    const path = `/src/data/honours/${meta.slug}.csv`;
    const raw = files[path];
    return raw
      ? parseCategory(path, raw, meta)
      : { ...meta, headers: [], rows: [] };
  });
  return cache;
}