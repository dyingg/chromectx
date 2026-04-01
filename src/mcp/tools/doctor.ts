import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { resolveAppPaths } from "../../lib/config.js";
import { getRuntimePlatform } from "../../platform/guard.js";
import { getMacOSDoctorSnapshot } from "../../platform/macos/index.js";

export function registerDoctorTool(server: McpServer, env: NodeJS.ProcessEnv): void {
  server.registerTool(
    "doctor",
    {
      title: "Inspect Local Runtime",
      description:
        "Inspect the local macOS runtime and report whether Chrome Spill is ready to run.",
    },
    async () => {
      const runtime = getRuntimePlatform({ env });
      const report = await getMacOSDoctorSnapshot({
        runtime,
        paths: resolveAppPaths(env),
      });

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `Platform: ${report.platform.name} ${report.platform.release} (${report.platform.arch})`,
              report.chrome.installed
                ? `Chrome: installed at ${report.chrome.path}`
                : "Chrome: not found in the standard application directories",
              report.chrome.automation.permitted
                ? "Automation: granted"
                : `Automation: ${report.chrome.automation.status} — ${report.chrome.automation.detail}`,
            ].join("\n"),
          },
        ],
        structuredContent: report as unknown as Record<string, unknown>,
      };
    },
  );
}
