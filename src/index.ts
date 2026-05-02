#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { ICloudCalendarClient } from "./client.js";
import { registerTools } from "./tools.js";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(
      `Missing required environment variable: ${name}\n` +
        `See .env.example for the expected configuration.`,
    );
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  const username = getRequiredEnv("ICLOUD_USERNAME");
  const password = getRequiredEnv("ICLOUD_APP_PASSWORD");

  const client = new ICloudCalendarClient({ username, password });

  const server = new McpServer({
    name: "icloud-calendar-mcp-server",
    version: "0.1.0",
  });

  registerTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Don't write to stdout — that's reserved for MCP protocol traffic.
  console.error("icloud-calendar-mcp-server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
