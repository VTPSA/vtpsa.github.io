import { z } from "astro/zod";
import raw from "../data/events.json";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isRealDate(text: string): boolean {
  const [y, m, d] = text.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must look like 2026-02-27")
  .refine(isRealDate, "is not a real date");

const eventSchema = z
  .object({
    date: isoDate,
    endDate: isoDate.optional(),
    title: z.string().min(1),
    type: z.enum(["league", "clubshoot", "other"]),
    venue: z.string().optional(),
  })
  .refine((e) => !e.endDate || e.endDate >= e.date, {
    message: "endDate is before date",
  });

export type CalendarEvent = z.infer<typeof eventSchema>;

export function getEvents(): CalendarEvent[] {
  const parsed = z.array(eventSchema).min(1).safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (i) => `entry ${Number(i.path[0]) + 1}${i.path[1] ? ` (${String(i.path[1])})` : ""}: ${i.message}`
    );
    throw new Error(`src/data/events.json: ${problems.join("; ")}`);
  }
  return [...parsed.data].sort((a, b) => a.date.localeCompare(b.date));
}

function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { m, d, weekday: DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] };
}

export function formatEventDate(e: CalendarEvent): string {
  const a = parts(e.date);
  if (!e.endDate || e.endDate === e.date) {
    return `${a.weekday} ${a.d} ${MONTHS[a.m - 1]}`;
  }
  const b = parts(e.endDate);
  return a.m === b.m
    ? `${a.d}–${b.d} ${MONTHS[a.m - 1]}`
    : `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]}`;
}