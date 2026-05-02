import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DAVObject } from "tsdav";

import { ICloudCalendarClient } from "./client.js";
import { buildEventIcal, parseEvent, updateEventIcal } from "./ical.js";
import {
  CreateEventInput,
  DeleteEventInput,
  ListCalendarsInput,
  ListEventsInput,
  UpdateEventInput,
} from "./schemas.js";

function ok(text: string, structured?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text }],
    ...(structured !== undefined ? { structuredContent: structured } : {}),
  };
}

function err(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: `Error: ${message}` }],
  };
}

async function findEventByUid(
  client: ICloudCalendarClient,
  calendarRef: string,
  uid: string,
): Promise<{ object: DAVObject; data: string } | null> {
  const calendar = await client.resolveCalendar(calendarRef);
  // Wide time range to find the event regardless of when it occurs.
  // For a v0.1 this is fine; future improvement: query by UID directly.
  const objects = await client.fetchCalendarObjects(calendar);
  for (const obj of objects) {
    const data = typeof obj.data === "string" ? obj.data : "";
    if (!data) continue;
    if (data.includes(`UID:${uid}`)) {
      return { object: obj, data };
    }
  }
  return null;
}

export function registerTools(
  server: McpServer,
  client: ICloudCalendarClient,
): void {
  server.registerTool(
    "icloud_list_calendars",
    {
      title: "List iCloud Calendars",
      description: `List all calendars in the authenticated iCloud account.

Returns each calendar's display name, URL (used as a stable identifier), color, and timezone if available.

Use this when:
  - The user asks "what calendars do I have"
  - You need a calendar identifier to pass to other tools
  - Disambiguating between calendars with similar names`,
      inputSchema: ListCalendarsInput.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const calendars = await client.getCalendars(true);
        const output = calendars.map((c) => ({
          displayName:
            typeof c.displayName === "string" ? c.displayName : null,
          url: c.url,
          ctag: c.ctag,
          timezone: c.timezone,
        }));
        return ok(JSON.stringify(output, null, 2), { calendars: output });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "icloud_list_events",
    {
      title: "List iCloud Events",
      description: `List events from a specific calendar within a time range.

Args:
  - calendar: Display name (e.g. "Work") or full CalDAV URL
  - start: ISO 8601 datetime for range start
  - end: ISO 8601 datetime for range end

Returns an array of events with uid, summary, start, end, location, description, allDay flag.
The 'uid' is the stable identifier — use it for update/delete operations.`,
      inputSchema: ListEventsInput.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const calendar = await client.resolveCalendar(args.calendar);
        const objects = await client.fetchCalendarObjects(calendar, {
          start: args.start,
          end: args.end,
        });
        const events = objects
          .map((obj) => {
            const data = typeof obj.data === "string" ? obj.data : "";
            return data ? parseEvent(data, obj.url, obj.etag) : null;
          })
          .filter((e): e is NonNullable<typeof e> => e !== null);

        return ok(JSON.stringify(events, null, 2), {
          count: events.length,
          events,
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "icloud_create_event",
    {
      title: "Create iCloud Event",
      description: `Create a new event on the specified calendar.

Args:
  - calendar: Display name or full CalDAV URL
  - summary: Event title (required)
  - start, end: ISO 8601 datetimes
  - description, location: optional
  - allDay: boolean (default false)

Returns the created event's uid and CalDAV URL.`,
      inputSchema: CreateEventInput.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const calendar = await client.resolveCalendar(args.calendar);
        const { icalString, uid, filename } = buildEventIcal({
          summary: args.summary,
          description: args.description,
          location: args.location,
          start: new Date(args.start),
          end: new Date(args.end),
          allDay: args.allDay,
        });
        await client.createCalendarObject(calendar, filename, icalString);
        return ok(
          `Created event "${args.summary}" with UID ${uid}`,
          { uid, summary: args.summary, calendar: calendar.url },
        );
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "icloud_update_event",
    {
      title: "Update iCloud Event",
      description: `Update fields on an existing event by UID.

Args:
  - calendar: Display name or full CalDAV URL where the event lives
  - uid: Event UID (from icloud_list_events)
  - Any of: summary, description, location, start, end, allDay (only provided fields are updated)

Returns confirmation with the updated UID.`,
      inputSchema: UpdateEventInput.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const found = await findEventByUid(client, args.calendar, args.uid);
        if (!found) {
          return err(
            `Event not found with UID ${args.uid} in calendar "${args.calendar}"`,
          );
        }

        const updates: Parameters<typeof updateEventIcal>[1] = {};
        if (args.summary !== undefined) updates.summary = args.summary;
        if (args.description !== undefined)
          updates.description = args.description;
        if (args.location !== undefined) updates.location = args.location;
        if (args.start !== undefined) updates.start = new Date(args.start);
        if (args.end !== undefined) updates.end = new Date(args.end);
        if (args.allDay !== undefined) updates.allDay = args.allDay;

        const newIcal = updateEventIcal(found.data, updates);
        await client.updateCalendarObject(found.object, newIcal);
        return ok(`Updated event with UID ${args.uid}`, { uid: args.uid });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "icloud_delete_event",
    {
      title: "Delete iCloud Event",
      description: `Delete an event by UID.

Args:
  - calendar: Display name or full CalDAV URL
  - uid: Event UID

This is destructive. Confirm with the user before invoking.`,
      inputSchema: DeleteEventInput.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const found = await findEventByUid(client, args.calendar, args.uid);
        if (!found) {
          return err(
            `Event not found with UID ${args.uid} in calendar "${args.calendar}"`,
          );
        }
        await client.deleteCalendarObject(found.object);
        return ok(`Deleted event with UID ${args.uid}`, { uid: args.uid });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );
}
