import ICAL from "ical.js";
import ical from "ical-generator";
import { randomUUID } from "node:crypto";

const PROD_ID = "-//InstaCode//icloud-calendar-mcp-server//EN";

export interface ParsedEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
  allDay: boolean;
  url?: string; // CalDAV object URL (not iCal URL property)
  etag?: string;
}

export interface EventInput {
  summary: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  allDay?: boolean;
  uid?: string;
}

/**
 * Parse a single VEVENT from an iCal string.
 * iCloud sometimes returns multiple VEVENTs per object (recurrence overrides);
 * this returns the master event.
 */
export function parseEvent(
  icalData: string,
  url?: string,
  etag?: string,
): ParsedEvent | null {
  try {
    const jcal = ICAL.parse(icalData);
    const vcal = new ICAL.Component(jcal);
    const vevent = vcal.getFirstSubcomponent("vevent");
    if (!vevent) return null;

    const event = new ICAL.Event(vevent);
    const startTime = event.startDate;
    const endTime = event.endDate;

    return {
      uid: event.uid,
      summary: event.summary || "(no title)",
      description: event.description || undefined,
      location: event.location || undefined,
      start: startTime.toJSDate().toISOString(),
      end: endTime.toJSDate().toISOString(),
      allDay: startTime.isDate,
      url,
      etag,
    };
  } catch {
    return null;
  }
}

/**
 * Build an iCal string for a new or updated event.
 */
export function buildEventIcal(input: EventInput): {
  icalString: string;
  uid: string;
  filename: string;
} {
  const uid = input.uid ?? randomUUID();
  const cal = ical({ prodId: PROD_ID });

  cal.createEvent({
    id: uid,
    start: input.start,
    end: input.end,
    summary: input.summary,
    description: input.description,
    location: input.location,
    allDay: input.allDay ?? false,
  });

  return {
    icalString: cal.toString(),
    uid,
    filename: `${uid}.ics`,
  };
}

/**
 * Take an existing iCal string and produce a new one with updated fields.
 * Preserves the original UID and any unmodified fields.
 */
export function updateEventIcal(
  existingIcal: string,
  updates: Partial<Omit<EventInput, "uid">>,
): string {
  const jcal = ICAL.parse(existingIcal);
  const vcal = new ICAL.Component(jcal);
  const vevent = vcal.getFirstSubcomponent("vevent");
  if (!vevent) {
    throw new Error("No VEVENT found in existing iCal data");
  }

  if (updates.summary !== undefined) {
    vevent.updatePropertyWithValue("summary", updates.summary);
  }
  if (updates.description !== undefined) {
    vevent.updatePropertyWithValue("description", updates.description);
  }
  if (updates.location !== undefined) {
    vevent.updatePropertyWithValue("location", updates.location);
  }
  if (updates.start !== undefined) {
    const t = ICAL.Time.fromJSDate(updates.start, true);
    if (updates.allDay) t.isDate = true;
    vevent.updatePropertyWithValue("dtstart", t);
  }
  if (updates.end !== undefined) {
    const t = ICAL.Time.fromJSDate(updates.end, true);
    if (updates.allDay) t.isDate = true;
    vevent.updatePropertyWithValue("dtend", t);
  }

  // Bump LAST-MODIFIED so iCloud knows it changed
  vevent.updatePropertyWithValue("last-modified", ICAL.Time.now());

  return vcal.toString();
}
