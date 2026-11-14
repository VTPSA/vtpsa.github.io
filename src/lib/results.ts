import Papa from "papaparse";
import divisionList from "../data/divisions.json";

// The first four columns (#, Surname, Name, Cat) are text.
// Every column after them (Best, Feb, May...) is a score.
export const TEXT_COLUMNS = 4;

// Load every results CSV as raw text at build time.
const files = import.meta.glob("/src/data/results/*/*.csv", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export type DivisionResults = {
  slug: string;
  name: string;
  headers: string[];
  rows: string[][];
};

// Display rules: empty cells show a dash, scores show 2 decimals with a
// decimal comma (88,73666667 becomes 88,74), anything that isn't a number
// (for example "DNS") is shown as typed.
function formatCell(value: string, column: number): string {
  const text = value.trim();
  if (text === "") return "–";
  if (column < TEXT_COLUMNS) return text;
  const number = Number(text.replace(",", "."));
  if (!Number.isFinite(number)) return text;
  return number.toFixed(2).replace(".", ",");
}

function parseDivision(path: string, raw: string, slug: string, name: string): DivisionResults {
  const parsed = Papa.parse<string[]>(raw.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
    delimitersToGuess: [";", ","],
  });

  const [headerRow, ...body] = parsed.data;
  if (!headerRow || body.length === 0) {
    throw new Error(`${path}: the file needs a header row and at least one result row.`);
  }

  const headers = headerRow.map((h) => h.trim());
  const rows = body.map((row, i) => {
    if (row.length > headers.length) {
      throw new Error(
        `${path}: row ${i + 2} has ${row.length} columns but the header has ${headers.length}.`
      );
    }
    // Pad short rows (Excel sometimes drops trailing empty cells).
    return headers.map((_, column) => formatCell(row[column] ?? "", column));
  });

  return { slug, name, headers, rows };
}

let cache: Record<string, DivisionResults[]> | undefined;

export function getResults(): Record<string, DivisionResults[]> {
  if (cache) return cache;

  const byYear: Record<string, DivisionResults[]> = {};
  for (const [path, raw] of Object.entries(files)) {
    const match = path.match(/results\/(\d{4})\/([^/]+)\.csv$/);
    if (!match) throw new Error(`Unexpected results file location: ${path}`);
    const [, year, slug] = match;

    const division = divisionList.find((d) => d.slug === slug);
    if (!division) {
      throw new Error(`${path}: "${slug}" is not listed in src/data/divisions.json`);
    }
    (byYear[year] ??= []).push(parseDivision(path, raw, slug, division.name));
  }

  const order = (slug: string) => divisionList.findIndex((d) => d.slug === slug);
  for (const list of Object.values(byYear)) {
    list.sort((a, b) => order(a.slug) - order(b.slug));
  }

  cache = byYear;
  return byYear;
}

export function getYears(): string[] {
  return Object.keys(getResults()).sort().reverse();
}