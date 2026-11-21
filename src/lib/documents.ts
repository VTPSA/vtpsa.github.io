import { readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export const dateFormat = new Intl.DateTimeFormat("en-ZA", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

// Returns a readable file size, and stops the build if the PDF is missing.
// readdirSync gives the real names on disk, so the check is case-sensitive
// even on Windows (like GitHub's Linux build machines).
export function fileSize(path: string, title: string): string {
  const full = join(process.cwd(), "public", path);

  let exists = false;
  try {
    exists = readdirSync(dirname(full)).includes(basename(full));
  } catch {
    exists = false;
  }
  if (!exists) {
    throw new Error(
      `Document "${title}" points to ${path}, but no file with exactly that name exists in public/.`
    );
  }

  const bytes = statSync(full).size;
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}