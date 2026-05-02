import { DAVClient, type DAVCalendar, type DAVObject } from "tsdav";

const ICLOUD_CALDAV_URL = "https://caldav.icloud.com";

export interface ICloudClientConfig {
  username: string;
  password: string;
}

/**
 * Thin wrapper around tsdav's DAVClient configured for iCloud.
 * Caches calendars after first fetch since they rarely change mid-session.
 */
export class ICloudCalendarClient {
  private client: DAVClient;
  private calendarsCache: DAVCalendar[] | null = null;
  private loggedIn = false;

  constructor(config: ICloudClientConfig) {
    this.client = new DAVClient({
      serverUrl: ICLOUD_CALDAV_URL,
      credentials: {
        username: config.username,
        password: config.password,
      },
      authMethod: "Basic",
      defaultAccountType: "caldav",
    });
  }

  private async ensureLoggedIn(): Promise<void> {
    if (!this.loggedIn) {
      await this.client.login();
      this.loggedIn = true;
    }
  }

  async getCalendars(forceRefresh = false): Promise<DAVCalendar[]> {
    await this.ensureLoggedIn();
    if (this.calendarsCache && !forceRefresh) {
      return this.calendarsCache;
    }
    this.calendarsCache = await this.client.fetchCalendars();
    return this.calendarsCache;
  }

  /**
   * Resolve a calendar by either its display name or full URL.
   * Display name lookup is case-insensitive.
   */
  async resolveCalendar(nameOrUrl: string): Promise<DAVCalendar> {
    const calendars = await this.getCalendars();
    const target = nameOrUrl.toLowerCase();

    const byUrl = calendars.find((c) => c.url === nameOrUrl);
    if (byUrl) return byUrl;

    const byName = calendars.find(
      (c) =>
        typeof c.displayName === "string" &&
        c.displayName.toLowerCase() === target,
    );
    if (byName) return byName;

    const available = calendars
      .map((c) => (typeof c.displayName === "string" ? c.displayName : c.url))
      .join(", ");
    throw new Error(
      `Calendar not found: "${nameOrUrl}". Available calendars: ${available}`,
    );
  }

  async fetchCalendarObjects(
    calendar: DAVCalendar,
    timeRange?: { start: string; end: string },
  ): Promise<DAVObject[]> {
    await this.ensureLoggedIn();
    return this.client.fetchCalendarObjects({
      calendar,
      timeRange,
      expand: true,
    });
  }

  async createCalendarObject(
    calendar: DAVCalendar,
    filename: string,
    icalString: string,
  ): Promise<void> {
    await this.ensureLoggedIn();
    const result = await this.client.createCalendarObject({
      calendar,
      filename,
      iCalString: icalString,
    });
    if (!result.ok) {
      throw new Error(
        `Failed to create event: ${result.status} ${result.statusText}`,
      );
    }
  }

  async updateCalendarObject(
    obj: DAVObject,
    icalString: string,
  ): Promise<void> {
    await this.ensureLoggedIn();
    const result = await this.client.updateCalendarObject({
      calendarObject: { ...obj, data: icalString },
    });
    if (!result.ok) {
      throw new Error(
        `Failed to update event: ${result.status} ${result.statusText}`,
      );
    }
  }

  async deleteCalendarObject(obj: DAVObject): Promise<void> {
    await this.ensureLoggedIn();
    const result = await this.client.deleteCalendarObject({
      calendarObject: obj,
    });
    if (!result.ok) {
      throw new Error(
        `Failed to delete event: ${result.status} ${result.statusText}`,
      );
    }
  }
}
