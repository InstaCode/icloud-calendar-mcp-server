# @instacode/icloud-calendar-mcp-server

MCP server for iCloud Calendar via CalDAV. Lets Claude (or any MCP client) read and write events on your iCloud calendars.

Published under [InstaCode](https://www.npmjs.com/org/instacode).

## What it does

Exposes five tools:

| Tool | Purpose |
|---|---|
| `icloud_list_calendars` | List your iCloud calendars |
| `icloud_list_events` | Fetch events from a calendar in a date range |
| `icloud_create_event` | Create a new event |
| `icloud_update_event` | Update an existing event by UID |
| `icloud_delete_event` | Delete an event by UID |

## Prerequisites

- Node.js 18+
- An Apple ID with two-factor authentication enabled
- An **app-specific password** generated at <https://appleid.apple.com> (your normal Apple ID password will not work for CalDAV)

## Setup

```bash
npm install
npm run build
```

Set credentials via environment variables (or copy `.env.example` to `.env` and load via your runner):

```bash
export ICLOUD_USERNAME="you@icloud.com"
export ICLOUD_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"
```

## Test it locally

Use the MCP Inspector to poke at the tools without wiring up a client:

```bash
npm run inspect
```

Then in the inspector UI: list tools, call `icloud_list_calendars`, etc.

## Use with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "icloud-calendar": {
      "command": "node",
      "args": ["/absolute/path/to/icloud-calendar-mcp-server/dist/index.js"],
      "env": {
        "ICLOUD_USERNAME": "you@icloud.com",
        "ICLOUD_APP_PASSWORD": "xxxx-xxxx-xxxx-xxxx"
      }
    }
  }
}
```

Restart Claude Desktop. The tools should appear under the MCP icon.

## Known limitations (v0.1)

- **Time zones**: events are written in UTC. Timezone-aware writes are TODO.
- **Recurring events**: parsed as their master event; recurrence overrides aren't surfaced separately yet.
- **Reminders/alarms**: not yet supported on create/update.
- **Attendees / invites**: not yet supported.
- **Update/delete by UID** does a calendar scan; for very large calendars this is slow. Future improvement: maintain a UID→URL index or use server-side query reports.

## Roadmap

- [ ] Timezone support on create/update
- [ ] VALARM (reminders) on create/update
- [ ] `icloud_search_events` with text query (across calendars)
- [ ] `icloud_find_free_time` helper
- [ ] CardDAV companion for contacts (`https://contacts.icloud.com`)
- [ ] Optional Streamable HTTP transport for hosted use

## Publishing

Releases are published to npm via OIDC trusted publishing — no `NPM_TOKEN` required in CI.

**First publish (one-time, manual):**

The npm trusted-publisher settings page only appears for packages that already exist on npmjs.com. So v0.1.0 must be published manually from a local machine:

```bash
npm login
npm publish --provenance --access public
```

**After the first publish:**

1. Go to <https://www.npmjs.com/package/@instacode/icloud-calendar-mcp-server> → Settings → Trusted Publishers
2. Add a publisher with:
   - Repository owner: `InstaCode` (or your GitHub username)
   - Repository name: `icloud-calendar-mcp-server`
   - Workflow filename: `publish.yml`

**Subsequent releases (automated):**

```bash
npm version patch   # or minor / major
git push --follow-tags
```

The `Publish to npm` workflow will run on the new `v*` tag, verify the tag matches `package.json`, build, and publish with provenance.

## License

MIT
