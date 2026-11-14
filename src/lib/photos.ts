import type { ImageMetadata } from "astro";

// All images, grouped by the year folder they sit in.
const images = import.meta.glob<ImageMetadata>(
  "/src/assets/photos/*/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}",
  { eager: true, import: "default" }
);

// One captions file per year.
const captionFiles = import.meta.glob<Record<string, string>>(
  "/src/data/photos/*.json",
  { eager: true, import: "default" }
);

export type Photo = { file: string; image: ImageMetadata; caption: string };

let cache: Record<string, Photo[]> | undefined;

export function getPhotos(): Record<string, Photo[]> {
  if (cache) return cache;

  const captionsByYear: Record<string, Record<string, string>> = {};
  for (const [path, captions] of Object.entries(captionFiles)) {
    const year = path.match(/photos\/(\d{4})\.json$/)?.[1];
    if (!year) {
      throw new Error(`Unexpected captions file name: ${path}. Name it <year>.json`);
    }
    captionsByYear[year] = captions;
  }

  const byYear: Record<string, Photo[]> = {};
  for (const [path, image] of Object.entries(images)) {
    const match = path.match(/photos\/(\d{4})\/([^/]+)$/);
    if (!match) throw new Error(`Unexpected photo location: ${path}`);
    const [, year, file] = match;
    (byYear[year] ??= []).push({
      file,
      image,
      caption: captionsByYear[year]?.[file] ?? "",
    });
  }

  // Every caption must belong to a real photo.
  for (const [year, captions] of Object.entries(captionsByYear)) {
    const files = new Set((byYear[year] ?? []).map((p) => p.file));
    for (const file of Object.keys(captions)) {
      if (!files.has(file)) {
        throw new Error(
          `src/data/photos/${year}.json has a caption for "${file}", but that photo is not in src/assets/photos/${year}/`
        );
      }
    }
  }

  for (const list of Object.values(byYear)) {
    list.sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true }));
  }

  cache = byYear;
  return byYear;
}

export function getPhotoYears(): string[] {
  return Object.keys(getPhotos()).sort().reverse();
}