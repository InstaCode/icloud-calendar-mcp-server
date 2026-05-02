import { z } from "zod";

export const ListCalendarsInput = z.object({}).strict();

export const ListEventsInput = z
  .object({
    calendar: z
      .string()
      .min(1)
      .describe(
        "Calendar display name (e.g., 'Work', 'Home') or full CalDAV URL",
      ),
    start: z
      .string()
      .datetime({ offset: true })
      .describe("Range start as ISO 8601 datetime (e.g., '2026-05-01T00:00:00Z')"),
    end: z
      .string()
      .datetime({ offset: true })
      .describe("Range end as ISO 8601 datetime (e.g., '2026-05-31T23:59:59Z')"),
  })
  .strict();

const EventCommonFields = {
  summary: z.string().min(1).describe("Event title"),
  description: z.string().optional().describe("Event description / notes"),
  location: z.string().optional().describe("Event location"),
  start: z
    .string()
    .datetime({ offset: true })
    .describe("Start time as ISO 8601 datetime"),
  end: z
    .string()
    .datetime({ offset: true })
    .describe("End time as ISO 8601 datetime"),
  allDay: z
    .boolean()
    .default(false)
    .describe("Whether this is an all-day event"),
};

export const CreateEventInput = z
  .object({
    calendar: z
      .string()
      .min(1)
      .describe("Calendar display name or full CalDAV URL"),
    ...EventCommonFields,
  })
  .strict();

export const UpdateEventInput = z
  .object({
    calendar: z
      .string()
      .min(1)
      .describe("Calendar display name or full CalDAV URL"),
    uid: z.string().min(1).describe("UID of the event to update"),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    start: z.string().datetime({ offset: true }).optional(),
    end: z.string().datetime({ offset: true }).optional(),
    allDay: z.boolean().optional(),
  })
  .strict();

export const DeleteEventInput = z
  .object({
    calendar: z
      .string()
      .min(1)
      .describe("Calendar display name or full CalDAV URL"),
    uid: z.string().min(1).describe("UID of the event to delete"),
  })
  .strict();

export type ListCalendarsArgs = z.infer<typeof ListCalendarsInput>;
export type ListEventsArgs = z.infer<typeof ListEventsInput>;
export type CreateEventArgs = z.infer<typeof CreateEventInput>;
export type UpdateEventArgs = z.infer<typeof UpdateEventInput>;
export type DeleteEventArgs = z.infer<typeof DeleteEventInput>;
